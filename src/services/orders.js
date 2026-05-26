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
      name: item.name,
      license: item.license,
      price: item.price,
      includes: item.includes || [],
      contractUrl: item.contractUrl || "",
      deliveryFiles: item.deliveryFiles || [],
      serviceFor: item.serviceFor || "",
      type: item.type || "beat",
    })),
  };

  const { data, error } = await supabase.functions.invoke("send-order-email", {
    body: order,
  });

  if (error) throw error;
  return data || { sent: true };
}

export async function createCheckoutSession({ email, firstName = "", lastName = "", items, total }) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");

  const supabase = await getSupabase();
  if (!supabase?.functions) throw new Error("Supabase functions are not available.");

  const order = buildOrderPayload({ email, firstName, lastName, items, total });
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: order,
  });

  if (error) throw error;
  if (!data?.checkoutUrl) throw new Error("Stripe checkout URL missing.");
  return data;
}

function buildOrderPayload({ email, firstName, lastName, items, total }) {
  return {
    email,
    firstName,
    lastName,
    total,
    currency: "EUR",
    siteUrl: window.location.origin,
    items: items.map((item) => ({
      name: item.name,
      license: item.license,
      price: item.price,
      includes: item.includes || [],
      contractUrl: item.contractUrl || "",
      deliveryFiles: item.deliveryFiles || [],
      serviceFor: item.serviceFor || "",
      type: item.type || "beat",
    })),
  };
}
