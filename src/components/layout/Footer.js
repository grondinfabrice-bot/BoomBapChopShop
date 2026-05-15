export function Footer() {
  const logoSrc = "./src/assets/boom-bap-chop-shop-logo.png";

  return `
    <footer class="site-footer">
      <div class="footer-logo">
        <img src="${logoSrc}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <span>BOOM BAP CHOP SHOP</span>
      </div>
      <p>© 2026 <span>BOOM BAP CHOP SHOP</span> · AUTHENTIC SOUNDS · CLASSIC VIBES · BUILT TO LAST</p>
    </footer>
  `;
}
