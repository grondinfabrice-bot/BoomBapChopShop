export function ThanksPage(state) {
  const order = state.checkoutOrder || "Confirmed";
  const emailLine = state.checkoutEmail
    ? `<strong>${state.checkoutEmail}</strong>`
    : `<strong>Your checkout email</strong>`;
  return `
    <section class="thanks-wrap">
      <div class="thanks-hero">
        <img class="thanks-logo-mark" src="./src/assets/boom-bap-chop-shop-logo.png?v=2" alt="BOOM BAP CHOP SHOP" />
        <div class="thanks-copy">
          <p class="thanks-eyebrow">Payment confirmed</p>
          <h1 class="thanks-title">Respect<span>For the support</span></h1>
          <p class="thanks-sub">Your order is locked in. The shop is preparing your secure links, personalized license contract, and delivery email.</p>
        </div>
      </div>
      <div class="thanks-confirm">
        <div class="thanks-email-box">
          <span>Order number</span>
          <strong>${order}</strong>
        </div>
        <div class="thanks-email-box">
          <span>Delivery sent to</span>
          ${emailLine}
        </div>
      </div>
      <div class="thanks-steps">
        <article><span>01</span><h2>Check your mail</h2><p>Your receipt, beat link and license PDF arrive together after Stripe confirms the payment.</p></article>
        <article><span>02</span><h2>Keep the papers</h2><p>Save the license with your release files. It is your proof for distribution and future admin.</p></article>
        <article><span>03</span><h2>Make the record</h2><p>Drop the beat in the session, write the verse, and let the drums do their job.</p></article>
      </div>
      <div class="thanks-actions">
        <button class="btn-hero primary" data-route="home" type="button">Back to beats</button>
        <button class="btn-hero outline" data-route="contact" type="button">Contact the shop</button>
      </div>
    </section>
  `;
}
