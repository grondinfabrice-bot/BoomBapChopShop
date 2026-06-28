import { getSupabase, isCmsConfigured } from "./cms.js";

export async function askAiChatbot({ message, language = "auto", history = [] }) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not available.");

  const safeHistory = history
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({
      role: item.role,
      text: item.text,
    }))
    .slice(-8);

  const { data, error } = await supabase.functions.invoke("chatbot", {
    body: {
      message,
      language,
      history: safeHistory,
    },
  });

  if (error) throw error;
  if (!data?.reply) throw new Error("Chatbot reply missing.");
  return data;
}
