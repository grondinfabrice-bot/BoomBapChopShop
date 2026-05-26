import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderItem = {
  name?: string;
  license?: string;
  price?: number;
  includes?: string[];
  contractUrl?: string;
  personalizedContractUrl?: string;
  personalizedContractPath?: string;
  deliveryFiles?: DeliveryFile[];
  deliveryLinks?: DeliveryLink[];
  serviceFor?: string;
  type?: string;
};

type DeliveryFile = {
  label?: string;
  url?: string;
  note?: string;
};

type DeliveryLink = {
  label: string;
  url: string;
  note?: string;
};

type OrderRow = {
  order_number: string;
  customer_email: string;
  customer_first_name?: string;
  customer_last_name?: string;
  items?: OrderItem[];
  total?: number;
  currency?: string;
  email_sent_at?: string | null;
};

type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string;
  customer_email?: string;
  metadata?: {
    order_number?: string;
    customer_email?: string;
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.text();
    const stripeSignature = request.headers.get("stripe-signature") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    if (!webhookSecret) return json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, 500);
    if (!await verifyStripeSignature(rawBody, stripeSignature, webhookSecret)) {
      return json({ error: "Invalid Stripe signature." }, 401);
    }

    const event = JSON.parse(rawBody);
    if (event.type !== "checkout.session.completed") {
      return json({ received: true, ignored: event.type || "unknown" }, 200);
    }

    const session = event.data?.object as StripeCheckoutSession;
    const orderId = String(session.client_reference_id || session.metadata?.order_number || "").trim();
    if (!orderId) return json({ error: "Stripe session has no order reference." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const order = await getOrderByNumber({ supabaseUrl, serviceRoleKey, orderNumber: orderId });
    if (!order) return json({ error: `Order not found: ${orderId}` }, 404);
    if (order.email_sent_at) return json({ sent: true, orderId, alreadySent: true }, 200);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("ORDER_FROM_EMAIL") || "BOOM BAP CHOP SHOP <orders@example.com>";
    const replyTo = Deno.env.get("ORDER_REPLY_TO") || "";
    const siteUrl = Deno.env.get("SITE_URL") || "";
    const email = String(order.customer_email || session.customer_email || session.metadata?.customer_email || "").trim().toLowerCase();
    const items = Array.isArray(order.items) ? order.items : [];
    const total = Number(order.total || 0);
    const currency = order.currency || "EUR";
    const firstName = String(order.customer_first_name || "").trim();
    const lastName = String(order.customer_last_name || "").trim();
    const customerName = [firstName, lastName].filter(Boolean).join(" ") || email;

    if (!email.includes("@")) return json({ error: "Valid customer email required" }, 400);
    if (!items.length) return json({ error: "Order items required" }, 400);

    const deliveryItems = await attachPersonalizedContracts({
      supabaseUrl,
      serviceRoleKey,
      orderNumber: orderId,
      customerName,
      email,
      items,
      currency,
      siteUrl,
    });
    const contractUrls = unique(
      deliveryItems
        .map((item) => item.personalizedContractUrl || item.contractUrl || "")
        .filter(Boolean),
    );

    await markOrderPaid({
      supabaseUrl,
      serviceRoleKey,
      orderNumber: orderId,
      items: deliveryItems,
      contractUrls,
      paymentReference: session.id || "",
    });

    if (!resendApiKey) {
      return json({ sent: false, orderId, mode: "missing_resend_key", message: "RESEND_API_KEY is not configured." }, 200);
    }

    const subject = `Your BOOM BAP CHOP SHOP order ${orderId}`;
    const html = buildEmailHtml({ orderId, email, items: deliveryItems, total, currency, siteUrl });
    const text = buildEmailText({ orderId, items: deliveryItems, total, currency, siteUrl });

    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return json({ sent: false, error: resendData }, 502);
    }

    await markOrderEmailSent({ supabaseUrl, serviceRoleKey, orderNumber: orderId });

    return json({ sent: true, orderId, providerId: resendData.id || "" }, 200);
  } catch (error) {
    return json({ sent: false, error: String(error?.message || error) }, 500);
  }
});

async function getOrderByNumber({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
}) {
  if (!supabaseUrl || !serviceRoleKey) return null;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=order_number,customer_email,customer_first_name,customer_last_name,items,total,currency,email_sent_at`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Order fetch failed: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] as OrderRow : null;
}

async function markOrderPaid({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
  items,
  contractUrls,
  paymentReference,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
  items: OrderItem[];
  contractUrls: string[];
  paymentReference: string;
}) {
  if (!supabaseUrl || !serviceRoleKey) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "paid",
      items,
      contract_urls: contractUrls,
      payment_provider: "stripe",
      payment_reference: paymentReference,
    }),
  });
  if (!response.ok) throw new Error(`Order paid update failed: ${await response.text()}`);
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  return timingSafeEqual(toHex(new Uint8Array(digest)), signature);
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function buildEmailHtml({ orderId, email, items, total, currency, siteUrl }: {
  orderId: string;
  email: string;
  items: OrderItem[];
  total: number;
  currency: string;
  siteUrl: string;
}) {
  const logoUrl = absoluteUrl("./src/assets/boom-bap-chop-shop-logo.png", siteUrl);
  const hasService = hasStudioService(items);
  const rows = items.map((item) => {
    const contractUrl = item.personalizedContractUrl || item.contractUrl || "";
    const contractLabel = item.personalizedContractUrl ? "Download personalized contract" : "Read license contract";
    const contractLink = contractUrl
      ? `<a href="${escapeHtml(absoluteUrl(contractUrl, siteUrl))}" style="display:inline-block;margin-top:10px;padding:11px 13px;background:#8e3b2e;color:#f3eee6;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border:1px solid #8e3b2e;">${contractLabel}</a>`
      : "Contract will be confirmed by email.";
    const serviceFor = item.serviceFor ? `<br><small style="color:#6b6256;">For: ${escapeHtml(item.serviceFor)}</small>` : "";
    return `
      <tr>
        <td style="padding:18px;border-bottom:1px solid rgba(176,141,87,.32);">
          <strong style="font-size:16px;text-transform:uppercase;color:#1e1e1e;">${escapeHtml(item.name || "Order item")}</strong>${serviceFor}<br>
          <span style="color:#9b9180;">${escapeHtml(item.license || item.type || "License")}</span><br>
          ${contractLink}
          ${buildDeliveryLinksHtml(item.deliveryLinks || [], siteUrl)}
        </td>
        <td style="padding:18px;border-bottom:1px solid rgba(176,141,87,.32);text-align:right;white-space:nowrap;font-weight:800;color:#1e1e1e;">${formatMoney(item.price || 0, currency)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="margin:0;padding:0;background:#f3eee6;font-family:Arial,Helvetica,sans-serif;color:#1e1e1e;">
      <div style="max-width:720px;margin:0 auto;padding:30px 16px;">
        <div style="border:1px solid rgba(176,141,87,.32);background:#e5dccb;">
          <div style="padding:24px;background:#191918;color:#f3eee6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:middle;width:72px;">
                  <img src="${escapeHtml(logoUrl)}" width="58" height="58" alt="BOOM BAP CHOP SHOP" style="display:block;width:58px;height:58px;object-fit:contain;border:0;">
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;color:#b08d57;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">BOOM BAP CHOP SHOP</p>
                  <p style="margin:4px 0 0;color:#c7bfae;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Heavy drums. Clear paperwork.</p>
                </td>
              </tr>
            </table>
            <h1 style="margin:22px 0 0;font-size:38px;line-height:.95;text-transform:uppercase;color:#f3eee6;">Respect for the support.</h1>
            <p style="margin:14px 0 0;line-height:1.65;color:#c7bfae;">Your order is confirmed. The beat, secure links and personalized license contract are packed below.</p>
          </div>
          <div style="padding:22px 24px;">
            <p style="margin:0 0 18px;line-height:1.7;"><strong>Order:</strong> ${escapeHtml(orderId)}<br><strong>Delivery email:</strong> ${escapeHtml(email)}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(176,141,87,.32);background:#f3eee6;">
            ${rows}
            <tr>
              <td style="padding:16px;text-align:right;"><strong>Total</strong></td>
              <td style="padding:16px;text-align:right;white-space:nowrap;"><strong>${formatMoney(total, currency)}</strong></td>
            </tr>
            </table>
            ${hasService ? buildStudioServiceProcessHtml() : ""}
            <p style="margin:18px 0 0;line-height:1.7;color:#1e1e1e;">Keep this email and contract with your release records. Download links may expire for security reasons, but your order remains logged.</p>
            <p style="margin:16px 0 0;line-height:1.7;color:#8e3b2e;font-weight:800;">Make the record. Let the drums talk.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildStudioServiceProcessHtml() {
  return `
    <div style="margin:18px 0 0;padding:16px;border:1px solid rgba(142,59,46,.32);border-left:3px solid #8e3b2e;background:rgba(142,59,46,.07);">
      <p style="margin:0 0 8px;color:#8e3b2e;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Mix/Master next steps</p>
      <p style="margin:0 0 10px;line-height:1.7;color:#1e1e1e;">Reply to this email with your project files so the session can be prepared.</p>
      <ul style="margin:0 0 12px;padding-left:18px;line-height:1.7;color:#1e1e1e;">
        <li>Lead vocal WAV, dry if possible</li>
        <li>Adlibs, doubles and backing vocals separated</li>
        <li>Beat WAV or trackouts if available</li>
        <li>Rough mix/demo bounce</li>
        <li>1 or 2 reference tracks</li>
        <li>Artist name, song title, creative notes and any deadline</li>
      </ul>
      <p style="margin:0;line-height:1.7;color:#1e1e1e;"><strong>File sync:</strong> all exported WAV files must start at bar 1 / 00:00, even if there is silence before the vocal starts. Do not trim each vocal to its first word, or the timing may shift when the session is rebuilt.</p>
      <p style="margin:10px 0 0;line-height:1.7;color:#1e1e1e;">If the files are too heavy, send a private WeTransfer, Google Drive, Dropbox or SwissTransfer link.</p>
    </div>
  `;
}

async function createOrder({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
  email,
  firstName,
  lastName,
  items,
  contractUrls,
  total,
  currency,
  status,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  items: OrderItem[];
  contractUrls: string[];
  total: number;
  currency: string;
  status: string;
}) {
  if (!supabaseUrl || !serviceRoleKey) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      order_number: orderNumber,
      customer_email: email,
      customer_first_name: firstName,
      customer_last_name: lastName,
      items,
      contract_urls: contractUrls,
      total,
      currency,
      status,
      license_acceptance: {
        accepted: true,
        accepted_at: new Date().toISOString(),
        method: "checkout_checkbox",
      },
    }),
  });
  if (!response.ok) throw new Error(`Order insert failed: ${await response.text()}`);
}

async function markOrderEmailSent({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
}) {
  if (!supabaseUrl || !serviceRoleKey) return;
  await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "email_sent",
      email_sent_at: new Date().toISOString(),
    }),
  });
}

function buildEmailText({ orderId, items, total, currency, siteUrl }: {
  orderId: string;
  items: OrderItem[];
  total: number;
  currency: string;
  siteUrl: string;
}) {
  const serviceProcess = hasStudioService(items)
    ? "\n\nMIX/MASTER NEXT STEPS\nReply to this email with your vocal WAV stems, beat WAV or trackouts if available, rough mix, 1 or 2 reference tracks, artist name, song title, notes and any deadline.\n\nFILE SYNC: all exported WAV files must start at bar 1 / 00:00, even if there is silence before the vocal starts. Do not trim each vocal to its first word, or the timing may shift when the session is rebuilt.\n\nIf files are too heavy, send a private WeTransfer, Google Drive, Dropbox or SwissTransfer link."
    : "";
  const lines = items.map((item) => {
    const contractUrl = item.personalizedContractUrl || item.contractUrl || "";
    const contract = contractUrl ? `\nContract: ${absoluteUrl(contractUrl, siteUrl)}` : "";
    const delivery = (item.deliveryLinks || [])
      .map((link) => `\n${link.label}: ${absoluteUrl(link.url, siteUrl)}`)
      .join("");
    const serviceFor = item.serviceFor ? `\nFor: ${item.serviceFor}` : "";
    return `- ${item.name || "Order item"} / ${item.license || item.type || "License"} / ${formatMoney(item.price || 0, currency)}${serviceFor}${contract}${delivery}`;
  }).join("\n\n");

  return `BOOM BAP CHOP SHOP\nRespect for the support.\nOrder confirmed: ${orderId}\n\n${lines}\n\nTotal: ${formatMoney(total, currency)}${serviceProcess}\n\nKeep this email and contract with your release records.\nMake the record. Let the drums talk.`;
}

function hasStudioService(items: OrderItem[]) {
  return items.some((item) => item.type === "service" || /mix|master/i.test(`${item.name || ""} ${item.license || ""}`));
}

async function attachPersonalizedContracts({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
  customerName,
  email,
  items,
  currency,
  siteUrl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
  customerName: string;
  email: string;
  items: OrderItem[];
  currency: string;
  siteUrl: string;
}) {
  if (!supabaseUrl || !serviceRoleKey) return items;

  const deliveryItems: OrderItem[] = [];
  for (const item of items) {
    if (!item.contractUrl || item.type === "service") {
      deliveryItems.push(item);
      continue;
    }

    const pdfBytes = await buildPersonalizedContractPdf({
      orderNumber,
      customerName,
      email,
      item,
      currency,
      siteUrl,
    });
    const path = `${orderNumber}/${slugify(item.name || "license")}-${slugify(item.license || "contract")}.pdf`;
    const uploaded = await uploadContractPdf({ supabaseUrl, serviceRoleKey, path, pdfBytes });
    const signedUrl = uploaded
      ? await createSignedContractUrl({ supabaseUrl, serviceRoleKey, path, expiresIn: 60 * 60 * 24 * 7 })
      : "";

    deliveryItems.push({
      ...item,
      personalizedContractUrl: signedUrl,
      personalizedContractPath: path,
      deliveryLinks: buildDeliveryLinks(item),
    });
  }
  return deliveryItems;
}

function buildDeliveryLinks(item: OrderItem): DeliveryLink[] {
  return (item.deliveryFiles || [])
    .filter((file) => file.url)
    .map((file) => ({
      label: file.label || "Download audio file",
      url: file.url || "",
      note: file.note || "",
    }));
}

function buildDeliveryLinksHtml(links: DeliveryLink[], siteUrl: string) {
  if (!links.length) return "";
  return `
    <div style="margin-top:8px;">
      ${links.map((link) => `
        <a href="${escapeHtml(absoluteUrl(link.url, siteUrl))}" style="display:inline-block;margin:4px 8px 0 0;color:#8E3B2E;font-weight:700;">${escapeHtml(link.label)}</a>
      `).join("")}
    </div>
  `;
}

async function buildPersonalizedContractPdf({
  orderNumber,
  customerName,
  email,
  item,
  currency,
  siteUrl,
}: {
  orderNumber: string;
  customerName: string;
  email: string;
  item: OrderItem;
  currency: string;
  siteUrl: string;
}) {
  const template = getContractTemplate(item);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brick = rgb(0.557, 0.231, 0.18);
  const ink = rgb(0.118, 0.118, 0.118);
  const soft = rgb(0.33, 0.33, 0.33);
  const line = rgb(0.82, 0.78, 0.7);
  const margin = 54;
  const width = 595.28;
  const height = 841.89;
  const bodyWidth = width - margin * 2;
  let page = pdf.addPage([width, height]);
  let pageNumber = 1;
  let y = 780;

  const footer = () => {
    page.drawLine({ start: { x: margin, y: 44 }, end: { x: width - margin, y: 44 }, thickness: 0.6, color: line });
    page.drawText("Generated electronically by BOOM BAP CHOP SHOP", { x: margin, y: 28, size: 7.5, font: regular, color: soft });
    page.drawText(`${orderNumber} - Page ${pageNumber}`, { x: width - margin - 110, y: 28, size: 7.5, font: regular, color: soft });
  };

  const newPage = () => {
    footer();
    page = pdf.addPage([width, height]);
    pageNumber += 1;
    y = 780;
    page.drawText("BOOM BAP CHOP SHOP", { x: margin, y, size: 8.5, font: bold, color: brick });
    page.drawText(orderNumber, { x: width - margin - 90, y, size: 8, font: regular, color: soft });
    y -= 30;
  };

  const ensure = (needed = 70) => {
    if (y < 74 + needed) newPage();
  };

  const drawParagraph = (text: string, size = 9.4, font = regular, color = ink, gap = 8) => {
    const lines = wrapText(text, font, size, bodyWidth);
    ensure(lines.length * (size + 4) + gap);
    for (const wrapped of lines) {
      page.drawText(wrapped, { x: margin, y, size, font, color });
      y -= size + 4;
    }
    y -= gap;
  };

  const drawHeading = (text: string) => {
    ensure(38);
    page.drawText(text, { x: margin, y, size: 12.2, font: bold, color: brick });
    y -= 18;
  };

  const drawLabelValue = (label: string, value: string) => {
    ensure(24);
    page.drawText(label, { x: margin, y, size: 8.8, font: bold, color: brick });
    page.drawText(value || "-", { x: margin + 130, y, size: 9.2, font: regular, color: ink });
    y -= 18;
  };

  page.drawText("BOOM BAP CHOP SHOP", { x: margin, y, size: 10, font: bold, color: brick });
  y -= 34;
  page.drawText(template.title, { x: margin, y, size: 19, font: bold, color: ink });
  y -= 24;
  drawParagraph("Personalized license agreement generated from the checkout order and accepted electronically by the buyer.", 9.5, regular, soft, 16);

  drawHeading("Parties and order");
  drawLabelValue("Licensor / Producer", "BOOM BAP CHOP SHOP");
  drawLabelValue("Contact", "contact@boombapchopshop.art");
  drawLabelValue("Buyer / Licensee", customerName);
  drawLabelValue("Buyer email", email);
  drawLabelValue("Order number", orderNumber);
  drawLabelValue("Order date", new Date().toISOString().slice(0, 10));
  drawLabelValue("Beat title", item.name || "Untitled beat");
  drawLabelValue("License type", item.license || "License");
  drawLabelValue("Price paid", formatMoney(item.price || 0, currency));
  y -= 10;

  drawHeading("Preamble");
  drawParagraph(`The Producer controls the rights necessary to license the instrumental identified above. The Buyer wishes to use this instrumental to create one final musical work incorporating original vocal, lyrical, topline, performance or other artistic contribution by the Buyer.`);
  drawParagraph(`This agreement is a license of use. It is not a sale of the instrumental, not a transfer of ownership, not a full buyout, and not a transfer of the Producer's authorship, publishing, moral rights or rights in the original instrumental master unless a separate written agreement expressly says otherwise.`);

  template.sections.forEach((section, index) => {
    drawHeading(`Article ${index + 1} - ${section.heading}`);
    section.paragraphs.forEach((paragraph) => drawParagraph(paragraph));
  });

  drawHeading("Electronic acceptance and proof");
  drawParagraph(`The Buyer accepted this license by checking the license acceptance box during checkout and submitting order ${orderNumber}. The checkout record, payment record, order email, generated PDF, timestamps and technical logs may be used as evidence of acceptance and delivery.`);
  drawParagraph("This personalized agreement should be read together with the website terms, checkout confirmation and any invoice or receipt issued for the order. In case of conflict, any specifically negotiated written agreement signed by both parties will prevail.");

  drawHeading("Signature / acceptance block");
  drawParagraph("For the Producer: BOOM BAP CHOP SHOP - electronic generation and delivery by the ordering system.");
  drawParagraph(`For the Buyer: ${customerName} - acceptance by checkout checkbox, order submission and receipt of the delivered files and contract.`);

  footer();

  return await pdf.save();
}

async function uploadContractPdf({
  supabaseUrl,
  serviceRoleKey,
  path,
  pdfBytes,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  path: string;
  pdfBytes: Uint8Array;
}) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/contracts/${path}`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: pdfBytes,
  });
  return response.ok;
}

async function createSignedContractUrl({
  supabaseUrl,
  serviceRoleKey,
  path,
  expiresIn,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  path: string;
  expiresIn: number;
}) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/contracts/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) return "";
  const data = await response.json();
  if (!data.signedURL) return "";
  if (data.signedURL.startsWith("http")) return data.signedURL;
  if (data.signedURL.startsWith("/storage/")) return `${supabaseUrl}${data.signedURL}`;
  return `${supabaseUrl}/storage/v1${data.signedURL.startsWith("/") ? "" : "/"}${data.signedURL}`;
}

function getContractTemplate(item: OrderItem) {
  const license = String(item.license || "").toLowerCase();
  if (license.includes("exclusive")) return exclusiveContractTemplate();
  if (license.includes("stem") || license.includes("trackout")) return stemsContractTemplate();
  if (license.includes("wav")) return wavContractTemplate();
  return mp3ContractTemplate();
}

function mp3ContractTemplate() {
  return {
    title: "Non-Exclusive MP3 License Agreement",
    sections: [
      section("Grant of license", [
        "The Producer grants the Buyer a personal, worldwide, non-exclusive and non-transferable license to use the instrumental for the creation and exploitation of one final song only.",
        "The final song must include a substantial original contribution by the Buyer, such as vocals, lyrics, topline, performance or another original artistic element. The instrumental may not be released or distributed alone.",
      ]),
      section("Files delivered", [
        "This license includes MP3 delivery only. WAV files, stems, trackouts, session files, MIDI, presets, isolated samples, source projects and alternate versions are not included unless separately agreed in writing.",
      ]),
      section("Authorized exploitation", [
        "The Buyer may record vocals, mix and master the final song, distribute it digitally, publish it on streaming platforms, upload it to social platforms and monetize the final song within the limits of this license.",
        "The license authorizes up to 100,000 cumulative streams, views, plays or public digital uses across all platforms. When that limit is reached, the Buyer must obtain an upgraded license or written approval before continuing exploitation.",
      ]),
      ...sharedNonExclusiveSections(),
      ...sharedRightsSections(),
      ...sharedRestrictionsSections("The Buyer may not use the MP3 file to recreate, resell or distribute the instrumental as a standalone product."),
      ...sharedLegalSections("French law governs this agreement. Consumer protection rules that cannot legally be waived remain applicable where relevant."),
    ],
  };
}

function wavContractTemplate() {
  return {
    title: "Non-Exclusive WAV Lease Agreement",
    sections: [
      section("Grant of license", [
        "The Producer grants the Buyer a personal, worldwide, non-exclusive and non-transferable license to use the instrumental for the creation and exploitation of one final song only.",
        "The final song must include a substantial original contribution by the Buyer. The instrumental may not be distributed alone or presented as the Buyer's own production.",
      ]),
      section("Files delivered", [
        "This license includes a WAV master and an MP3 reference file. Stems, trackouts, session files, MIDI, presets, isolated samples and source projects are not included unless separately agreed in writing.",
      ]),
      section("Authorized exploitation", [
        "The Buyer may use the WAV file for a cleaner recording, mix and master workflow, and may distribute the final song on streaming platforms, social platforms, YouTube and digital stores.",
        "Unless a higher limit is expressly stated at checkout, this license follows the same commercial framework as the standard non-exclusive lease and may require an upgrade for larger exploitation.",
      ]),
      ...sharedNonExclusiveSections(),
      ...sharedRightsSections(),
      ...sharedRestrictionsSections("The Buyer may not extract, resell, share or redistribute the WAV file as a standalone instrumental product."),
      ...sharedLegalSections("French law governs this agreement. Consumer protection rules that cannot legally be waived remain applicable where relevant."),
    ],
  };
}

function stemsContractTemplate() {
  return {
    title: "Non-Exclusive Trackout / Stems License Agreement",
    sections: [
      section("Grant of license", [
        "The Producer grants the Buyer a personal, worldwide, non-exclusive and non-transferable license to use the instrumental and delivered stems for the creation and exploitation of one final song only.",
        "The license is designed for professional recording, vocal arrangement, mixing, mastering and commercial release of that final song.",
      ]),
      section("Files delivered", [
        "This license includes WAV, MP3 and stems or trackouts where technically available. Native DAW projects, source sessions, presets, MIDI files and isolated samples are not included unless separately agreed in writing.",
      ]),
      section("Authorized exploitation", [
        "The Buyer may distribute and monetize the final song worldwide on DSPs, digital stores, YouTube, social platforms, SoundCloud, Audiomack, Bandcamp, livestreams, concerts and related promotional formats.",
        "Streams for the final song are unlimited under this license, but the license remains non-exclusive and does not prevent the Producer from licensing the same instrumental to other buyers.",
      ]),
      section("Confidentiality of stems", [
        "Stems and trackouts are confidential production files. The Buyer may share them only with people directly involved in the final song, such as a recording engineer, mixer, mastering engineer, label, manager or distributor.",
        "The Buyer remains responsible for any misuse by collaborators. Stems may not be uploaded publicly, sold, given away, included in sample packs, drum kits, loop kits, libraries, marketplaces, public clouds, forums or file-sharing spaces.",
      ]),
      ...sharedNonExclusiveSections(),
      ...sharedRightsSections(),
      ...sharedRestrictionsSections("The Buyer may not reuse stems in another production, build a competing instrumental from them, or use them to recreate the beat through another producer, software or automated system."),
      section("AI, datasets, NFT and blockchain", [
        "The Buyer may not use the instrumental, WAV, MP3, stems or any delivered elements to train AI models, build datasets, create generative music tools, extract production material or generate derivative products.",
        "NFT, blockchain, tokenized, web3 or similar exploitation requires a separate written agreement from the Producer.",
      ]),
      ...sharedLegalSections("French law governs this agreement. Consumer protection rules that cannot legally be waived remain applicable where relevant."),
    ],
  };
}

function exclusiveContractTemplate() {
  return {
    title: "Exclusive Instrumental License Agreement",
    sections: [
      section("Grant of exclusive license", [
        "The Producer grants the Buyer an exclusive license to use the exact instrumental identified in this order for the creation and exploitation of one final song only.",
        "After the effective date of this order, the Producer will not sell or grant new licenses for the exact same instrumental to other buyers, subject to the validity of licenses already sold before this exclusive purchase.",
      ]),
      section("No retroactive cancellation", [
        "The Buyer understands that prior non-exclusive licenses may already exist. Those earlier licenses remain valid under their original terms, and the Buyer may not demand retroactive takedown, blocking, demonetization or Content ID claims against prior valid licensees.",
      ]),
      section("Files delivered", [
        "This license includes MP3, WAV and stems or trackouts where available and where indicated at checkout. Missing stems do not constitute a delivery defect if they were not expressly listed as included.",
      ]),
      section("Authorized exploitation", [
        "The Buyer may commercially release, distribute, stream, sell and monetize the final song worldwide without stream or digital sales limits, subject to the restrictions in this agreement.",
        "This exclusive license applies to the exact instrumental only. It does not prevent the Producer from creating or licensing other beats in a similar genre, tempo, texture, drum style or artistic direction.",
      ]),
      section("Not a full buyout", [
        "This agreement is not a full buyout and does not automatically transfer authorship, composition rights, publishing, moral rights, producer credit or ownership of the original instrumental master.",
        "Any full buyout, transfer of publishing, transfer of master ownership or broader rights assignment must be negotiated separately in writing and paid separately.",
      ]),
      ...sharedRightsSections(),
      ...sharedRestrictionsSections("The Buyer may not resell the instrumental, sell or share stems as standalone material, place the beat in a stock library, upload it to a beat marketplace, include it in a sample pack or use it as source material for a competing product."),
      section("Content ID and prior licensees", [
        "The Buyer may register the final song with Content ID only if doing so does not claim the instrumental alone, stems alone, the original instrumental master, the Producer's content, or content from prior valid licensees.",
        "Any abusive or overbroad claim must be removed or corrected within 48 hours after written notice from the Producer.",
      ]),
      section("Synchronization", [
        "Professional synchronization uses such as advertising, film, television, games, trailers, institutional campaigns, brand placements or commercial audiovisual works require a separate written approval unless expressly authorized in a signed addendum.",
      ]),
      section("AI, datasets, NFT and blockchain", [
        "The Buyer may not use the instrumental, stems, trackouts or original instrumental master to train AI systems, build datasets, generate automated derivative works, create style imitation tools, tokenize the beat or sell blockchain/NFT products based on the instrumental without written approval.",
      ]),
      ...sharedLegalSections("French law governs this agreement. Mandatory consumer protection rules remain applicable where relevant."),
    ],
  };
}

function sharedNonExclusiveSections() {
  return [
    section("Non-exclusive nature", [
      "This license is non-exclusive. The Producer may continue to sell, license, promote, perform, display and exploit the same instrumental and may grant licenses to other artists or buyers.",
      "The Buyer receives the right to use the beat for the authorized final song, not ownership of the beat itself.",
    ]),
  ];
}

function sharedRightsSections() {
  return [
    section("Producer ownership", [
      "The Producer retains ownership of the instrumental, musical composition, arrangement, original instrumental master, source files, production elements, stems where applicable, rights of authorship, publishing and all rights not expressly granted.",
      "The Buyer may not claim to be the sole composer or producer of the instrumental and may not register the instrumental alone with any distributor, rights society, publisher, recognition system or platform.",
    ]),
    section("Publishing, composition and royalties", [
      "Unless a separate written agreement states otherwise, the Producer keeps the Producer's composition and publishing share in the final song. A typical recommended split is Producer 50% minimum and Buyer/writers/topliners 50% maximum, to be adjusted only by written agreement where other contributors are involved.",
      "The Buyer may keep master-side income generated by the Buyer's final recording within the limits of the license, but this does not remove or reduce the Producer's composition, publishing, neighboring or equivalent rights.",
    ]),
    section("Producer credit", [
      "The Buyer must credit the Producer where technically possible using the credit 'Prod. by BOOM BAP CHOP SHOP' or another credit approved by the Producer.",
      "The credit should appear in distributor metadata, YouTube descriptions, DSP credits where available, SoundCloud, Bandcamp, Audiomack, video descriptions, visualizers and main promotional posts where reasonably possible.",
    ]),
  ];
}

function sharedRestrictionsSections(extra: string) {
  return [
    section("General restrictions", [
      "The Buyer may not resell, rent, give away, sublicense, transfer, upload or distribute the instrumental alone. The Buyer may not use the instrumental to create multiple songs unless additional licenses are purchased.",
      "The instrumental may not be included in sample packs, loop kits, drum kits, music libraries, stock music catalogs, beat marketplaces, datasets, AI training sets or any product that lets third parties access or reuse the beat as production material.",
      extra,
    ]),
    section("Content ID and automated claims", [
      "The Buyer may monetize the final song on platforms such as YouTube only if the monetization does not block, claim or restrict the Producer, the Producer's catalog, or other buyers who hold valid licenses.",
      "The Buyer may not register the instrumental alone, stems alone or an instrumental version of the final song in Content ID or any equivalent automated claim system.",
    ]),
    section("Samples and third-party elements", [
      "If the Producer has knowledge of third-party samples or elements requiring additional clearance for major exploitation, the Producer will communicate that information where reasonably possible.",
      "Unless expressly stated otherwise, this license does not guarantee clearance of every possible third-party element for major label release, national radio, advertising, film, television, synchronization or high-budget exploitation.",
    ]),
  ];
}

function sharedLegalSections(lawText: string) {
  return [
    section("Payment, delivery and refunds", [
      "The license becomes effective only after full payment or successful order validation. Fraudulent, cancelled, disputed, reversed or charged-back payment may suspend or terminate the license until resolved.",
      "Because the delivered files and contract are digital goods, refunds after access or delivery may be limited according to the applicable checkout terms and consumer rules.",
    ]),
    section("Termination", [
      "The Producer may suspend or terminate the license if the Buyer materially breaches the agreement, including non-payment, unauthorized resale, improper Content ID claims, false rights declarations, unauthorized synchronization, prohibited AI use or violation of the Producer's rights.",
      "Termination may require the Buyer to stop further exploitation, correct credits, remove abusive claims, remove unauthorized uploads and compensate documented damage where legally applicable.",
    ]),
    section("Applicable law and disputes", [
      lawText,
      "The parties will first try to resolve disputes by written communication. If no amicable resolution is reached, disputes may be submitted to the competent French courts, subject to mandatory rules protecting consumers where applicable.",
    ]),
  ];
}

function section(heading: string, paragraphs: string[]) {
  return { heading, paragraphs };
}

function absoluteUrl(path: string, siteUrl: string) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!siteUrl) return path;
  return `${siteUrl.replace(/\/$/, "")}/${path.replace(/^\.\//, "").replace(/^\//, "")}`;
}

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `BBCS-${date}-${random}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function slugify(value: string) {
  return String(value || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "item";
}

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(nextLine, size) <= maxWidth) {
      line = nextLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
