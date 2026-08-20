import { createServer } from "node:http";
import { createHash, createHmac, createCipheriv, randomBytes, pbkdf2Sync } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3021);
const allowedDays = new Set([7, 30, 90]);
const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

function createUmamiToken(userId, appSecret) {
  const secretHash = createHash("sha512").update(appSecret).digest("hex");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const signature = createHmac("sha256", secretHash).update(`${header}.${payload}`).digest("base64url");
  const jwt = `${header}.${payload}.${signature}`;
  const salt = randomBytes(64);
  const iv = randomBytes(16);
  const key = pbkdf2Sync(secretHash, salt, 10_000, 32, "sha512");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(jwt, "utf8"), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

async function fetchUmami(path, token, apiUrl) {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${path}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Umami ${response.status}`);
  return response.json();
}

async function dashboardData(days) {
  const { UMAMI_API_URL: apiUrl, UMAMI_WEBSITE_ID: websiteId, UMAMI_API_CLIENT_USER_ID: userId, UMAMI_API_CLIENT_SECRET: secret } = process.env;
  if (!apiUrl || !websiteId || !userId || !secret) throw new Error("Dashboard non configuré");
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;
  const period = `startAt=${startAt}&endAt=${endAt}`;
  const token = createUmamiToken(userId, secret);
  const [active, realtime, stats, pageviews, countries, referrers, devices, paths, events] = await Promise.all([
    fetchUmami(`websites/${websiteId}/active`, token, apiUrl),
    fetchUmami(`realtime/${websiteId}`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/stats?${period}`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/pageviews?${period}&unit=day&timezone=Indian%2FReunion`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/metrics?${period}&type=country&limit=10`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/metrics?${period}&type=referrer&limit=10`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/metrics?${period}&type=device&limit=10`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/metrics?${period}&type=path&limit=10`, token, apiUrl),
    fetchUmami(`websites/${websiteId}/metrics?${period}&type=event&limit=20`, token, apiUrl),
  ]);
  return { generatedAt: new Date().toISOString(), days, active, realtime, stats, pageviews, countries, referrers, devices, paths, events };
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) return response.writeHead(404).end("Not found");
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream", "cache-control": "no-cache" });
    response.end(body);
  } catch { response.writeHead(404).end("Not found"); }
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET") return response.writeHead(405).end("Method not allowed");
  const requestUrl = new URL(request.url, "http://localhost");
  if (requestUrl.pathname === "/api/dashboard") {
    const requestedDays = Number(requestUrl.searchParams.get("days"));
    const days = allowedDays.has(requestedDays) ? requestedDays : 30;
    try {
      const data = await dashboardData(days);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" });
      response.end(JSON.stringify(data));
    } catch (error) {
      console.error(error);
      response.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" });
      response.end(JSON.stringify({ error: "Les statistiques sont momentanément indisponibles." }));
    }
    return;
  }
  await serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => console.log(`BOOM BAP analytics dashboard listening on 127.0.0.1:${port}`));
