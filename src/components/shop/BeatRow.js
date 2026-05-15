import { money } from "../../utils/format.js";
import { Waveform } from "../player/Waveform.js";

export function BeatRow(beat, index, state) {
  const playing = state.currentTrackId === beat.id;
  const tags = beat.tags.slice(0, 4).map((tag) => `<span>${tag}</span>`).join("");
  const titleLines = beat.name.split(" ");

  return `
    <article class="beat-row ${playing ? "playing" : ""}" data-play-track="${beat.id}">
      <div class="beat-num">${playing ? "PLAY" : String(index + 1).padStart(2, "0")}</div>
      <div class="beat-art">
        <div class="beat-cover">
          <span class="beat-cover-title">
            ${titleLines.filter(Boolean).map((line) => `<span>${line}</span>`).join("")}
          </span>
          <img src="./src/assets/boom-bap-chop-shop-logo.png" alt="" aria-hidden="true" loading="lazy" decoding="async" />
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
      <div class="beat-price">${money(beat.price)}</div>
      <button
        class="beat-buy"
        data-add-cart
        data-name="${beat.name}"
        data-license="MP3 Basic"
        data-price="${beat.price}"
        type="button"
      >
        ADD TO CART
      </button>
    </article>
  `;
}
