const STRIPE_CHECKOUT_ENDPOINT = "https://api.stripe.com/v1/checkout/sessions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderItem = {
  beatId?: string | number;
  name?: string;
  license?: string;
  licenseId?: string;
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
    const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const orderItems = await buildTrustedOrderItems({
      supabaseUrl,
      serviceRoleKey,
      items,
    });
    const siteUrl = Deno.env.get("SITE_URL") || payload.siteUrl || "";
    const currency = String(payload.currency || "EUR").toLowerCase();
    const orderNumber = makeOrderNumber();
    const total = orderItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const firstName = String(payload.firstName || "").trim();
    const lastName = String(payload.lastName || "").trim();

    await createPendingOrder({
      supabaseUrl,
      serviceRoleKey,
      orderNumber,
      email,
      firstName,
      lastName,
      items: orderItems,
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

    orderItems.forEach((item, index) => {
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

async function buildTrustedOrderItems({
  supabaseUrl,
  serviceRoleKey,
  items,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  items: OrderItem[];
}) {
  const trustedItems: OrderItem[] = [];
  const beatIds = unique(
    items
      .filter((item) => item.type !== "service")
      .map((item) => String(item.beatId || "").trim())
      .filter(Boolean),
  );
  const beatsById = await getBeatsById({ supabaseUrl, serviceRoleKey, beatIds });

  for (const item of items) {
    if (item.type === "service") {
      trustedItems.push({
        name: item.name || "Studio service",
        license: item.license || "Mix + Mastering",
        price: Number(item.price || 0),
        includes: item.includes || [],
        serviceFor: item.serviceFor || "",
        type: "service",
      });
      continue;
    }

    const license = getLicense(item.licenseId || "");
    const beat = beatsById.get(String(item.beatId || ""));
    if (!license || !beat) throw new Error("Invalid beat or license in checkout.");
    const deliveryFiles = filterDeliveryFiles(beat.delivery_files, license.id);
    const missingFormats = getMissingRequiredFormats(deliveryFiles, license.id);
    if (missingFormats.length) {
      throw new Error(`Missing private ${missingFormats.join(", ")} delivery for ${beat.name}.`);
    }

    trustedItems.push({
      beatId: beat.id,
      name: beat.name,
      license: license.name,
      licenseId: license.id,
      price: license.price,
      includes: license.includes,
      contractUrl: license.contractUrl,
      deliveryFiles,
      type: "beat",
    });
  }

  return trustedItems;
}

async function getBeatsById({
  supabaseUrl,
  serviceRoleKey,
  beatIds,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  beatIds: string[];
}) {
  const beatsById = new Map<string, { id: number; name: string; delivery_files?: unknown[] }>();
  if (!supabaseUrl || !serviceRoleKey || !beatIds.length) return beatsById;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/beats?id=in.(${beatIds.map(encodeURIComponent).join(",")})&published=eq.true&select=id,name,delivery_files`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Beat fetch failed: ${await response.text()}`);
  const rows = await response.json();
  if (Array.isArray(rows)) {
    rows.forEach((row) => beatsById.set(String(row.id), row));
  }
  return beatsById;
}

function filterDeliveryFiles(files: unknown, licenseId: string) {
  const allowedFormats = getDeliveryFormatsForLicense(licenseId);
  if (!Array.isArray(files)) return [];
  return files
    .filter((file) => file && typeof file === "object" && allowedFormats.includes(String((file as { format?: string }).format || "")))
    .map((file) => {
      const deliveryFile = file as { label?: string; bucket?: string; path?: string; filename?: string; format?: string; note?: string };
      return {
        label: deliveryFile.label || getDeliveryLabel(deliveryFile.format || ""),
        bucket: deliveryFile.bucket || "deliverables",
        path: deliveryFile.path || "",
        filename: deliveryFile.filename || "",
        format: deliveryFile.format || "",
        note: deliveryFile.note || "",
      };
    })
    .filter((file) => file.path);
}

function getDeliveryFormatsForLicense(licenseId: string) {
  if (licenseId === "mp3-basic") return ["mp3"];
  if (licenseId === "wav") return ["mp3", "wav"];
  if (licenseId === "wav-stems") return ["mp3", "wav", "stems"];
  if (licenseId === "exclusive") return ["mp3", "wav", "stems"];
  return [];
}

function getMissingRequiredFormats(files: { format?: string }[], licenseId: string) {
  const availableFormats = new Set(files.map((file) => file.format).filter(Boolean));
  const requiredFormats = getRequiredDeliveryFormatsForLicense(licenseId);
  return requiredFormats.filter((format) => !availableFormats.has(format));
}

function getRequiredDeliveryFormatsForLicense(licenseId: string) {
  if (licenseId === "mp3-basic") return ["mp3"];
  if (licenseId === "wav") return ["wav"];
  if (licenseId === "wav-stems") return ["wav", "stems"];
  if (licenseId === "exclusive") return ["wav"];
  return [];
}

function getDeliveryLabel(format: string) {
  if (format === "mp3") return "Download MP3";
  if (format === "wav") return "Download WAV";
  if (format === "stems") return "Download stems";
  return "Download audio file";
}

function getLicense(id: string) {
  return LICENSES.find((license) => license.id === id) || null;
}

const LICENSES = [
  {
    id: "mp3-basic",
    name: "MP3 Basic",
    price: 14.99,
    contractUrl: "./documents/licenses/licence-non-exclusive-mp3-100k-streams.pdf",
    includes: ["MP3 delivery", "Non-exclusive license agreement", "Instant download after payment"],
  },
  {
    id: "wav",
    name: "WAV Lease",
    price: 29.99,
    contractUrl: "./documents/licenses/licence-non-exclusive-wav-lease.pdf",
    includes: ["Untagged WAV master", "MP3 reference", "Standard license agreement"],
  },
  {
    id: "wav-stems",
    name: "WAV + Stems",
    price: 49.99,
    contractUrl: "./documents/licenses/licence-non-exclusive-trackout-stems.pdf",
    includes: ["Untagged WAV and MP3", "Separated stems / trackouts", "Professional license agreement"],
  },
  {
    id: "exclusive",
    name: "Exclusive",
    price: 199,
    contractUrl: "./documents/licenses/licence-exclusive-instrumentale.pdf",
    includes: ["WAV and MP3", "Stems if available", "Exclusive license agreement", "Beat marked as sold"],
  },
];

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
