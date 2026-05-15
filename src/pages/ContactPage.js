export function ContactPage() {
  return `
    <section class="contact-wrap">
      <h1 class="contact-title">Hit The<span>Shop</span></h1>
      <p class="contact-sub">Collabs · Exclusive licenses · Custom beats</p>
      <div class="contact-form">
        <label class="fg">
          <span class="fl">Artist name</span>
          <input class="fi" type="text" placeholder="Name or alias..." />
        </label>
        <label class="fg">
          <span class="fl">Email</span>
          <input class="fi" type="email" placeholder="email@domain.com" />
        </label>
        <label class="fg">
          <span class="fl">Subject</span>
          <select class="fse">
            <option>Exclusive license</option>
            <option>Custom beat</option>
            <option>Collaboration</option>
            <option>Licensing question</option>
            <option>Other</option>
          </select>
        </label>
        <label class="fg">
          <span class="fl">Message</span>
          <textarea class="fta" placeholder="Tell me about your project, the beat you want, and your release date..."></textarea>
        </label>
        <button class="form-submit" data-contact-send type="button">Send Message</button>
      </div>
      <div class="contact-info">
        <div><span>Email</span><a href="mailto:contact@boombapchopshop.com">contact@boombapchopshop.com</a></div>
        <div><span>Instagram</span><a href="#">@boombapchopshop</a></div>
        <div><span>Reply</span><strong>24-48h business days</strong></div>
        <div><span>YouTube</span><a href="#">youtube.com/@boombapchopshop</a></div>
      </div>
    </section>
  `;
}
