const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let supabasePromise;

export function isCmsConfigured() {
  const config = window.BBCS_CONFIG || {};
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export async function getSupabase() {
  if (!isCmsConfigured()) return null;
  if (!supabasePromise) {
    supabasePromise = import(SUPABASE_CDN).then(({ createClient }) => {
      const config = window.BBCS_CONFIG;
      return createClient(config.supabaseUrl, config.supabaseAnonKey);
    });
  }
  return supabasePromise;
}

export async function loadPublishedContent() {
  const supabase = await getSupabase();
  if (!supabase) return {};

  const [beatsResult, postsResult] = await Promise.all([
    supabase
      .from("beats")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false }),
  ]);

  if (beatsResult.error) throw beatsResult.error;
  if (postsResult.error) throw postsResult.error;

  return {
    beats: beatsResult.data.map(mapBeat),
    posts: postsResult.data.map(mapPost),
  };
}

export async function signInAdmin(email, password) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getAdminSession() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function loadAdminContent() {
  const supabase = await getSupabase();
  if (!supabase) return { beats: [], posts: [] };

  const [beatsResult, postsResult] = await Promise.all([
    supabase.from("beats").select("*").order("created_at", { ascending: false }),
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
  ]);

  if (beatsResult.error) throw beatsResult.error;
  if (postsResult.error) throw postsResult.error;

  return {
    beats: beatsResult.data.map(mapBeat),
    posts: postsResult.data.map(mapPost),
  };
}

export async function saveBeat(form) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const slug = slugify(form.get("name"));
  const coverUrl = await uploadFile("covers", form.get("cover"), `${slug}-cover`);
  const previewUrl = await uploadFile("previews", form.get("preview"), `${slug}-preview`);

  const payload = compact({
    name: form.get("name"),
    subtitle: form.get("subtitle"),
    bpm: numberOrNull(form.get("bpm")),
    key: form.get("key"),
    duration: form.get("duration"),
    duration_seconds: numberOrNull(form.get("durationSeconds")),
    cover_url: coverUrl,
    preview_url: previewUrl,
    price: numberOrNull(form.get("price")),
    tags: splitTags(form.get("tags")),
    description: form.get("description"),
    published: form.get("published") === "on",
  });

  const { error } = await supabase.from("beats").insert(payload);
  if (error) throw error;
}

export async function savePost(form) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const title = form.get("title");
  const payload = {
    slug: slugify(title),
    title,
    category: form.get("category"),
    excerpt: form.get("excerpt"),
    body: String(form.get("body") || "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    tags: splitTags(form.get("tags")),
    art: form.get("art"),
    tone: form.get("tone"),
    read_time: form.get("readTime"),
    featured: form.get("featured") === "on",
    published: form.get("published") === "on",
    published_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("posts").insert(payload);
  if (error) throw error;
}

async function uploadFile(bucket, file, baseName) {
  if (!file || !file.name) return "";
  const supabase = await getSupabase();
  const extension = file.name.split(".").pop();
  const path = `${baseName}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function mapBeat(beat) {
  return {
    id: beat.id,
    name: beat.name,
    subtitle: beat.subtitle || "",
    bpm: beat.bpm || 0,
    key: beat.key || "Unknown",
    duration: beat.duration || "0:00",
    durationSeconds: beat.duration_seconds || 0,
    previewUrl: beat.preview_url || "",
    coverUrl: beat.cover_url || "",
    price: beat.price || 0,
    tags: beat.tags || [],
    description: beat.description || "",
    published: beat.published,
  };
}

function mapPost(post) {
  return {
    id: post.slug || post.id,
    featured: post.featured,
    category: post.category || "Notes",
    tags: post.tags || [],
    title: post.title,
    excerpt: post.excerpt || "",
    body: post.body || [],
    date: formatDate(post.published_at || post.created_at),
    readTime: post.read_time || "4 MIN",
    art: post.art || "NOTE",
    tone: post.tone || "yellow",
    published: post.published,
  };
}

function splitTags(value) {
  return String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value !== null));
}

function slugify(value) {
  return String(value || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value)).toUpperCase();
}
