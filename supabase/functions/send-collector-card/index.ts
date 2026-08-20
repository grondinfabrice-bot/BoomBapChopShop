import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CardItem = {
  beatId?: number | string;
  name?: string;
  license?: string;
  coverUrl?: string;
  bpm?: number;
  key?: string;
  duration?: string;
  type?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
  const siteUrl = Deno.env.get("SITE_URL") || "https://boombapchopshop.art";
  const from = Deno.env.get("ORDER_FROM_EMAIL") || "BOOM BAP CHOP SHOP <orders@example.com>";
  const replyTo = Deno.env.get("ORDER_REPLY_TO") || "";

  try {
    const payload = await request.json();
    const orderNumber = String(payload?.orderNumber || "").trim();
    if (!orderNumber) return json({ error: "Order number required" }, 400);
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase service credentials are not configured." }, 500);
    if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured." }, 500);

    const order = await getOrder({ supabaseUrl, serviceRoleKey, orderNumber });
    if (!order) return json({ error: `Order not found: ${orderNumber}` }, 404);
    if (order.collector_card_sent_at) return json({ sent: true, alreadySent: true, orderNumber });

    const items = (Array.isArray(order.items) ? order.items : []).filter((item: CardItem) => item.type !== "service");
    const cards = [];
    for (const [index, item] of items.entries()) {
      const coverUrl = await resolveCoverUrl({ supabaseUrl, serviceRoleKey, item });
      if (!coverUrl) continue;
      const coverResponse = await fetch(coverUrl);
      if (!coverResponse.ok) continue;
      const coverBytes = new Uint8Array(await coverResponse.arrayBuffer());
      const pdfBytes = await buildCollectorCard({
        orderNumber,
        cardNumber: `${String(index + 1).padStart(2, "0")}`,
        customerName: [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") || order.customer_email,
        item,
        coverBytes,
      });
      const path = `${orderNumber}/${slugify(item.name || "beat")}.pdf`;
      await uploadCollectorCard({ supabaseUrl, serviceRoleKey, path, pdfBytes });
      cards.push({
        filename: `boombap-collector-card-${slugify(item.name || "beat")}.pdf`,
        content: bytesToBase64(pdfBytes),
        path,
      });
    }

    if (!cards.length) {
      await updateCardStatus({ supabaseUrl, serviceRoleKey, orderNumber, status: "unavailable_no_cover", error: "No beat cover is available for this order." });
      return json({ sent: false, orderNumber, mode: "unavailable_no_cover" }, 200);
    }

    const customerName = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") || "there";
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [order.customer_email],
        subject: "Your BOOM BAP CHOP SHOP collector card",
        html: buildEmailHtml({ customerName, orderNumber, siteUrl }),
        text: `Your BOOM BAP CHOP SHOP collector card for order ${orderNumber} is attached. Officially licensed.`,
        attachments: cards,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) throw new Error(`Collector card email failed: ${JSON.stringify(resendData)}`);

    await updateCardStatus({
      supabaseUrl,
      serviceRoleKey,
      orderNumber,
      status: "sent",
      path: cards.map((card) => card.path).join(","),
    });
    return json({ sent: true, orderNumber, providerId: resendData.id || "", cards: cards.length }, 200);
  } catch (error) {
    const message = String(error?.message || error);
    try {
      const payload = await request.clone().json();
      if (payload?.orderNumber) await updateCardStatus({ supabaseUrl, serviceRoleKey, orderNumber: String(payload.orderNumber), status: "failed", error: message });
    } catch {
      // Preserve the original error response even if status tracking is unavailable.
    }
    return json({ sent: false, error: message }, 500);
  }
});

async function getOrder({ supabaseUrl, serviceRoleKey, orderNumber }: { supabaseUrl: string; serviceRoleKey: string; orderNumber: string }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=order_number,customer_email,customer_first_name,customer_last_name,items,collector_card_sent_at` , {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) throw new Error(`Order fetch failed: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function resolveCoverUrl({ supabaseUrl, serviceRoleKey, item }: { supabaseUrl: string; serviceRoleKey: string; item: CardItem }) {
  if (item.coverUrl) return absoluteUrl(item.coverUrl, supabaseUrl);
  if (!item.beatId) return "";
  const response = await fetch(`${supabaseUrl}/rest/v1/beats?id=eq.${encodeURIComponent(String(item.beatId))}&select=cover_url`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) return "";
  const rows = await response.json();
  return rows?.[0]?.cover_url ? absoluteUrl(rows[0].cover_url, supabaseUrl) : "";
}

async function buildCollectorCard({ orderNumber, cardNumber, customerName, item, coverBytes }: { orderNumber: string; cardNumber: string; customerName: string; item: CardItem; coverBytes: Uint8Array }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.06, 0.055);
  const cream = rgb(0.95, 0.91, 0.83);
  const parchment = rgb(0.89, 0.84, 0.74);
  const brick = rgb(0.72, 0.12, 0.07);
  const gold = rgb(0.83, 0.57, 0.09);
  const olive = rgb(0.29, 0.31, 0.15);
  const margin = 12;

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: ink });
  page.drawRectangle({ x: margin, y: margin, width: 818, height: 571, borderColor: brick, borderWidth: 1.2 });
  page.drawText("BOOM BAP CHOP SHOP", { x: 28, y: 538, size: 34, font: bold, color: cream });
  page.drawText("OFFICIAL BEAT COLLECTOR SERIES", { x: 224, y: 508, size: 12, font: bold, color: gold });
  page.drawText("MPC", { x: 785, y: 535, size: 11, font: bold, color: cream });
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
    page.drawRectangle({ x: 782 + col * 10, y: 493 - row * 10, width: 7, height: 7, color: row === 2 && col === 3 ? brick : parchment });
  }

  const coverX = 26; const coverY = 112; const coverSize = 356;
  let cover;
  try {
    const signature = String.fromCharCode(...coverBytes.slice(0, 8));
    cover = signature.startsWith("\x89PNG") ? await pdf.embedPng(coverBytes) : await pdf.embedJpg(coverBytes);
  } catch {
    throw new Error(`Unsupported cover image for ${item.name || "beat"}. Use JPG or PNG.`);
  }
  page.drawRectangle({ x: coverX - 4, y: coverY - 4, width: coverSize + 8, height: coverSize + 8, color: parchment });
  page.drawImage(cover, { x: coverX, y: coverY, width: coverSize, height: coverSize });

  page.drawRectangle({ x: 398, y: 112, width: 418, height: 356, color: cream });
  page.drawText((item.name || "UNTITLED BEAT").toUpperCase().slice(0, 28), { x: 420, y: 425, size: 26, font: bold, color: brick });
  page.drawRectangle({ x: 448, y: 370, width: 210, height: 27, color: ink });
  page.drawText("BEAT LICENSE CARD", { x: 460, y: 382, size: 16, font: bold, color: cream });
  page.drawText("LICENSED TO", { x: 455, y: 327, size: 11, font: bold, color: brick });
  page.drawText(customerName.toUpperCase().slice(0, 30), { x: 455, y: 302, size: 18, font: bold, color: ink });
  page.drawText((item.license || "LICENSE").toUpperCase(), { x: 455, y: 258, size: 12, font: bold, color: brick });
  page.drawText(`${item.bpm || "--"} BPM  /  ${item.key || "KEY --"}  /  ${item.duration || "--:--"}`, { x: 455, y: 236, size: 13, font: bold, color: ink });
  page.drawCircle({ x: 438, y: 178, size: 20, color: olive });
  page.drawText("OFFICIALLY LICENSED", { x: 470, y: 185, size: 13, font: bold, color: brick });
  page.drawText("This beat is officially part of your record collection.", { x: 470, y: 163, size: 10.5, font: regular, color: ink });

  page.drawText(`CRATE CARD  /  ${cardNumber}`, { x: 30, y: 58, size: 12, font: bold, color: cream });
  page.drawText(`ORDER  /  ${orderNumber}`, { x: 220, y: 58, size: 12, font: bold, color: cream });
  page.drawText("CUT BY BOOM BAP CHOP SHOP", { x: 520, y: 58, size: 12, font: bold, color: cream });
  const waveStart = 520; const waveEnd = 790; const cutStart = 579; const cutEnd = 730;
  for (let x = waveStart; x <= waveEnd; x += 4) {
    const height = 3 + ((x * 17) % 19);
    page.drawRectangle({ x, y: 29 - height / 2, width: 2, height, color: x >= cutStart && x <= cutEnd ? brick : rgb(0.38, 0.12, 0.1) });
  }
  page.drawLine({ start: { x: cutStart, y: 15 }, end: { x: cutStart, y: 46 }, thickness: 1.4, color: cream });
  page.drawLine({ start: { x: cutEnd, y: 15 }, end: { x: cutEnd, y: 46 }, thickness: 1.4, color: cream });
  page.drawText("2026", { x: 764, y: 30, size: 15, font: bold, color: gold });
  return await pdf.save();
}

async function updateCardStatus({ supabaseUrl, serviceRoleKey, orderNumber, status, path = null, error = null }: { supabaseUrl: string; serviceRoleKey: string; orderNumber: string; status: string; path?: string | null; error?: string | null }) {
  const body: Record<string, unknown> = { collector_card_status: status, collector_card_error: error };
  if (path) body.collector_card_path = path;
  if (status === "sent") body.collector_card_sent_at = new Date().toISOString();
  await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function uploadCollectorCard({ supabaseUrl, serviceRoleKey, path, pdfBytes }: { supabaseUrl: string; serviceRoleKey: string; path: string; pdfBytes: Uint8Array }) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/collector-cards/${path}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: pdfBytes,
  });
  if (!response.ok) throw new Error(`Collector card upload failed: ${await response.text()}`);
}

function buildEmailHtml({ customerName, orderNumber, siteUrl }: { customerName: string; orderNumber: string; siteUrl: string }) {
  return `<div style="background:#f3eee6;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#1e1e1e;"><div style="max-width:650px;margin:auto;background:#191918;color:#f3eee6;padding:30px;border-top:4px solid #8e3b2e;"><p style="color:#b08d57;font-weight:800;letter-spacing:.12em;">BOOM BAP CHOP SHOP</p><h1 style="font-size:34px;line-height:1;">Officially part of your collection.</h1><p style="line-height:1.7;color:#c7bfae;">Hey ${escapeHtml(customerName)}, your collector card for order ${escapeHtml(orderNumber)} is attached. Keep it with your release records, share it with your crew, or just enjoy the little piece of crate-digging culture.</p><p style="color:#d63827;font-weight:800;">Officially licensed. Cut with care.</p><p style="font-size:12px;color:#9e998e;">${escapeHtml(siteUrl)}</p></div></div>`;
}

function absoluteUrl(value: string, supabaseUrl: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${supabaseUrl.replace(/\/$/, "")}/${value.replace(/^\.?\//, "")}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function slugify(value: string) {
  return String(value || "beat").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "beat";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
