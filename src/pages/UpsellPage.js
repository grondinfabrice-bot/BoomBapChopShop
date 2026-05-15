import { upsells } from "../data/content.js";
import { money, time } from "../utils/format.js";

export function UpsellPage(state) {
  return `
    <section class="upsell-wrap">
      <header class="upsell-hero">
        <p>One-time studio upgrade</p>
        <h1>Upgrade<span>Your Pack</span></h1>
        <small>These prices are only available before checkout</small>
        <div class="upsell-timer">Offer expires in <strong>${time(state.upsellSeconds)}</strong></div>
      </header>
      <div class="upsell-cards">
        ${upsells.map(Card).join("")}
      </div>
      <button class="upsell-skip" data-skip-upsell type="button">No thanks, continue without upgrade</button>
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
