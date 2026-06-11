import { getSupabase, isCmsConfigured } from "./cms.js";

export async function sendOrderEmail({ email, firstName = "", lastName = "", items, total }) {
  if (!isCmsConfigured()) {
    return { sent: false, mode: "demo", message: "Supabase is not configured." };
  }

  const supabase = await getSupabase();
  if (!supabase?.functions) {
    return { sent: false, mode: "demo", message: "Supabase functions are not available." };
  }

  const order = {
    email,
    firstName,
    lastName,
    total,
    currency: "EUR",
    siteUrl: window.location.origin,
    items: items.map((item) => ({
      beatId: item.beatId || "",
      name: item.name,
      license: item.license,
      licenseId: item.licenseId || "",
      price: item.price,
      includes: item.includes || [],
      contractUrl: item.contractUrl || "",
      deliveryFiles: item.deliveryFiles || [],
      serviceFor: item.serviceFor || "",
      type: item.type || "beat",
    })),
  };

  return await invokeFunction(supabase, "send-order-email", order) || { sent: true };
}

export async function validatePromoCode({ code, items, total }) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");

  const supabase = await getSupabase();
  if (!supabase?.functions) throw new Error("Supabase functions are not available.");

  const order = buildOrderPayload({ email: "promo-check@example.com", firstName: "", lastName: "", items, total, promoCode: code });
  return await invokeFunction(supabase, "validate-promo-code", order);
}

export async function createCheckoutSession({ email, firstName = "", lastName = "", items, total, promoCode = "" }) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");

  const supabase = await getSupabase();
  if (!supabase?.functions) throw new Error("Supabase functions are not available.");

  const order = buildOrderPayload({ email, firstName, lastName, items, total, promoCode });
  const data = await invokeFunction(supabase, "create-checkout-session", order);

  if (!data?.checkoutUrl) throw new Error("Stripe checkout URL missing.");
  return data;
}

async function invokeFunction(supabase, name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw await enrichFunctionError(error);
  return data;
}

async function enrichFunctionError(error) {
  const response = error?.context;
  if (!response?.clone) return error;
  try {
    const payload = await response.clone().json();
    const detail = typeof payload?.error === "string"
      ? payload.error
      : JSON.stringify(payload?.error || payload);
    const enriched = new Error(detail || error.message || "Edge Function failed.");
    enriched.originalError = error;
    enriched.status = response.status;
    return enriched;
  } catch {
    return error;
  }
}

function buildOrderPayload({ email, firstName, lastName, items, total, promoCode = "" }) {
  return {
    email,
    firstName,
    lastName,
    total,
    promoCode,
    currency: "EUR",
    siteUrl: window.location.origin,
    items: items.map((item) => ({
      beatId: item.beatId || "",
      name: item.name,
      license: item.license,
      licenseId: item.licenseId || "",
      price: item.price,
      includes: item.includes || [],
      contractUrl: item.contractUrl || "",
      deliveryFiles: item.deliveryFiles || [],
      serviceFor: item.serviceFor || "",
      type: item.type || "beat",
    })),
  };
}
