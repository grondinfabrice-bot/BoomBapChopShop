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

  // This is the approved visual master. It already contains the exact masthead,
  // crate, 16-pad MPC and bottom waveform treatment; only order-specific areas
  // are replaced below.
  const templateResponse = await fetch(`${siteUrl.replace(/\/$/, "")}/images/collector-card-reference-base.png`);
  if (!templateResponse.ok) throw new Error("Approved collector card reference is not available on the site yet.");
  const template = await pdf.embedPng(new Uint8Array(await templateResponse.arrayBuffer()));
  page.drawImage(template, { x: 0, y: 0, width, height });

  // Preserve the reference card's large left-hand cover treatment. Covers are
  // normally square, while this frame is only slightly rectangular.
  const coverX = 20; const coverY = 65; const coverWidth = 345; const coverHeight = 330;
  let cover;
  try {
    const signature = String.fromCharCode(...coverBytes.slice(0, 8));
    cover = signature.startsWith("\x89PNG") ? await pdf.embedPng(coverBytes) : await pdf.embedJpg(coverBytes);
  } catch {
    throw new Error(`Unsupported cover image for ${item.name || "beat"}. Use JPG or PNG.`);
  }
  page.drawRectangle({ x: 18, y: 63, width: 349, height: 334, color: rgb(0.05, 0.05, 0.045) });
  page.drawImage(cover, { x: coverX, y: coverY, width: coverWidth, height: coverHeight });

  // Mask the fictional order data baked into the approved reference, retaining
  // its outer frame, masthead and footer artwork exactly as approved.
  page.drawRectangle({ x: 370, y: 64, width: 371, height: 332, color: cream });
  const title = (item.name || "UNTITLED BEAT").toUpperCase();
  const titleSize = fitTextSize(title, bold, 34, 335, 18);
  page.drawText(trimToFit(title, bold, titleSize, 335), { x: 389, y: 337, size: titleSize, font: bold, color: brick });
  page.drawLine({ start: { x: 384, y: 316 }, end: { x: 728, y: 316 }, thickness: 1.2, color: brick });
  page.drawCircle({ x: 384, y: 316, size: 3.2, color: brick });
  page.drawCircle({ x: 728, y: 316, size: 3.2, color: brick });
  page.drawRectangle({ x: 438, y: 277, width: 205, height: 25, color: rgb(0.055, 0.055, 0.05) });
  page.drawText("BEAT LICENSE CARD", { x: 450, y: 285, size: 13, font: bold, color: cream });

  page.drawCircle({ x: 403, y: 240, size: 19, color: brick });
  page.drawText("ID", { x: 395, y: 236, size: 9, font: bold, color: cream });
  page.drawText("LICENSED TO", { x: 431, y: 249, size: 10, font: bold, color: brick });
  const buyer = customerName.toUpperCase();
  const buyerSize = fitTextSize(buyer, bold, 18, 285, 10);
  page.drawText(trimToFit(buyer, bold, buyerSize, 285), { x: 431, y: 221, size: buyerSize, font: bold, color: rgb(0.055, 0.055, 0.05) });
  page.drawLine({ start: { x: 384, y: 204 }, end: { x: 728, y: 204 }, thickness: 0.9, color: rgb(0.055, 0.055, 0.05) });

  page.drawCircle({ x: 403, y: 164, size: 19, color: brick });
  page.drawText("M", { x: 398, y: 158, size: 11, font: bold, color: cream });
  page.drawText((item.license || "LICENSE").toUpperCase(), { x: 431, y: 173, size: 10, font: bold, color: brick });
  const specs = `${item.bpm || "--"} BPM  •  ${item.key || "KEY --"}  •  ${item.duration || "--:--"}`;
  page.drawText(trimToFit(specs, bold, 14, 285), { x: 431, y: 149, size: fitTextSize(specs, bold, 14, 285, 9), font: bold, color: rgb(0.055, 0.055, 0.05) });
  page.drawLine({ start: { x: 384, y: 126 }, end: { x: 728, y: 126 }, thickness: 0.9, color: rgb(0.055, 0.055, 0.05) });

  page.drawCircle({ x: 403, y: 92, size: 19, color: olive });
  page.drawText("C", { x: 399, y: 87, size: 10, font: bold, color: cream });
  page.drawText("OFFICIALLY LICENSED", { x: 431, y: 99, size: 12, font: bold, color: brick });
  page.drawText("This beat is officially part of your record collection.", { x: 431, y: 80, size: 8.2, font: regular, color: rgb(0.055, 0.055, 0.05) });
  for (let x = 385; x < 730; x += 7) page.drawCircle({ x, y: 70, size: 0.8, color: brick });

  // Reprint the two variable footer fields over the reference's example data.
  page.drawRectangle({ x: 78, y: 38, width: 142, height: 21, color: rgb(0.045, 0.045, 0.04) });
  page.drawRectangle({ x: 224, y: 38, width: 160, height: 21, color: rgb(0.045, 0.045, 0.04) });
  page.drawText(`CRATE CARD  •  ${cardNumber}`, { x: 84, y: 48, size: 7.4, font: bold, color: cream });
  const orderText = `ORDER #${orderNumber}`;
  page.drawText(trimToFit(orderText, bold, 7.2, 150), { x: 231, y: 48, size: fitTextSize(orderText, bold, 7.2, 150, 5.5), font: bold, color: cream });
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
