import { money } from "../../utils/format.js";
import { licenseOptions } from "../../data/licenses.js?v=3";
import { Waveform } from "../player/Waveform.js";

export function BeatRow(beat, index, state) {
  const playing = state.currentTrackId === beat.id;
  const entryPrice = licenseOptions[0].price;
  const tags = beat.tags.map((tag) => `<span>${tag}</span>`).join("");
  const titleLines = beat.name.split(" ");
  const coverImage = beat.coverUrl
    ? `<img class="beat-cover-image" src="${beat.coverUrl}" alt="Cover ${beat.name}" loading="lazy" decoding="async" onerror="this.closest('.beat-cover').classList.remove('has-cover'); this.remove();" />`
    : "";
  const fallbackLogo = beat.coverUrl
    ? ""
    : `<img class="beat-cover-logo" src="./src/assets/boom-bap-chop-shop-logo.png?v=2" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;

  return `
    <article class="beat-row ${playing ? "playing" : ""}" data-play-track="${beat.id}">
      <div class="beat-num">${playing ? "PLAY" : String(index + 1).padStart(2, "0")}</div>
      <div class="beat-art">
        <div class="beat-cover ${beat.coverUrl ? "has-cover" : ""}">
          ${coverImage}
          <span class="beat-cover-title">
            ${titleLines.filter(Boolean).map((line) => `<span>${line}</span>`).join("")}
          </span>
          ${fallbackLogo}
        </div>
        <div class="beat-vinyl" aria-hidden="true"></div>
      </div>
      <div class="beat-info">
        <h3>${beat.name}</h3>
        <p>${beat.subtitle}</p>
        <div class="beat-tags">${tags}</div>
        <div class="beat-wave">${Waveform(playing ? state.trackProgress : 0)}</div>
      </div>
      <div class="beat-meta-stack">
        <span>${beat.bpm} BPM</span>
        <span>KEY ${beat.key}</span>
        <span>${beat.duration}</span>
      </div>
      <div class="beat-price"><span>from</span>${money(entryPrice)}</div>
      <button
        class="beat-buy"
        data-license-open="${beat.id}"
        type="button"
      >
        CHOOSE LICENSE
      </button>
    </article>
  `;
}
