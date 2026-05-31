import fs from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("../", import.meta.url);
const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = "https://lmospzejrynbwsuaravd.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKETS = {
  covers: { public: true },
  previews: { public: true },
  blog: { public: true },
};

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

if (!SERVICE_KEY) {
  throw new Error("Set SUPABASE_SERVICE_ROLE_KEY before running this script.");
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const stats = {
  bucketsCreated: 0,
  uploads: 0,
  beatUpdates: 0,
  postUpdates: 0,
  skippedRemoteUrls: 0,
  skippedMissingFiles: 0,
};

await main();

async function main() {
  console.log(APPLY ? "Applying Supabase asset migration..." : "Dry run. Add --apply to upload and update Supabase.");

  for (const [bucket, options] of Object.entries(BUCKETS)) {
    await ensureBucket(bucket, options);
  }

  await migrateBeats();
  await migratePosts();

  console.log(JSON.stringify(stats, null, 2));
}

async function migrateBeats() {
  const beats = await rest("beats?select=id,name,cover_url,preview_url&order=sort_order.asc");

  for (const beat of beats) {
    const patch = {};
    const coverUrl = await migrateAsset(beat.cover_url, "covers");
    const previewUrl = await migrateAsset(beat.preview_url, "previews");

    if (coverUrl && coverUrl !== beat.cover_url) patch.cover_url = coverUrl;
    if (previewUrl && previewUrl !== beat.preview_url) patch.preview_url = previewUrl;

    if (Object.keys(patch).length) {
      stats.beatUpdates += 1;
      console.log(`${APPLY ? "Update" : "Would update"} beat: ${beat.name}`);
      if (APPLY) {
        await rest(`beats?id=eq.${beat.id}`, {
          method: "PATCH",
          body: patch,
          prefer: "return=minimal",
        });
      }
    }
  }
}

async function migratePosts() {
  const posts = await rest("posts?select=id,slug,title,image_url&order=published_at.desc");

  for (const post of posts) {
    const imageUrl = await migrateAsset(post.image_url, "blog");
    if (imageUrl && imageUrl !== post.image_url) {
      stats.postUpdates += 1;
      console.log(`${APPLY ? "Update" : "Would update"} post: ${post.title || post.slug}`);
      if (APPLY) {
        await rest(`posts?id=eq.${post.id}`, {
          method: "PATCH",
          body: { image_url: imageUrl },
          prefer: "return=minimal",
        });
      }
    }
  }
}

async function migrateAsset(currentUrl, bucket) {
  if (!currentUrl) return "";
  if (/^https?:\/\//i.test(currentUrl)) {
    stats.skippedRemoteUrls += 1;
    return currentUrl;
  }

  const localPath = currentUrl.replace(/^\.\//, "");
  const filePath = path.join(ROOT.pathname, localPath);
  const objectPath = path.basename(localPath);

  try {
    await fs.access(filePath);
  } catch {
    stats.skippedMissingFiles += 1;
    console.warn(`Missing local file: ${localPath}`);
    return currentUrl;
  }

  stats.uploads += 1;
  console.log(`${APPLY ? "Upload" : "Would upload"} ${localPath} -> ${bucket}/${objectPath}`);

  if (APPLY) {
    await uploadObject(bucket, objectPath, filePath);
  }

  return publicObjectUrl(bucket, objectPath);
}

async function ensureBucket(bucket, options) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`, { headers });
  if (response.ok) return;
  const errorText = await response.text();
  const bucketIsMissing = response.status === 404 || errorText.toLowerCase().includes("bucket not found");
  if (!bucketIsMissing) {
    throw new Error(`Bucket check failed for ${bucket}: ${response.status} ${errorText}`);
  }

  stats.bucketsCreated += 1;
  console.log(`${APPLY ? "Create" : "Would create"} bucket: ${bucket}`);

  if (!APPLY) return;

  const createResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: options.public,
    }),
  });

  if (!createResponse.ok && createResponse.status !== 409) {
    throw new Error(`Bucket create failed for ${bucket}: ${createResponse.status} ${await createResponse.text()}`);
  }
}

async function uploadObject(bucket, objectPath, filePath) {
  const bytes = await fs.readFile(filePath);
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURIComponent(objectPath)}`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${bucket}/${objectPath}: ${response.status} ${await response.text()}`);
  }
}

async function rest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    method: options.method || "GET",
    headers: {
      ...headers,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`REST request failed ${pathname}: ${response.status} ${await response.text()}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function publicObjectUrl(bucket, objectPath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(objectPath)}`;
}
