import { money } from "../../utils/format.js";

export function LicenseButtons(beat) {
  return `
    <div class="buy-row">
      ${beat.licenses.map((license) => `
        <button
          class="license-btn ${license.tone}"
          data-add-cart
          data-name="${beat.name}"
          data-license="${license.name}"
          data-price="${license.price}"
          type="button"
        >
          ${license.label} · ${money(license.price)}
        </button>
      `).join("")}
    </div>
  `;
}
