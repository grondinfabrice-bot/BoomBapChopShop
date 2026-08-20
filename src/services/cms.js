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

  const settings = await loadSettingsSafe(supabase);

  if (beatsResult.error) throw beatsResult.error;
  if (postsResult.error) throw postsResult.error;

  return {
    beats: beatsResult.data.map(mapBeat),
    posts: postsResult.data.map(mapPost),
    settings,
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
  if (!supabase) return { beats: [], posts: [], settings: {} };

  const [beatsResult, postsResult, settingsResult] = await Promise.all([
    supabase.from("beats").select("*").order("created_at", { ascending: false }),
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("key,value"),
  ]);

  if (beatsResult.error) throw beatsResult.error;
  if (postsResult.error) throw postsResult.error;
  if (settingsResult.error && !isMissingSettingsTable(settingsResult.error)) throw settingsResult.error;

  return {
    beats: beatsResult.data.map(mapBeat),
    posts: postsResult.data.map(mapPost),
    settings: mapSettings(settingsResult.data || []),
  };
}

export async function saveBeat(form) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const beatId = form.get("id");
  const slug = slugify(form.get("name"));
  const coverUrl = await uploadFile("covers", form.get("cover"), `${slug}-cover`);
  const previewUrl = await uploadFile("previews", form.get("preview"), `${slug}-preview`);
  const deliveryFiles = await buildDeliveryFilesPayload(form, slug, beatId);

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
    stems_available: form.get("stemsAvailable") === "on",
    delivery_files: deliveryFiles,
    published: form.get("published") === "on",
    sort_order: numberOrNull(form.get("sortOrder")),
  });

  const query = beatId
    ? supabase.from("beats").update(payload).eq("id", beatId)
    : supabase.from("beats").insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function savePost(form) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const title = form.get("title");
  const postId = form.get("id");
  const slug = slugify(title);
  const newImageUrl = await uploadFile("blog-images", form.get("image"), `${slug}-cover`);
  let existingPost = null;
  if (postId) {
    const { data, error } = await supabase.from("posts").select("image_url,published_at").eq("id", postId).single();
    if (error) throw error;
    existingPost = data;
  }
  const payload = {
    slug,
    title,
    category: form.get("category"),
    excerpt: form.get("excerpt"),
    body: String(form.get("body") || "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    tags: splitTags(form.get("tags")),
    image_url: newImageUrl || existingPost?.image_url || "",
    art: form.get("art"),
    tone: form.get("tone"),
    read_time: form.get("readTime"),
    featured: form.get("featured") === "on",
    published: form.get("published") === "on",
    published_at: existingPost?.published_at || new Date().toISOString(),
  };

  const query = postId
    ? supabase.from("posts").update(payload).eq("id", postId)
    : supabase.from("posts").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function saveSiteSettings(form) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const tickerText = String(form.get("tickerText") || "").trim();
  const { error } = await supabase.from("site_settings").upsert({
    key: "ticker",
    value: { tickerText },
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveTestFeedback(payload) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured yet.");
  const config = window.BBCS_CONFIG;
  const body = {
    tester_name: emptyToNull(payload.testerName),
    tester_email: emptyToNull(payload.testerEmail),
    device: emptyToNull(payload.device),
    ratings: payload.ratings,
    clicked: emptyToNull(payload.clicked),
    blocked: emptyToNull(payload.blocked),
    unclear_step: emptyToNull(payload.unclearStep),
    trust_notes: emptyToNull(payload.trustNotes),
    bugs: emptyToNull(payload.bugs),
    priority: emptyToNull(payload.priority),
    would_buy: emptyToNull(payload.wouldBuy),
  };

  const response = await fetch(`${config.supabaseUrl}/rest/v1/test_feedback`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await response.text());
}

export async function saveNewsletterSignup(email) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured yet.");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) throw new Error("Enter a valid email.");

  const config = window.BBCS_CONFIG;
  const response = await fetch(`${config.supabaseUrl}/rest/v1/newsletter_subscribers`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      email: normalizedEmail,
      source: "footer",
      page_url: window.location.href,
      user_agent: navigator.userAgent || "",
    }),
  });

  if (response.ok) return { saved: true, duplicate: false };

  const message = await response.text();
  if (response.status === 409 || message.includes("23505") || message.toLowerCase().includes("duplicate")) {
    return { saved: true, duplicate: true };
  }

  throw new Error(message || "Newsletter signup unavailable.");
}

export async function sendContactMessage(payload) {
  if (!isCmsConfigured()) throw new Error("Supabase is not configured yet.");

  const supabase = await getSupabase();
  if (!supabase?.functions) throw new Error("Supabase functions are not available.");

  const { data, error } = await supabase.functions.invoke("send-contact-email", {
    body: {
      artistName: String(payload.artistName || "").trim(),
      email: String(payload.email || "").trim().toLowerCase(),
      subject: String(payload.subject || "").trim(),
      message: String(payload.message || "").trim(),
      website: String(payload.website || "").trim(),
      pageUrl: window.location.href,
    },
  });

  if (error) throw await enrichFunctionError(error);
  return data || { sent: true };
}

async function loadSettingsSafe(supabase) {
  const result = await supabase.from("site_settings").select("key,value");
  if (result.error) {
    if (isMissingSettingsTable(result.error)) return {};
    throw result.error;
  }
  return mapSettings(result.data || []);
}

function isMissingSettingsTable(error) {
  const message = String(error?.message || "");
  return error?.code === "42P01" || error?.code === "PGRST205" || message.includes("site_settings");
}

async function enrichFunctionError(error) {
  const response = error?.context;
  if (!response?.clone) return error;
  try {
    const payload = await response.clone().json();
    const message = typeof payload?.error === "string"
      ? payload.error
      : JSON.stringify(payload?.error || payload);
    const enriched = new Error(message || error.message || "Contact email unavailable.");
    enriched.originalError = error;
    enriched.status = response.status;
    return enriched;
  } catch {
    return error;
  }
}

function mapSettings(rows = []) {
  const settings = {};
  rows.forEach((row) => {
    if (row.key === "ticker") Object.assign(settings, row.value || {});
  });
  return settings;
}

async function uploadFile(bucket, file, baseName) {
  if (!file || !file.name) return "";
  const supabase = await getSupabase();
  const extension = file.name.split(".").pop();
  const path = `${baseName}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function buildDeliveryFilesPayload(form, slug, beatId) {
  const uploads = await Promise.all([
    uploadDeliverable(form.get("deliveryMp3"), `${slug}/mp3-${Date.now()}`, "mp3", "Download MP3"),
    uploadDeliverable(form.get("deliveryWav"), `${slug}/wav-${Date.now()}`, "wav", "Download WAV"),
    uploadDeliverable(form.get("deliveryStems"), `${slug}/stems-${Date.now()}`, "stems", "Download stems"),
  ]);
  const newFiles = uploads.filter(Boolean);
  if (!newFiles.length) return "";
  if (!beatId) return newFiles;

  const supabase = await getSupabase();
  const { data, error } = await supabase.from("beats").select("delivery_files").eq("id", beatId).single();
  if (error) throw error;
  const byFormat = new Map((Array.isArray(data?.delivery_files) ? data.delivery_files : []).map((file) => [file.format, file]));
  newFiles.forEach((file) => byFormat.set(file.format, file));
  return [...byFormat.values()];
}

async function uploadDeliverable(file, basePath, format, label) {
  if (!file || !file.name) return null;
  const supabase = await getSupabase();
  const extension = file.name.split(".").pop();
  const path = `${basePath}.${extension}`;
  const { error } = await supabase.storage.from("deliverables").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return {
    label,
    bucket: "deliverables",
    path,
    filename: file.name,
    format,
  };
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
    stemsAvailable: beat.stems_available !== false,
    deliveryFiles: Array.isArray(beat.delivery_files) ? beat.delivery_files : [],
    published: beat.published,
    sortOrder: beat.sort_order,
    createdAt: beat.created_at || "",
  };
}

function mapPost(post) {
  return {
    id: post.slug || post.id,
    dbId: post.id,
    featured: post.featured,
    category: post.category || "Notes",
    tags: post.tags || [],
    title: post.title,
    imageUrl: post.image_url || "",
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

function emptyToNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
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
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value)).toUpperCase();
}
