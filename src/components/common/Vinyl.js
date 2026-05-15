export function Vinyl({ size = "md", paused = false, label = "" } = {}) {
  return `
    <div class="vinyl vinyl-${size} ${paused ? "spin-paused" : ""}" aria-hidden="true">
      ${label ? `<span>${label}</span>` : ""}
    </div>
  `;
}
