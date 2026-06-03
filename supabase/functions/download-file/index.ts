const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type DownloadTokenPayload = {
  bucket?: string;
  path?: string;
  filename?: string;
  expiresAt?: number;
  orderNumber?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return text("Method not allowed", 405);

  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const payload = await verifyDownloadToken(token);
    if (!payload) return text("Invalid or expired download link.", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return text("Download service is not configured.", 500);

    const bucket = sanitizeStorageSegment(payload.bucket || "deliverables");
    const path = String(payload.path || "").replace(/^\/+/, "");
    if (!bucket || !path || path.includes("..")) return text("Invalid download target.", 400);

    const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!response.ok || !response.body) return text("File not found.", 404);

    const filename = sanitizeFilename(payload.filename || path.split("/").pop() || "boombapchopshop-download");
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return text(String(error?.message || error), 500);
  }
});

async function verifyDownloadToken(token: string): Promise<DownloadTokenPayload | null> {
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  const secret = getDownloadSecret();
  if (!secret) return null;
  const expected = await sign(payloadPart, secret);
  if (!timingSafeEqual(expected, signature)) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart))) as DownloadTokenPayload;
  if (!payload.expiresAt || Date.now() > payload.expiresAt) return null;
  return payload;
}

function getDownloadSecret() {
  return Deno.env.get("DOWNLOAD_LINK_SECRET")
    || Deno.env.get("BBCS_SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function sanitizeStorageSegment(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

function sanitizeFilename(value: string) {
  return String(value || "download")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "download";
}

function text(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
