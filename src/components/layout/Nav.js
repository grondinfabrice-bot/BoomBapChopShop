export function Nav(state) {
  const count = state.cart.length;
  const logoSrc = "./src/assets/boom-bap-chop-shop-logo.png";

  return `
    <nav class="site-nav" aria-label="Navigation principale">
      <button class="nav-logo" data-route="home" type="button" aria-label="BOOM BAP CHOP SHOP home">
        <img class="logo-mark" src="${logoSrc}" alt="" aria-hidden="true" decoding="async" />
        <span class="logo-text">BOOM BAP<span>CHOP SHOP</span></span>
      </button>
      <div class="nav-links">
        <button data-catalogue type="button">BEATS</button>
        <button data-scroll="#services" type="button">MIX / MASTERING</button>
        <button data-route="licensing" type="button">LICENSING</button>
        <button data-route="about" type="button">ABOUT</button>
        <button data-route="blog" type="button">CRATE NOTES</button>
      </div>
      <div class="nav-right">
        <button class="icon-btn" data-catalogue type="button" aria-label="Search beats">⌕</button>
        <button class="icon-btn" data-route="contact" type="button" aria-label="Account and contact">○</button>
        <button class="cart-btn" data-cart-open type="button">
          <span class="cart-icon" aria-hidden="true">▱</span>
          <span>Cart</span>
          <span class="cart-badge ${count ? "" : "hidden"}">${count}</span>
        </button>
      </div>
    </nav>
  `;
}
