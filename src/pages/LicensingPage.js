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

      <section class="license-project-guide" aria-label="Choose a license by project type">
        <div class="license-project-head">
          <span>Pick by project</span>
          <h2>Start with the release, then check the terms.</h2>
        </div>
        <div class="license-project-grid">
          <article>
            ${ProjectIcon("demo")}
            <div>
              <strong>Demo / Freestyle</strong>
              <h3>MP3 Lease</h3>
              <p>Test a song idea, post a freestyle, or send a clean draft around.</p>
            </div>
          </article>
          <article>
            ${ProjectIcon("single")}
            <div>
              <strong>Serious Single</strong>
              <h3>WAV Lease</h3>
              <p>Release properly on streaming, YouTube, socials, and promo channels.</p>
            </div>
          </article>
          <article>
            ${ProjectIcon("exclusive")}
            <div>
              <strong>Official Release</strong>
              <h3>Exclusive</h3>
              <p>Keep the beat for your project only and remove it from future licensing.</p>
            </div>
          </article>
        </div>
      </section>

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

function ProjectIcon(type) {
  const icons = {
    demo: `
      <svg viewBox="0 0 48 48" role="img" focusable="false">
        <path d="M10 31h4v6h-4z" />
        <path d="M18 24h4v13h-4z" />
        <path d="M26 28h4v9h-4z" />
        <path d="M34 18h4v19h-4z" />
        <path d="M8 39h32" />
      </svg>
    `,
    single: `
      <svg viewBox="0 0 48 48" role="img" focusable="false">
        <path d="M15 8h15l6 6v26H15z" />
        <path d="M30 8v7h6" />
        <circle cx="29" cy="30" r="6" />
        <circle cx="29" cy="30" r="1.8" />
      </svg>
    `,
    exclusive: `
      <svg viewBox="0 0 48 48" role="img" focusable="false">
        <rect x="12" y="21" width="24" height="18" rx="2" />
        <path d="M17 21v-5a7 7 0 0 1 14 0v5" />
        <path d="M24 28v5" />
      </svg>
    `,
  };

  return `<span class="license-project-icon ${type}" aria-hidden="true">${icons[type]}</span>`;
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
