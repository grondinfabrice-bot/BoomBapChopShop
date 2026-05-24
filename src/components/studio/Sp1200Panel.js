export function Sp1200Panel(state) {
  const beats = state.beats;
  const current = beats.find((beat) => beat.id === state.currentTrackId);
  const display = current
    ? [`NOW PLAYING`, current.name, `${current.bpm} BPM · ${current.key}`]
    : [`BOOM BAP CHOP SHOP`, `CAT LOADED: ${beats.length} TRACKS`, `STATUS: READY`];

  return `
    <section class="sp1200-graphic" aria-label="Controleur SP-1200">
      <div class="sp-display">
        ${display.map((line) => `&gt; ${line}`).join("<br>")}_ 
      </div>
      <div class="sp-pads">
        ${beats.map((beat) => {
          const active = beat.id === state.currentTrackId;
          const pulseClass = active && state.isPlaying ? "is-playing" : active ? "is-active" : "";
          const pulseSpeed = `${(60 / beat.bpm).toFixed(3)}s`;
          return `<button class="sp-pad ${pulseClass}" data-sp-pad="${beat.id}" style="--pad-bpm: ${pulseSpeed}" type="button" aria-label="${beat.name}"></button>`;
        }).join("")}
      </div>
      <div class="sp-label-row">
        <span>Pitch</span>
        <div class="sp-knobs"><i></i><i></i><i></i></div>
        <span>Tune / Filter / Vol</span>
      </div>
      <div class="vertical-tag">Dusty beats · heavy drums · sharp chops</div>
    </section>
  `;
}
