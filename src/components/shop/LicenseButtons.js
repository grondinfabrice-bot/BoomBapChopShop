export function LicenseButtons(beat) {
  return `
    <div class="buy-row">
      <button class="license-btn wav" data-license-open="${beat.storeBeatId || beat.id}" type="button">Choose License</button>
      <button class="license-btn basic" data-route="licensing" type="button">Read licensing info</button>
    </div>
  `;
}
