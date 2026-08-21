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
  const collectorRendererUrl = Deno.env.get("COLLECTOR_CARD_RENDERER_URL") || "";
  const collectorRendererSecret = Deno.env.get("COLLECTOR_CARD_RENDERER_SECRET") || "";
  const from = Deno.env.get("ORDER_FROM_EMAIL") || "BOOM BAP CHOP SHOP <orders@example.com>";
  const replyTo = Deno.env.get("ORDER_REPLY_TO") || "";

  try {
    const payload = await request.json();
    const orderNumber = String(payload?.orderNumber || "").trim();
    const force = Boolean(payload?.force);
    if (!orderNumber) return json({ error: "Order number required" }, 400);
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase service credentials are not configured." }, 500);
    if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured." }, 500);
    if (!collectorRendererUrl || !collectorRendererSecret) return json({ error: "Collector card renderer is not configured." }, 500);

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
      const cardBytes = await renderCollectorCard({
        orderNumber,
        cardNumber: `${String(index + 1).padStart(2, "0")}`,
        customerName: [order.customer_first_name, order.customer_last_name].filter(Boolean).join(" ") || order.customer_email,
        item,
        coverBytes,
        collectorRendererUrl,
        collectorRendererSecret,
      });
      const path = `${orderNumber}/${slugify(item.name || "beat")}.png`;
      await uploadCollectorCard({ supabaseUrl, serviceRoleKey, path, cardBytes, contentType: "image/png" });
      cards.push({
        filename: `boombap-collector-card-${slugify(item.name || "beat")}.png`,
        content: bytesToBase64(cardBytes),
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

async function renderCollectorCard({ orderNumber, cardNumber, customerName, item, coverBytes, collectorRendererUrl, collectorRendererSecret }: {
  orderNumber: string;
  cardNumber: string;
  customerName: string;
  item: CardItem;
  coverBytes: Uint8Array;
  collectorRendererUrl: string;
  collectorRendererSecret: string;
}) {
  const response = await fetch(collectorRendererUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Collector-Card-Secret": collectorRendererSecret,
    },
    body: JSON.stringify({
      orderNumber,
      cardNumber,
      customerName,
      item: {
        name: item.name || "UNTITLED BEAT",
        license: item.license || "LICENSE",
        bpm: item.bpm || "--",
        key: item.key || "KEY --",
        duration: item.duration || "--:--",
      },
      cover: {
        contentType: detectCoverContentType(coverBytes),
        base64: bytesToBase64(coverBytes),
      },
    }),
  });
  if (!response.ok) throw new Error(`Collector card renderer failed: ${await response.text()}`);
  return new Uint8Array(await response.arrayBuffer());
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

async function uploadCollectorCard({ supabaseUrl, serviceRoleKey, path, cardBytes, contentType }: { supabaseUrl: string; serviceRoleKey: string; path: string; cardBytes: Uint8Array; contentType: string }) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/collector-cards/${path}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: cardBytes,
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

function detectCoverContentType(bytes: Uint8Array) {
  const signature = String.fromCharCode(...bytes.slice(0, 12));
  if (signature.startsWith("\x89PNG")) return "image/png";
  if (signature.startsWith("\xff\xd8\xff")) return "image/jpeg";
  if (signature.startsWith("RIFF") && signature.slice(8, 12) === "WEBP") return "image/webp";
  throw new Error("Unsupported cover image. Use PNG, JPG or WebP.");
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
