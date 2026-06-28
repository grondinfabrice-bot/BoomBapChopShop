import { time } from "../../utils/format.js";
import { Vinyl } from "../common/Vinyl.js";

export function MiniPlayer(state) {
  const track = state.beats.find((beat) => beat.id === state.currentTrackId);
  if (!track) return "";

  return `
    <aside class="mini-player visible" aria-label="Audio player">
      <div class="mini-player-info">
        ${Vinyl({ size: "xs", paused: !state.isPlaying })}
        <div>
          <div class="mini-title">${track.name}</div>
          <div class="mini-bpm-lbl">${track.bpm} BPM</div>
        </div>
      </div>
      <div class="mini-controls">
        <button class="mini-btn" data-prev type="button" aria-label="Previous track">◀◀</button>
        <button class="mini-btn" data-restart type="button" aria-label="Restart track">↺</button>
        <button class="mini-btn active" data-mini-toggle type="button" aria-label="Play pause">${state.isPlaying ? "Ⅱ" : "▶"}</button>
        <button class="mini-btn" data-next type="button" aria-label="Next track">▶▶</button>
      </div>
      <div class="mini-progress-wrap">
        <span class="mini-time">${time(track.durationSeconds * state.trackProgress)}</span>
        <div class="mini-progress-bar">
          <div class="mini-progress-fill" style="width:${state.trackProgress * 100}%"></div>
        </div>
        <span class="mini-time">${track.duration}</span>
      </div>
    </aside>
  `;
}
