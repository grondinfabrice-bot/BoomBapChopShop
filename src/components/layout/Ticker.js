export function Ticker(state = {}) {
  const text = state.siteSettings?.tickerText || "MP3 / WAV / STEMS INSTANT DELIVERY | NEW DROP: SHADOW OF THE SP | REAL SAMPLES. RAW SOUL. TIMELESS BANGERS. SP-1200 MPC3000 LICENSING OPTIONS BUILT FOR ARTISTS";
  const parts = String(text).split("|").map((item) => item.trim()).filter(Boolean);

  return `
    <div class="strip" aria-label="Informations boutique">
      <span class="strip-inner">
        ${parts.map((part, index) => index % 2 ? `<b>${attr(part)}</b>` : attr(part)).join(" ")}
      </span>
    </div>
  `;
}

function attr(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
