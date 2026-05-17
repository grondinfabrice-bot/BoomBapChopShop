import { beats } from "../../data/beats.js";
import { licenseOptions } from "../../data/licenses.js";
import { money } from "../../utils/format.js";

export function LicensePicker(state) {
  const beat = beats.find((item) => String(item.id) === String(state.licensePickerBeatId));
  if (!beat) return "";

  return `
    <div class="license-picker-overlay open" data-license-overlay>
      <aside class="license-picker" aria-label="Choose license">
        <header class="license-picker-head">
          <div>
            <span>Choose license</span>
            <h2>${beat.name}</h2>
          </div>
          <button class="cart-close" data-license-close type="button" aria-label="Close">×</button>
        </header>
        <div class="license-picker-grid">
          ${licenseOptions.map((license) => `
            <article class="license-option ${license.tone}">
              <div class="license-option-top">
                <span>${license.label}</span>
                <strong>${money(license.price)}</strong>
              </div>
              <h3>${license.name}</h3>
              <p>${license.short}</p>
              <ul>
                ${license.includes.slice(0, 3).map((item) => `<li>${item}</li>`).join("")}
              </ul>
              <button
                class="license-select"
                data-add-license
                data-beat-id="${beat.id}"
                data-name="${beat.name}"
                data-license-id="${license.id}"
                type="button"
              >
                Add ${license.label}
              </button>
            </article>
          `).join("")}
        </div>
        <button class="license-learn-more" data-route="licensing" type="button">Compare all licenses</button>
      </aside>
    </div>
  `;
}
