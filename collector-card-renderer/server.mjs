import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
process.env.FONTCONFIG_FILE = join(root, "fonts", "fonts.conf");
process.env.FONTCONFIG_PATH = join(root, "fonts");
const { default: sharp } = await import("sharp");

const port = Number(process.env.COLLECTOR_CARD_RENDERER_PORT || 3032);
const secret = process.env.COLLECTOR_CARD_RENDERER_SECRET || "";
const masterPath = join(root, "assets", "approved-master.png");
const VIEWBOX_WIDTH = 1536;
const VIEWBOX_HEIGHT = 1024;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

if (!secret || secret.length < 32) {
  throw new Error("COLLECTOR_CARD_RENDERER_SECRET must be at least 32 characters.");
}

const master = await readFile(masterPath);
const masterMetadata = await sharp(master).metadata();
const CARD_WIDTH = masterMetadata.width || VIEWBOX_WIDTH;
const CARD_HEIGHT = masterMetadata.height || VIEWBOX_HEIGHT;
const scaleX = CARD_WIDTH / VIEWBOX_WIDTH;
const scaleY = CARD_HEIGHT / VIEWBOX_HEIGHT;

createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (request.method !== "POST" || request.url !== "/render") return sendJson(response, 404, { error: "Not found" });
    if (!isAuthorized(request.headers["x-collector-card-secret"])) return sendJson(response, 401, { error: "Unauthorized" });

    const payload = validatePayload(JSON.parse(await readBody(request)));
    const image = await renderCard(payload);
    response.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": image.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(image);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render collector card.";
    console.error("collector-card-renderer", message);
    sendJson(response, 400, { error: message });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Collector card renderer listening on 127.0.0.1:${port}`);
});

async function renderCard(payload) {
  const cover = await sharp(payload.coverBytes, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(Math.round(697 * scaleX), Math.round(690 * scaleY), { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const overlay = Buffer.from(buildOverlay(payload));
  return sharp(master)
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: cover, left: Math.round(34 * scaleX), top: Math.round(234 * scaleY) },
    ])
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

function buildOverlay({ orderNumber, cardNumber, customerName, item }) {
  const title = cleanText(item.name || "UNTITLED BEAT").toUpperCase();
  const buyer = cleanText(customerName || "LICENSEE").toUpperCase();
  const license = cleanText(item.license || "LICENSE").toUpperCase();
  const details = `${cleanText(item.bpm || "--")} BPM  •  ${cleanText(item.key || "KEY --")}  •  ${cleanText(item.duration || "--:--")}`;
  const titleSize = fitFontSize(title, 110, 22, 646, 0.56);
  const buyerSize = fitFontSize(buyer, 52, 22, 560, 0.54);
  const detailSize = fitFontSize(details, 40, 18, 555, 0.54);
  const crateLabel = `CRATE CARD  •  ${cleanText(cardNumber)}`;
  const orderLabel = `ORDER #${cleanText(orderNumber)}`;
  const crateSize = fitFontSize(crateLabel, 29, 18, 258, 0.54);
  // This column is deliberately capped before the existing divider at x=778.
  // An order number is fixed-length, but keeping this at 20px also leaves room
  // for future prefixes without ever reaching the Cut By column.
  const orderSize = fitFontSize(orderLabel, 17, 14, 265, 0.58);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}">
  <defs>
    <filter id="paper" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="27" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.18 0 0 0 0 0.12 0 0 0 0 0.07 0 0 0 .14 0" />
    </filter>
  </defs>

  <!-- The two dynamic panels cover the complete content area of the master.
       This prevents any original reference pixels leaking at the centre seam. -->
  <rect x="30" y="230" width="705" height="695" fill="#11110f" />

  <!-- Right panel: all dynamic copy is laid out natively at final resolution. -->
  <!-- Start directly against the cover frame: no exposed strip at the centre seam. -->
  <rect x="735" y="230" width="789" height="695" fill="#f1e3ca" />
  <rect x="735" y="230" width="789" height="695" fill="#1b160f" filter="url(#paper)" opacity=".16" />
  <!-- A clean inner edge keeps the intentional black divider crisp even with the paper grain. -->
  <rect x="735" y="230" width="8" height="695" fill="#f1e3ca" />
  <text x="798" y="316" fill="#b71f17" font-family="Bebas Neue, Impact, sans-serif" font-size="${titleSize}" letter-spacing="1">${escapeXml(title)}</text>
  <line x1="792" y1="346" x2="1506" y2="346" stroke="#bd2118" stroke-width="4" />
  <circle cx="792" cy="346" r="6" fill="#bd2118" /><circle cx="1506" cy="346" r="6" fill="#bd2118" />
  <rect x="885" y="363" width="496" height="52" fill="#0c0c0a" />
  <text x="1133" y="401" text-anchor="middle" fill="#f4e8d0" font-family="Oswald, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="2">BEAT LICENSE CARD</text>

  <!-- Three equal metadata bands share one icon axis and one text axis. -->
  <circle cx="835" cy="520" r="52" fill="#bd2118" /><rect x="807" y="493" width="56" height="49" rx="4" fill="none" stroke="#f4e8d0" stroke-width="5" /><circle cx="826" cy="509" r="8" fill="#f4e8d0" /><path d="M813 533c5-12 20-12 26 0" fill="none" stroke="#f4e8d0" stroke-width="5" /><line x1="844" y1="508" x2="857" y2="508" stroke="#f4e8d0" stroke-width="4" /><line x1="844" y1="520" x2="857" y2="520" stroke="#f4e8d0" stroke-width="4" />
  <text x="910" y="496" fill="#bd2118" font-family="Oswald, Arial, sans-serif" font-size="31" font-weight="700">LICENSED TO</text>
  <text x="910" y="565" fill="#11110f" font-family="Bebas Neue, Impact, sans-serif" font-size="${buyerSize}" letter-spacing=".5">${escapeXml(buyer)}</text>
  <line x1="788" y1="596" x2="1508" y2="596" stroke="#171510" stroke-width="2" />

  <circle cx="835" cy="650" r="52" fill="#bd2118" /><path d="M833 618v50c-14-9-28 0-28 14 0 14 19 18 28 7 4-5 3-11 3-28v-28l32-9v-14z" fill="#f4e8d0" />
  <text x="910" y="629" fill="#bd2118" font-family="Oswald, Arial, sans-serif" font-size="31" font-weight="700">${escapeXml(license)}</text>
  <text x="910" y="683" fill="#11110f" font-family="Oswald, Arial, sans-serif" font-size="${detailSize}" font-weight="600" letter-spacing="1">${escapeXml(details)}</text>
  <line x1="788" y1="710" x2="1508" y2="710" stroke="#171510" stroke-width="2" />

  <circle cx="835" cy="780" r="52" fill="#4c4e22" /><path d="M835 745l29 17v34l-29 17-29-17v-34zM835 745v34m29-17l-29 17-29-17" fill="none" stroke="#f4e8d0" stroke-width="5" />
  <text x="910" y="765" fill="#bd2118" font-family="Oswald, Arial, sans-serif" font-size="31" font-weight="700">OFFICIALLY LICENSED</text>
  <text x="910" y="804" fill="#11110f" font-family="Oswald, Arial, sans-serif" font-size="25">This beat is officially part of your record collection.</text>
  <path d="M792 895h716" stroke="#bd2118" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" />

  <!-- Only the example footer fields are masked; the reference waveform stays intact. -->
  <rect x="160" y="932" width="276" height="55" fill="#0c0c0a" />
  <rect x="456" y="932" width="315" height="55" fill="#0c0c0a" />
  <rect x="804" y="932" width="402" height="55" fill="#0c0c0a" />
  <text x="176" y="972" fill="#f4e8d0" font-family="Oswald, Arial, sans-serif" font-size="${crateSize}" font-weight="700" letter-spacing="1">${escapeXml(crateLabel)}</text>
  <text x="477" y="972" fill="#f4e8d0" font-family="Oswald, Arial, sans-serif" font-size="${orderSize}" font-weight="700" letter-spacing="1">${escapeXml(orderLabel)}</text>
  <text x="820" y="972" fill="#f4e8d0" font-family="Oswald, Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="1">CUT BY · BBCS</text>
</svg>`;
}

function validatePayload(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid renderer payload.");
  const cover = value.cover;
  if (!cover || typeof cover.base64 !== "string" || !["image/png", "image/jpeg", "image/webp"].includes(cover.contentType)) {
    throw new Error("A PNG, JPG or WebP cover is required.");
  }
  const coverBytes = Buffer.from(cover.base64, "base64");
  if (!coverBytes.length || coverBytes.length > 8 * 1024 * 1024) throw new Error("Cover image is empty or too large.");
  return {
    orderNumber: cleanText(value.orderNumber, 80),
    cardNumber: cleanText(value.cardNumber, 12),
    customerName: cleanText(value.customerName, 90),
    item: {
      name: cleanText(value.item?.name, 90),
      license: cleanText(value.item?.license, 40),
      bpm: cleanText(value.item?.bpm, 16),
      key: cleanText(value.item?.key, 16),
      duration: cleanText(value.item?.duration, 16),
    },
    coverBytes,
  };
}

function cleanText(value, limit = 120) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}

function fitFontSize(value, preferred, minimum, maxWidth, averageCharacterWidth) {
  return Math.max(minimum, Math.min(preferred, Math.floor(maxWidth / Math.max(1, value.length * averageCharacterWidth))));
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function isAuthorized(value) {
  if (typeof value !== "string") return false;
  const actual = Buffer.from(value);
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        request.destroy();
        reject(new Error("Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}
