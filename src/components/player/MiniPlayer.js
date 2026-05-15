import { beats } from "../../data/beats.js";
import { time } from "../../utils/format.js";
import { Vinyl } from "../common/Vinyl.js";

export function MiniPlayer(state) {
  const track = beats.find((beat) => beat.id === state.currentTrackId);
  if (!track) return "";

  return `
    <aside class="mini-player visible" aria-label="Lecteur audio">
      <div class="mini-player-info">
        ${Vinyl({ size: "xs", paused: !state.isPlaying })}
        <div>
          <div class="mini-title">${track.name}</div>
          <div class="mini-bpm-lbl">${track.bpm} BPM</div>
        </div>
      </div>
      <div class="mini-controls">
        <button class="mini-btn" data-prev type="button" aria-label="Titre precedent">◀◀</button>
        <button class="mini-btn active" data-mini-toggle type="button" aria-label="Lecture pause">${state.isPlaying ? "Pause" : "Play"}</button>
        <button class="mini-btn" data-next type="button" aria-label="Titre suivant">▶▶</button>
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
