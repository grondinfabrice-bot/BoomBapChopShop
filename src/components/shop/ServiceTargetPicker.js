import { money } from "../../utils/format.js";

export function ServiceTargetPicker(state) {
  const offer = state.servicePickerOffer;
  if (!offer) return "";

  const beatTargets = getBeatTargets(state.cart);
  const selectedIds = state.servicePickerSelection?.targetIds || [];
  const customTitle = state.servicePickerSelection?.customTitle || "";

  return `
    <div class="license-picker-overlay open" data-service-overlay>
      <aside class="service-target-picker" aria-label="Assign mix and mastering service">
        <header class="license-picker-head">
          <div>
            <span>Assign service</span>
            <h2>${offer.name}</h2>
          </div>
          <button class="cart-close" data-service-close type="button" aria-label="Close">×</button>
        </header>
        <div class="service-target-note">
          <strong>${money(offer.price)}</strong>
          <p>One mix/master service covers one song. Select every song that needs this service.</p>
        </div>
        <div class="service-target-list">
          ${beatTargets.length ? `
            <span class="service-target-label">Beats in this cart</span>
            ${beatTargets.map((target) => `
              <label class="service-target-option ${target.hasService ? "disabled" : ""}">
                <input
                  type="checkbox"
                  data-service-target-beat
                  value="${target.id}"
                  data-target-name="${target.name}"
                  ${target.hasService ? "disabled" : ""}
                  ${selectedIds.includes(String(target.id)) ? "checked" : ""}
                />
                <span>${target.name}${target.hasService ? " · already assigned" : ""}</span>
              </label>
            `).join("")}
          ` : `
            <div class="service-target-empty">No beat selected yet. Add a track title below.</div>
          `}
        </div>
        <label class="service-target-custom">
          <span>Another song / project</span>
          <input type="text" data-service-custom-title placeholder="Track title or project name..." value="${escapeAttribute(customTitle)}" />
        </label>
        <button class="service-target-add" data-service-target-add type="button">Add service</button>
      </aside>
    </div>
  `;
}

function getBeatTargets(cart) {
  const targets = [];
  const seen = new Set();
  const assigned = new Set(
    cart
      .filter((item) => item.type === "service" && item.serviceTargetType === "beat")
      .map((item) => String(item.serviceTargetId))
  );

  cart
    .filter((item) => item.type !== "service")
    .forEach((item) => {
      const key = item.beatId || item.name;
      if (seen.has(key)) return;
      seen.add(key);
      targets.push({
        id: item.beatId || item.id,
        name: item.name,
        hasService: assigned.has(String(item.beatId || item.id)),
      });
    });

  return targets;
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
