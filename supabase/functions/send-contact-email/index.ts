const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SHOP_EMAIL = "contact@boombapchopshop.art";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContactPayload = {
  artistName?: string;
  email?: string;
  subject?: string;
  message?: string;
  website?: string;
  pageUrl?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await request.json() as ContactPayload;
    const artistName = clean(payload.artistName, 120);
    const email = clean(payload.email, 180).toLowerCase();
    const subject = clean(payload.subject || "Contact request", 120);
    const message = cleanMultiline(payload.message, 4000);
    const pageUrl = clean(payload.pageUrl, 500);
    const honeypot = clean(payload.website, 200);

    if (honeypot) return json({ sent: true });
    if (!isValidEmail(email)) return json({ error: "Valid email required" }, 400);
    if (message.length < 10) return json({ error: "Message is too short" }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured." }, 500);

    const from = Deno.env.get("ORDER_FROM_EMAIL") || `BOOM BAP CHOP SHOP <${SHOP_EMAIL}>`;
    const to = Deno.env.get("CONTACT_TO_EMAIL") || Deno.env.get("ORDER_REPLY_TO") || SHOP_EMAIL;
    const replyTo = email;

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: replyTo,
        subject: `BOOM BAP CHOP SHOP contact - ${subject}`,
        text: buildText({ artistName, email, subject, message, pageUrl }),
        html: buildHtml({ artistName, email, subject, message, pageUrl }),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend contact email failed", detail);
      return json({ error: "Contact email could not be sent." }, 502);
    }

    return json({ sent: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Contact email could not be sent." }, 500);
  }
});

function buildText(payload: Required<Pick<ContactPayload, "artistName" | "email" | "subject" | "message" | "pageUrl">>) {
  return [
    "New BOOM BAP CHOP SHOP contact message",
    "",
    `Artist: ${payload.artistName || "Not provided"}`,
    `Email: ${payload.email}`,
    `Subject: ${payload.subject}`,
    payload.pageUrl ? `Page: ${payload.pageUrl}` : "",
    "",
    payload.message,
  ].filter(Boolean).join("\n");
}

function buildHtml(payload: Required<Pick<ContactPayload, "artistName" | "email" | "subject" | "message" | "pageUrl">>) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1e1e1e;line-height:1.55">
      <h1 style="font-size:22px;margin:0 0 16px">New BOOM BAP CHOP SHOP contact message</h1>
      <p><strong>Artist:</strong> ${escapeHtml(payload.artistName || "Not provided")}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
      ${payload.pageUrl ? `<p><strong>Page:</strong> ${escapeHtml(payload.pageUrl)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #ddd;margin:18px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(payload.message)}</p>
    </div>
  `;
}

function clean(value: unknown, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength: number) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
