export function Toast(message, state = {}) {
  return `<div class="toast ${message ? "show" : ""} ${state.cartOpen ? "cart-open" : ""}" role="status">${message || ""}</div>`;
}
