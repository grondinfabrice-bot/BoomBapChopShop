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
