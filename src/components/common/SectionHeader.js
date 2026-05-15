export function SectionHeader(title, accent, subtitle = "") {
  return `
    <div class="section-header">
      <h2 class="section-title">${title} <span>${accent}</span></h2>
      <div class="section-line" aria-hidden="true"></div>
      ${subtitle ? `<div class="section-subtitle">${subtitle}</div>` : ""}
    </div>
  `;
}
