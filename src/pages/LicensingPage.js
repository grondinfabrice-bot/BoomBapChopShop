import { licenseOptions } from "../data/licenses.js?v=3";
import { money } from "../utils/format.js";

export function LicensingPage() {
  return `
    <section class="licensing-page-wrap">
      <header class="licensing-page-hero">
        <span class="about-kicker">Licensing</span>
        <h1>Choose the right license before the cart.</h1>
        <p>
          These summaries explain the practical rules behind each license. The final checkout document
          controls the legal details, but the idea stays simple: one beat license covers one final song.
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
              <p>Write, test, post, or release small while staying under the stream limit.</p>
            </div>
          </article>
          <article>
            ${ProjectIcon("single")}
            <div>
              <strong>Serious Release</strong>
              <h3>WAV + Stems</h3>
              <p>Record vocals, send the track to an engineer, and keep mix control.</p>
            </div>
          </article>
          <article>
            ${ProjectIcon("exclusive")}
            <div>
              <strong>Official Release</strong>
              <h3>Exclusive</h3>
              <p>Reserve the beat for your song and stop any future licenses from being sold.</p>
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
          <div><strong>License</strong><strong>Files</strong><strong>Main use</strong><strong>Status</strong></div>
          ${licenseOptions.map((license) => `
            <div>
              <span>${license.name}</span>
              <span>${license.includes.slice(0, 2).join(" + ")}</span>
              <span>${license.short}</span>
              <span>${license.id === "exclusive" ? "No future licenses" : "Non-exclusive"}</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="license-legal-notes">
        <h2>Important notes</h2>
        <div>
          <article>
            <h3>One song per license</h3>
            <p>Each purchased beat license is for one new final song that adds your vocal, writing, topline, or other original contribution.</p>
          </article>
          <article>
            <h3>Producer rights stay attached</h3>
            <p>A license lets you use the beat, but it does not transfer the instrumental master, producer credit, authorship, or publishing share unless a separate written agreement says so.</p>
          </article>
          <article>
            <h3>Content ID stays clean</h3>
            <p>You can monetize your final song, but you cannot register the beat in a way that blocks the producer or other artists with valid licenses.</p>
          </article>
          <article>
            <h3>Exclusive is not retroactive</h3>
            <p>If a beat was licensed before an exclusive purchase, those older non-exclusive licenses remain valid under their original terms.</p>
          </article>
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
      <a class="license-contract-link" href="${license.contractUrl}" target="_blank" rel="noreferrer">Read contract PDF</a>
    </article>
  `;
}
