export function Footer() {
  const logoSrc = "./src/assets/boom-bap-chop-shop-logo.png";

  return `
    <footer class="site-footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-logo">
            <img src="${logoSrc}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
            <span>BOOM BAP CHOP SHOP</span>
          </div>
          <p>Rare samples. Heavy drums. Release-ready sound for artists who care about feel.</p>
        </div>
        <nav class="footer-block" aria-label="Footer navigation">
          <span>Navigate</span>
          <button data-catalogue type="button">Beats</button>
          <button data-scroll="#services" type="button">Mix / Mastering</button>
          <button data-route="licensing" type="button">Licensing</button>
          <button data-route="about" type="button">About</button>
          <button data-route="blog" type="button">Crate Notes</button>
        </nav>
        <div class="footer-block">
          <span>Services</span>
          <button data-scroll="#services" type="button">Mix + Mastering</button>
          <button data-catalogue type="button">Beat Licenses</button>
          <button data-route="contact" type="button">Custom Request</button>
          <small>Instant delivery · Final files · Clear workflow</small>
        </div>
        <form class="footer-newsletter" data-newsletter>
          <span>Join the Chop List</span>
          <p>New beats, crate notes, and studio offers. No spam.</p>
          <div>
            <input data-newsletter-email type="email" placeholder="Email address" aria-label="Email address" />
            <button type="submit">Subscribe</button>
          </div>
        </form>
      </div>
      <p class="footer-bottom">© 2026 <span>BOOM BAP CHOP SHOP</span> · AUTHENTIC SOUNDS · CLASSIC VIBES · BUILT TO LAST</p>
    </footer>
  `;
}
