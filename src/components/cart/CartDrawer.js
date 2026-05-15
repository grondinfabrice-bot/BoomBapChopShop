import { money } from "../../utils/format.js";

export function CartDrawer(state) {
  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  const items = state.cart.length
    ? state.cart.map(CartItem).join("")
    : `<div class="cart-empty">Your cart is empty</div>`;

  return `
    <div class="cart-overlay ${state.cartOpen ? "open" : ""}" data-cart-overlay>
      <aside class="cart-drawer" aria-label="Cart">
        <header class="cart-header">
          <h2>Cart</h2>
          <button class="cart-close" data-cart-close type="button" aria-label="Close">×</button>
        </header>
        <div class="cart-items-list">${items}</div>
        <footer class="cart-footer">
          <div class="cart-total-row">
            <span>Total</span>
            <strong>${money(total)}</strong>
          </div>
          <button class="btn-checkout" data-checkout type="button">Checkout</button>
          <div class="cart-secure">Secure checkout · Instant delivery</div>
        </footer>
      </aside>
    </div>
  `;
}

function CartItem(item) {
  return `
    <article class="cart-item">
      <div class="ci-vinyl" aria-hidden="true"></div>
      <div>
        <h3>${item.name}</h3>
        <p>${item.license}</p>
        <button data-remove-cart="${item.id}" type="button">Remove</button>
      </div>
      <strong>${money(item.price)}</strong>
    </article>
  `;
}
