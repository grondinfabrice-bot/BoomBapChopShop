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
  missingDeliveryFormats?: string[];
  deliveryStatus?: string;
  deliveryNote?: string;
  serviceFor?: string;
  type?: string;
};

type CheckoutPayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  total?: number;
  promoCode?: string;
  currency?: string;
  siteUrl?: string;
  items?: OrderItem[];
};

type PromoCode = {
  code?: string;
  label?: string;
  discount_type?: string;
  discount_value?: number;
  active?: boolean;
  min_order_total?: number;
  max_uses?: number | null;
  used_count?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  applies_to?: string;
};

type PromoDiscount = {
  valid: boolean;
  code: string;
  label: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  error?: string;
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
    const subtotal = orderItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const promoCode = normalizePromoCode(payload.promoCode || "");
    const promo = await validatePromoCode({
      supabaseUrl,
      serviceRoleKey,
      code: promoCode,
      items: orderItems,
    });
    if (promoCode && !promo.valid) return json({ error: promo.error || "Promo code is not valid." }, 400);
    const total = promo.valid ? promo.total : subtotal;
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
      subtotal,
      discount: promo.valid ? promo : null,
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
    if (promo.valid) {
      form.set("metadata[promo_code]", promo.code);
      form.set("metadata[promo_discount_amount]", String(promo.discountAmount));
    }

    const stripeLineItems = buildStripeLineItems(orderItems, promo.valid ? promo.discountAmount : 0);
    stripeLineItems.forEach(({ item, unitAmount }, index) => {
      const name = `${item.name || "Order item"} - ${item.license || "License"}`;
      const description = item.serviceFor ? `For: ${item.serviceFor}` : "BOOM BAP CHOP SHOP digital order";
      form.set(`line_items[${index}][quantity]`, "1");
      form.set(`line_items[${index}][price_data][currency]`, currency);
      form.set(`line_items[${index}][price_data][unit_amount]`, String(unitAmount));
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
  subtotal,
  discount,
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
  subtotal: number;
  discount: PromoDiscount | null;
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
      subtotal,
      discount: discount || {},
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

async function validatePromoCode({
  supabaseUrl,
  serviceRoleKey,
  code,
  items,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  code: string;
  items: OrderItem[];
}): Promise<PromoDiscount> {
  const normalized = normalizePromoCode(code);
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.price || 0), 0));
  if (!normalized) return invalidPromo("", subtotal, "");
  if (!supabaseUrl || !serviceRoleKey) return invalidPromo(normalized, subtotal, "Promo codes are not configured yet.");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/promo_codes?code=eq.${encodeURIComponent(normalized)}&active=eq.true&select=*`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Promo code fetch failed: ${await response.text()}`);

  const rows = await response.json();
  const promo = Array.isArray(rows) && rows.length ? rows[0] as PromoCode : null;
  if (!promo) return invalidPromo(normalized, subtotal, "Promo code not found.");

  const now = Date.now();
  if (promo.starts_at && Date.parse(promo.starts_at) > now) return invalidPromo(normalized, subtotal, "Promo code is not active yet.");
  if (promo.ends_at && Date.parse(promo.ends_at) < now) return invalidPromo(normalized, subtotal, "Promo code has expired.");
  if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.used_count || 0) >= Number(promo.max_uses)) {
    return invalidPromo(normalized, subtotal, "Promo code has reached its usage limit.");
  }

  const eligibleSubtotal = getEligibleSubtotal(items, promo.applies_to || "all");
  const minOrderTotal = Number(promo.min_order_total || 0);
  if (subtotal < minOrderTotal) return invalidPromo(normalized, subtotal, `Minimum order is ${minOrderTotal.toFixed(2)}€.`);
  if (eligibleSubtotal <= 0) return invalidPromo(normalized, subtotal, "Promo code does not apply to these items.");

  const discountValue = Number(promo.discount_value || 0);
  const discountType = String(promo.discount_type || "").toLowerCase();
  const rawDiscount = discountType === "percent"
    ? eligibleSubtotal * (Math.max(0, Math.min(100, discountValue)) / 100)
    : discountValue;
  const discountAmount = roundMoney(Math.min(eligibleSubtotal, Math.max(0, rawDiscount)));
  if (discountAmount <= 0) return invalidPromo(normalized, subtotal, "Promo code has no discount value.");

  return {
    valid: true,
    code: normalized,
    label: promo.label || normalized,
    subtotal,
    discountAmount,
    total: roundMoney(Math.max(0, subtotal - discountAmount)),
  };
}

function invalidPromo(code: string, subtotal: number, error: string): PromoDiscount {
  return {
    valid: false,
    code,
    label: code,
    subtotal,
    discountAmount: 0,
    total: subtotal,
    error,
  };
}

function getEligibleSubtotal(items: OrderItem[], appliesTo: string) {
  return items
    .filter((item) => {
      if (appliesTo === "beats") return item.type !== "service";
      if (appliesTo === "services") return item.type === "service";
      return true;
    })
    .reduce((sum, item) => sum + Number(item.price || 0), 0);
}

function buildStripeLineItems(items: OrderItem[], discountAmount: number) {
  const amounts = items.map((item) => Math.max(0, Math.round(Number(item.price || 0) * 100)));
  const discountCents = Math.min(amounts.reduce((sum, amount) => sum + amount, 0), Math.round(discountAmount * 100));
  const discountedAmounts = allocateDiscount(amounts, discountCents);
  return items.map((item, index) => ({
    item,
    unitAmount: discountedAmounts[index],
  }));
}

function allocateDiscount(amounts: number[], discountCents: number) {
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  if (!subtotal || !discountCents) return amounts;
  let remainingDiscount = discountCents;
  const discountedAmounts = amounts.map((amount, index) => {
    if (index === amounts.length - 1) return Math.max(0, amount - remainingDiscount);
    const itemDiscount = Math.min(amount, Math.floor((amount / subtotal) * discountCents));
    remainingDiscount -= itemDiscount;
    return Math.max(0, amount - itemDiscount);
  });
  return discountedAmounts;
}

function normalizePromoCode(code: string) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
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
      const service = getServiceOffer(item.name || "");
      if (!service) throw new Error("Invalid studio service in checkout.");
      trustedItems.push({
        name: service.name,
        license: "Mix + Mastering",
        price: service.price,
        includes: service.includes,
        serviceFor: String(item.serviceFor || "").trim().slice(0, 160),
        type: "service",
      });
      continue;
    }

    const license = getLicense(item.licenseId || "");
    const beat = beatsById.get(String(item.beatId || ""));
    if (!license || !beat) throw new Error("Invalid beat or license in checkout.");
    const deliveryFiles = filterDeliveryFiles(beat.delivery_files, license.id);
    const missingFormats = getMissingRequiredFormats(deliveryFiles, license.id);

    trustedItems.push({
      beatId: beat.id,
      name: beat.name,
      license: license.name,
      licenseId: license.id,
      price: license.price,
      includes: license.includes,
      contractUrl: license.contractUrl,
      deliveryFiles,
      missingDeliveryFormats: missingFormats,
      deliveryStatus: missingFormats.length ? "manual_delivery_required" : "instant_delivery_ready",
      deliveryNote: missingFormats.length
        ? `Missing ${missingFormats.join(", ")} private delivery files. Fulfill this order manually after payment.`
        : "",
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

function getServiceOffer(name: string) {
  const normalized = normalizeServiceName(name);
  return SERVICE_OFFERS.find((offer) => normalizeServiceName(offer.name) === normalized) || null;
}

function normalizeServiceName(value: string) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

const SERVICE_OFFERS = [
  {
    name: "Mix + Master Essential",
    price: 99,
    includes: ["Vocal mix", "EQ / compression / space", "Final master WAV + MP3", "1 revision round"],
  },
  {
    name: "Mix + Master Premium",
    price: 149,
    includes: ["Full vocal mix", "Streaming-ready master", "Clean + performance versions", "2 revision rounds"],
  },
  {
    name: "Mix + Master Express",
    price: 199,
    includes: ["Priority turnaround", "Full mix + master", "Release export check", "2 revision rounds"],
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
