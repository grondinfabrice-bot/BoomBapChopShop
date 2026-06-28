const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderItem = {
  beatId?: string | number;
  licenseId?: string;
  name?: string;
  license?: string;
  price?: number;
  includes?: string[];
  serviceFor?: string;
  type?: string;
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await request.json();
    const code = normalizePromoCode(payload.promoCode || "");
    const items = Array.isArray(payload.items) ? payload.items as OrderItem[] : [];
    if (!items.length) return json({ valid: false, code, error: "Order items required." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("BBCS_SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const orderItems = await buildTrustedOrderItems({ supabaseUrl, serviceRoleKey, items });
    return json(await validatePromoCode({ supabaseUrl, serviceRoleKey, code, items: orderItems }));
  } catch (error) {
    return json({ valid: false, error: String(error?.message || error) }, 500);
  }
});

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
}) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.price || 0), 0));
  if (!code) return invalidPromo("", subtotal, "Enter a promo code.");
  if (!supabaseUrl || !serviceRoleKey) return invalidPromo(code, subtotal, "Promo codes are not configured yet.");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/promo_codes?code=eq.${encodeURIComponent(code)}&active=eq.true&select=*`,
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
  if (!promo) return invalidPromo(code, subtotal, "Promo code not found.");

  const now = Date.now();
  if (promo.starts_at && Date.parse(promo.starts_at) > now) return invalidPromo(code, subtotal, "Promo code is not active yet.");
  if (promo.ends_at && Date.parse(promo.ends_at) < now) return invalidPromo(code, subtotal, "Promo code has expired.");
  if (promo.max_uses !== null && promo.max_uses !== undefined && Number(promo.used_count || 0) >= Number(promo.max_uses)) {
    return invalidPromo(code, subtotal, "Promo code has reached its usage limit.");
  }

  const eligibleSubtotal = getEligibleSubtotal(items, promo.applies_to || "all");
  const minOrderTotal = Number(promo.min_order_total || 0);
  if (subtotal < minOrderTotal) return invalidPromo(code, subtotal, `Minimum order is ${minOrderTotal.toFixed(2)}€.`);
  if (eligibleSubtotal <= 0) return invalidPromo(code, subtotal, "Promo code does not apply to these items.");

  const discountValue = Number(promo.discount_value || 0);
  const discountType = String(promo.discount_type || "").toLowerCase();
  const rawDiscount = discountType === "percent"
    ? eligibleSubtotal * (Math.max(0, Math.min(100, discountValue)) / 100)
    : discountValue;
  const discountAmount = roundMoney(Math.min(eligibleSubtotal, Math.max(0, rawDiscount)));
  if (discountAmount <= 0) return invalidPromo(code, subtotal, "Promo code has no discount value.");

  return {
    valid: true,
    code,
    label: promo.label || code,
    subtotal,
    discountAmount,
    total: roundMoney(Math.max(0, subtotal - discountAmount)),
  };
}

function invalidPromo(code: string, subtotal: number, error: string) {
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
      if (!service) throw new Error("Invalid studio service in promo check.");
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
    trustedItems.push({
      beatId: beat.id,
      name: beat.name,
      license: license.name,
      licenseId: license.id,
      price: license.price,
      includes: license.includes,
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
  const beatsById = new Map<string, { id: number; name: string }>();
  if (!supabaseUrl || !serviceRoleKey || !beatIds.length) return beatsById;
  const response = await fetch(
    `${supabaseUrl}/rest/v1/beats?id=in.(${beatIds.map(encodeURIComponent).join(",")})&published=eq.true&select=id,name`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Beat fetch failed: ${await response.text()}`);
  const rows = await response.json();
  if (Array.isArray(rows)) rows.forEach((row) => beatsById.set(String(row.id), row));
  return beatsById;
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

function normalizePromoCode(code: string) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
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

const LICENSES = [
  {
    id: "mp3-basic",
    name: "MP3 Basic",
    price: 14.99,
    includes: ["MP3 delivery", "Non-exclusive license agreement", "Instant download after payment"],
  },
  {
    id: "wav",
    name: "WAV Lease",
    price: 29.99,
    includes: ["Untagged WAV master", "MP3 reference", "Standard license agreement"],
  },
  {
    id: "wav-stems",
    name: "WAV + Stems",
    price: 49.99,
    includes: ["Untagged WAV and MP3", "Separated stems / trackouts", "Professional license agreement"],
  },
  {
    id: "exclusive",
    name: "Exclusive",
    price: 199,
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
