export function ThanksPage(state) {
  return `
    <section class="thanks-wrap">
      <img class="thanks-logo-mark" src="./src/assets/boom-bap-chop-shop-logo.png?v=2" alt="BOOM BAP CHOP SHOP" />
      <p class="thanks-eyebrow">Payment confirmed</p>
      <h1 class="thanks-title">Respect<span>For the support</span></h1>
      <p class="thanks-sub">Your purchase is confirmed. Your download link is on the way to your inbox.</p>
      <div class="thanks-email-box">
        <span>Link sent to</span>
        <strong>${state.checkoutEmail || "-"}</strong>
      </div>
      <div class="thanks-steps">
        <article><span>01</span><h2>Check your mail</h2><p>An email with your secure download link has been sent.</p></article>
        <article><span>02</span><h2>Download</h2><p>Grab your files. The link stays active for 72h.</p></article>
        <article><span>03</span><h2>Create</h2><p>Drop the stems in your DAW, write the verse, and make the record.</p></article>
      </div>
      <button class="btn-back" data-route="home" type="button">Back to beats</button>
    </section>
  `;
}
