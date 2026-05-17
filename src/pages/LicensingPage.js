import { licenseOptions } from "../data/licenses.js";
import { money } from "../utils/format.js";

export function LicensingPage() {
  return `
    <section class="licensing-page-wrap">
      <header class="licensing-page-hero">
        <span class="about-kicker">Licensing</span>
        <h1>Choose the right license before the cart.</h1>
        <p>
          These terms are placeholder summaries until the final contracts are added. They are designed
          to help artists understand the practical difference between each option before checkout.
        </p>
      </header>

      <div class="license-detail-grid">
        ${licenseOptions.map(LicenseCard).join("")}
      </div>

      <section class="license-compare">
        <h2>Quick comparison</h2>
        <div class="license-table">
          <div><strong>License</strong><strong>Files</strong><strong>Best for</strong><strong>Availability</strong></div>
          ${licenseOptions.map((license) => `
            <div>
              <span>${license.name}</span>
              <span>${license.includes.slice(0, 2).join(" + ")}</span>
              <span>${license.short}</span>
              <span>${license.id === "exclusive" ? "One artist only" : "Non-exclusive"}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function LicenseCard(license) {
  return `
    <article class="license-detail-card ${license.tone}">
      <div>
        <span>${license.label}</span>
        <h2>${license.name}</h2>
        <strong>${money(license.price)}</strong>
        <p>${license.short}</p>
      </div>
      <div>
        <h3>Included</h3>
        <ul>${license.includes.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div>
        <h3>Usage</h3>
        <ul>${license.allowed.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div>
        <h3>Limits</h3>
        <ul>${license.limits.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    </article>
  `;
}
