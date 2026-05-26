import { money } from "../utils/format.js";

export function CheckoutPage(state) {
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const hasService = state.cart.some((item) => item.type === "service");
  const contractLinks = state.cart
    .filter((item) => item.contractUrl)
    .map((item) => `<a href="${item.contractUrl}" target="_blank" rel="noreferrer">${item.license}</a>`)
    .join(" · ");

  return `
    <section class="checkout-wrap">
      <h1 class="checkout-title">Check<span>Out</span></h1>
      <p class="checkout-sub">Secure checkout · Instant delivery</p>
      <div class="order-summary">
        <h2>Order summary</h2>
        ${state.cart.map((item) => `
          <div class="os-line">
            <span>
              ${item.name} · ${item.license}
              ${item.serviceFor ? `<small>For: ${item.serviceFor}</small>` : ""}
              <small>${(item.includes || []).slice(0, 2).join(" · ")}</small>
            </span>
            <span>${money(item.price)}</span>
          </div>
        `).join("")}
        <div class="os-total"><span>Total</span><strong>${money(total)}</strong></div>
      </div>
      <div class="checkout-license-note">
        <h2>You will receive</h2>
        <ul>
          <li>${hasService ? "Mix + mastering order details and file preparation instructions" : "Audio files matching each selected license"}</li>
          <li>${hasService ? "A clear follow-up to send vocal stems, references, and release notes" : "License agreement summary and final contract document"}</li>
          <li>${hasService ? "Final WAV + MP3 exports after the session is completed" : "Instant download link after payment"}</li>
          <li>Receipt sent to your email</li>
        </ul>
      </div>
      <div class="cgrid">
        <label class="fg"><span class="fl">First name</span><input class="fi" data-first-name type="text" placeholder="Jay" /></label>
        <label class="fg"><span class="fl">Last name</span><input class="fi" data-last-name type="text" placeholder="Z" /></label>
        <label class="fg full"><span class="fl">Email</span><input class="fi" data-email type="text" inputmode="email" placeholder="contact@example.com" /></label>
      </div>
      <div class="cdivider">Payment</div>
      <div class="stripe-handoff">
        <div>
          <span>Secure Stripe checkout</span>
          <strong>Card details are entered on Stripe's encrypted payment page.</strong>
          <p>After payment, you will return here and receive your delivery email automatically.</p>
        </div>
        <div class="card-icons" aria-label="Accepted payment methods"><span>VISA</span><span>MC</span><span>AMEX</span></div>
      </div>
      <label class="checkout-accept">
        <input data-license-accept type="checkbox" />
        <span>
          I have read and accept the license agreement${contractLinks ? ` (${contractLinks})` : ""} applicable to this order. I understand each beat license covers one final song,
          does not transfer ownership of the instrumental, and must not be used to block the producer or other valid licensees through Content ID.
        </span>
      </label>
      <button class="btn-pay" data-pay type="button">Continue to secure payment</button>
      <p class="pay-secure">Payment handled by Stripe. Card data is never stored by BOOM BAP CHOP SHOP.</p>
    </section>
  `;
}
