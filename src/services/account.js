import { getSupabase, isCmsConfigured } from "./cms.js";

export async function getCustomerSession() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function signUpCustomer(email, password) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: String(email || "").trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInCustomer(email, password) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || "").trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function sendPasswordReset(email) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail.includes("@")) throw new Error("Enter a valid email.");

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${window.location.origin}${window.location.pathname}#account`,
  });
  if (error) throw error;
  return data;
}

export async function updateCustomerPassword(password) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const nextPassword = String(password || "");
  if (nextPassword.length < 6) throw new Error("Password must be at least 6 characters.");

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) throw error;
  return data;
}

export async function onCustomerAuthStateChange(callback) {
  const supabase = await getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription?.unsubscribe?.();
}

export async function signOutCustomer() {
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function loadCustomerOrders() {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("order_number,items,contract_urls,subtotal,discount,total,currency,status,created_at,email_sent_at")
    .in("status", ["paid", "email_sent", "delivered"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapOrder);
}

function mapOrder(order) {
  return {
    orderNumber: order.order_number,
    items: Array.isArray(order.items) ? order.items : [],
    contractUrls: order.contract_urls || [],
    subtotal: Number(order.subtotal || 0),
    discount: order.discount || {},
    total: Number(order.total || 0),
    currency: order.currency || "EUR",
    status: order.status || "",
    createdAt: order.created_at || "",
    emailSentAt: order.email_sent_at || "",
  };
}
