import { upsells } from "../data/content.js?v=5";
import { money, time } from "../utils/format.js";

export function UpsellPage(state) {
  const hasMultipleBeats = new Set(state.cart.map((item) => item.name)).size > 1;

  return `
    <section class="upsell-wrap">
      <header class="upsell-hero">
        <p>Before checkout</p>
        <h1>Need It<span>Release Ready?</span></h1>
        <small>${hasMultipleBeats ? "Planning to record on these beats? Add studio support before payment." : "Buying a beat? Add mix/mastering support for the final song."}</small>
        <div class="upsell-timer">Offer expires in <strong>${time(state.upsellSeconds)}</strong></div>
      </header>
      <div class="cart-upgrade-note">
        Optional studio service. Your beat licenses stay exactly as selected.
      </div>
      <div class="upsell-cards">
        ${upsells.map(Card).join("")}
      </div>
      <button class="upsell-skip" data-skip-upsell type="button">No thanks, continue to checkout</button>
    </section>
  `;
}

function Card(offer) {
  return `
    <article class="upsell-card ${offer.highlighted ? "featured" : ""}">
      ${offer.highlighted ? `<span class="popular">Popular</span>` : ""}
      <h2>${offer.name}</h2>
      <div class="uc-price">${money(offer.price)} <span>${money(offer.oldPrice)}</span></div>
      <p>${offer.description}</p>
      <ul>
        ${offer.features.map((feature) => `<li>${feature}</li>`).join("")}
      </ul>
      <button class="btn-up ${offer.highlighted ? "primary" : "outline"}" data-upsell data-name="${offer.name}" data-price="${offer.price}" type="button">
        Add to cart
      </button>
    </article>
  `;
}
