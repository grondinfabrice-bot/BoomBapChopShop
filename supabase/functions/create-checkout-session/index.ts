const STRIPE_CHECKOUT_ENDPOINT = "https://api.stripe.com/v1/checkout/sessions";

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
  deliveryFiles?: unknown[];
  serviceFor?: string;
  type?: string;
};

type CheckoutPayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  total?: number;
  currency?: string;
  siteUrl?: string;
  items?: OrderItem[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await request.json() as CheckoutPayload;
    const email = String(payload.email || "").trim().toLowerCase();
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!email.includes("@")) return json({ error: "Valid customer email required" }, 400);
    if (!items.length) return json({ error: "Order items required" }, 400);

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeSecretKey) return json({ error: "STRIPE_SECRET_KEY is not configured." }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || "";
    const siteUrl = Deno.env.get("SITE_URL") || payload.siteUrl || "";
    const currency = String(payload.currency || "EUR").toLowerCase();
    const orderNumber = makeOrderNumber();
    const total = Number(payload.total || items.reduce((sum, item) => sum + Number(item.price || 0), 0));
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();

    await createPendingOrder({
      supabaseUrl,
      serviceRoleKey,
      orderNumber,
      email,
      firstName,
      lastName,
      items,
      total,
      currency: currency.toUpperCase(),
    });

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("customer_email", email);
    form.set("client_reference_id", orderNumber);
    form.set("success_url", `${siteUrl.replace(/\/$/, "")}/?checkout=success&order=${encodeURIComponent(orderNumber)}`);
    form.set("cancel_url", `${siteUrl.replace(/\/$/, "")}/?checkout=cancel&order=${encodeURIComponent(orderNumber)}`);
    form.set("metadata[order_number]", orderNumber);
    form.set("metadata[customer_email]", email);

    items.forEach((item, index) => {
      const name = `${item.name || "Order item"} - ${item.license || "License"}`;
      const description = item.serviceFor ? `For: ${item.serviceFor}` : "BOOM BAP CHOP SHOP digital order";
      form.set(`line_items[${index}][quantity]`, "1");
      form.set(`line_items[${index}][price_data][currency]`, currency);
      form.set(`line_items[${index}][price_data][unit_amount]`, String(Math.round(Number(item.price || 0) * 100)));
      form.set(`line_items[${index}][price_data][product_data][name]`, name);
      form.set(`line_items[${index}][price_data][product_data][description]`, description);
    });

    const stripeResponse = await fetch(STRIPE_CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok) return json({ error: stripeData }, 502);

    await attachStripeSession({
      supabaseUrl,
      serviceRoleKey,
      orderNumber,
      sessionId: stripeData.id || "",
    });

    return json({
      orderNumber,
      checkoutUrl: stripeData.url,
      sessionId: stripeData.id,
    });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
});

async function createPendingOrder({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
  email,
  firstName,
  lastName,
  items,
  total,
  currency,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  items: OrderItem[];
  total: number;
  currency: string;
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
      contract_urls: unique(items.map((item) => item.contractUrl || "").filter(Boolean)),
      total,
      currency,
      status: "pending_payment",
      payment_provider: "stripe",
      license_acceptance: {
        accepted: true,
        accepted_at: new Date().toISOString(),
        method: "checkout_checkbox",
      },
    }),
  });
  if (!response.ok) throw new Error(`Order insert failed: ${await response.text()}`);
}

async function attachStripeSession({
  supabaseUrl,
  serviceRoleKey,
  orderNumber,
  sessionId,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  orderNumber: string;
  sessionId: string;
}) {
  if (!supabaseUrl || !serviceRoleKey || !sessionId) return;
  await fetch(`${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      payment_reference: sessionId,
    }),
  });
}

function makeOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `BBCS-${date}-${random}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
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
