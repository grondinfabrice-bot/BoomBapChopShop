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
    const force = Boolean(payload?.force);
    if (!orderNumber) return json({ error: "Order number required" }, 400);
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase service credentials are not configured." }, 500);
    if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured." }, 500);

    const order = await getOrder({ supabaseUrl, serviceRoleKey, orderNumber });
    if (!order) return json({ error: `Order not found: ${orderNumber}` }, 404);
    if (order.collector_card_sent_at && !force) return json({ sent: true, alreadySent: true, orderNumber });

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
        siteUrl,
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
        attachments: cards.map(({ filename, content }) => ({ filename, content })),
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

async function buildCollectorCard({ orderNumber, cardNumber, customerName, item, coverBytes, siteUrl }: { orderNumber: string; cardNumber: string; customerName: string; item: CardItem; coverBytes: Uint8Array; siteUrl: string }) {
  const pdf = await PDFDocument.create();
  const width = 768;
  const height = 512;
  const page = pdf.addPage([width, height]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cream = rgb(0.95, 0.91, 0.83);
  const brick = rgb(0.72, 0.12, 0.07);
  const gold = rgb(0.83, 0.57, 0.09);
  const olive = rgb(0.29, 0.31, 0.15);

  const templateResponse = await fetch(`${siteUrl.replace(/\/$/, "")}/images/collector-card-template.png`);
  if (!templateResponse.ok) throw new Error("Collector card template is not available on the site yet.");
  const template = await pdf.embedPng(new Uint8Array(await templateResponse.arrayBuffer()));
  page.drawImage(template, { x: 0, y: 0, width, height });

  // The background is intentionally decorative, but the MPC pad count is product data:
  // redraw it here so every card has an exact 4 by 4 (16-pad) grid.
  const samplerX = 658;
  const samplerY = 410;
  page.drawRectangle({ x: samplerX, y: samplerY, width: 82, height: 86, color: rgb(0.06, 0.06, 0.055) });
  page.drawRectangle({ x: samplerX + 3, y: samplerY + 3, width: 76, height: 80, borderColor: brick, borderWidth: 1.4 });
  page.drawRectangle({ x: samplerX + 11, y: samplerY + 65, width: 22, height: 7, borderColor: cream, borderWidth: 0.8 });
  page.drawCircle({ x: samplerX + 51, y: samplerY + 68, size: 4, borderColor: cream, borderWidth: 0.8 });
  page.drawCircle({ x: samplerX + 65, y: samplerY + 68, size: 4, borderColor: cream, borderWidth: 0.8 });
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
    page.drawRectangle({
      x: samplerX + 11 + col * 15,
      y: samplerY + 14 + (3 - row) * 12,
      width: 10,
      height: 9,
      color: row === 2 && col === 3 ? brick : cream,
    });
  }

  const coverX = 39; const coverY = 81; const coverSize = 310;
  let cover;
  try {
    const signature = String.fromCharCode(...coverBytes.slice(0, 8));
    cover = signature.startsWith("\x89PNG") ? await pdf.embedPng(coverBytes) : await pdf.embedJpg(coverBytes);
  } catch {
    throw new Error(`Unsupported cover image for ${item.name || "beat"}. Use JPG or PNG.`);
  }
  page.drawImage(cover, { x: coverX, y: coverY, width: coverSize, height: coverSize });

  page.drawText("BOOM BAP CHOP SHOP", { x: 116, y: 462, size: 22, font: bold, color: cream });
  page.drawText("OFFICIAL BEAT COLLECTOR SERIES", { x: 200, y: 444, size: 8, font: bold, color: gold });
  const title = (item.name || "UNTITLED BEAT").toUpperCase();
  page.drawText(trimToFit(title, bold, 20, 340), { x: 390, y: 365, size: fitTextSize(title, bold, 20, 340, 14), font: bold, color: brick });
  page.drawRectangle({ x: 414, y: 275, width: 155, height: 22, color: rgb(0.06, 0.06, 0.055) });
  page.drawText("BEAT LICENSE CARD", { x: 425, y: 283, size: 12, font: bold, color: cream });
  page.drawText("LICENSED TO", { x: 405, y: 235, size: 8, font: bold, color: brick });
  const buyer = customerName.toUpperCase();
  page.drawText(trimToFit(buyer, bold, 14, 320), { x: 405, y: 216, size: fitTextSize(buyer, bold, 14, 320, 10), font: bold, color: rgb(0.06, 0.06, 0.055) });
  page.drawText((item.license || "LICENSE").toUpperCase(), { x: 405, y: 186, size: 8, font: bold, color: brick });
  page.drawText(`${item.bpm || "--"} BPM  /  ${item.key || "KEY --"}  /  ${item.duration || "--:--"}`, { x: 405, y: 169, size: 10, font: bold, color: rgb(0.06, 0.06, 0.055) });
  page.drawCircle({ x: 394, y: 113, size: 14, color: olive });
  page.drawText("+", { x: 390, y: 108, size: 10, font: bold, color: cream });
  page.drawText("OFFICIALLY LICENSED", { x: 420, y: 119, size: 11, font: bold, color: brick });
  page.drawText("This beat is officially part of your record collection.", { x: 420, y: 102, size: 8, font: regular, color: rgb(0.06, 0.06, 0.055) });
  page.drawText(`CRATE CARD  /  ${cardNumber}`, { x: 94, y: 61, size: 7, font: bold, color: cream });
  page.drawText(`ORDER  /  ${orderNumber}`, { x: 245, y: 61, size: 6.4, font: bold, color: cream });
  page.drawText("CUT BY BOOM BAP CHOP SHOP", { x: 425, y: 61, size: 7, font: bold, color: cream });
  page.drawText("2026", { x: 691, y: 61, size: 12, font: bold, color: gold });
  return await pdf.save();
}

function fitTextSize(text: string, font: any, preferred: number, maxWidth: number, minimum: number) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function trimToFit(text: string, font: any, preferred: number, maxWidth: number) {
  const ellipsis = "...";
  if (font.widthOfTextAtSize(text, preferred) <= maxWidth) return text;
  let value = text;
  while (value.length && font.widthOfTextAtSize(`${value}${ellipsis}`, preferred) > maxWidth) value = value.slice(0, -1);
  return `${value}${ellipsis}`;
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
