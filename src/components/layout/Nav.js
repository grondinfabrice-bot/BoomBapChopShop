export function Nav(state) {
  const count = state.cart.length;
  const logoSrc = "./src/assets/boom-bap-chop-shop-logo.png?v=2";
  const searchIcon = `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="5.5"></circle>
      <path d="m15.1 15.1 4.15 4.15"></path>
    </svg>
  `;
  const contactIcon = `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.75 7.25h14.5v9.5H4.75z"></path>
      <path d="m5.5 8 6.5 5 6.5-5"></path>
    </svg>
  `;
  const accountIcon = `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25"></circle>
      <path d="M5.75 19.25c.85-3.4 3-5.1 6.25-5.1s5.4 1.7 6.25 5.1"></path>
    </svg>
  `;
  const cartIcon = `
    <svg class="nav-icon cart-crate-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.25 8.25h13.5l-1.45 9.5H6.7z"></path>
      <path d="M8 8.25 9.5 5.5h5l1.5 2.75"></path>
      <path d="M8.4 11.5h7.2"></path>
      <path d="M8.85 14.5h6.3"></path>
    </svg>
  `;

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
        <button class="icon-btn" data-catalogue type="button" aria-label="Search beats">${searchIcon}</button>
        <button class="icon-btn" data-route="contact" type="button" aria-label="Contact">${contactIcon}</button>
        <button class="icon-btn account-nav-btn ${state.customerSession ? "active" : ""}" data-route="account" type="button" aria-label="My account">${accountIcon}</button>
        <button class="cart-btn" data-cart-open type="button">
          <span class="cart-icon" aria-hidden="true">${cartIcon}</span>
          <span>Cart</span>
          <span class="cart-badge ${count ? "" : "hidden"}">${count}</span>
        </button>
      </div>
    </nav>
  `;
}
