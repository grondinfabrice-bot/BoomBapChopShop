export function Waveform(progress = 0, attr = "") {
  const bars = Array.from({ length: 64 }, (_, index) => {
    const center = Math.abs(index - 32) / 32;
    const height = 24 + ((index * 37) % 58) * (1 - center * 0.25);
    const played = index / 64 <= progress ? "played" : "";
    return `<span class="wbar ${played}" style="height:${height}%"></span>`;
  }).join("");

  return `
    <div class="player-waveform" ${attr}>
      <div class="player-progress" style="width:${progress * 100}%"></div>
      <div class="waveform-bars">${bars}</div>
    </div>
  `;
}
