export function Vinyl({ size = "md", paused = false, label = "", imageUrl = "" } = {}) {
  const resolvedImageUrl = imageUrl.replace(/^\.\//, "/");
  const imageStyle = imageUrl ? ` style="--vinyl-photo: url('${resolvedImageUrl}')"` : "";
  const imageClass = imageUrl ? "vinyl-picture" : "";

  return `
    <div class="vinyl vinyl-${size} ${imageClass} ${paused ? "spin-paused" : ""}"${imageStyle} aria-hidden="true">
      ${label ? `<span>${label}</span>` : ""}
    </div>
  `;
}
