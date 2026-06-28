export function ContactPage(state = {}) {
  const contactSending = state.contactStatus === "sending";
  const contactSent = state.contactStatus === "sent";
  const contactMessage = state.contactMessage || "";
  const contactClass = state.contactStatus ? ` ${state.contactStatus}` : "";

  return `
    <section class="contact-wrap">
      <h1 class="contact-title">Hit The<span>Shop</span></h1>
      <p class="contact-sub">Collabs · Exclusive licenses · Custom beats</p>
      <form class="contact-form${contactSending ? " is-sending" : ""}" data-contact-form>
        <label class="fg">
          <span class="fl">Artist name</span>
          <input class="fi" name="artistName" type="text" autocomplete="name" placeholder="Name or alias..." ${contactSent ? "disabled" : ""} />
        </label>
        <label class="fg">
          <span class="fl">Email</span>
          <input class="fi" name="email" type="email" autocomplete="email" placeholder="email@domain.com" required ${contactSent ? "disabled" : ""} />
        </label>
        <label class="fg">
          <span class="fl">Subject</span>
          <select class="fse" name="subject" ${contactSent ? "disabled" : ""}>
            <option>Exclusive license</option>
            <option>Custom beat</option>
            <option>Collaboration</option>
            <option>Licensing question</option>
            <option>Other</option>
          </select>
        </label>
        <label class="fg">
          <span class="fl">Message</span>
          <textarea class="fta" name="message" placeholder="Tell me about your project, the beat you want, and your release date..." required ${contactSent ? "disabled" : ""}></textarea>
        </label>
        <label class="contact-honeypot" aria-hidden="true" tabindex="-1">
          <span>Website</span>
          <input name="website" type="text" autocomplete="off" tabindex="-1" />
        </label>
        <button class="form-submit" type="submit" ${contactSending || contactSent ? "disabled" : ""}>${contactSending ? "Sending..." : contactSent ? "Message Sent" : "Send Message"}</button>
        ${contactMessage ? `<p class="contact-message${contactClass}" aria-live="polite">${contactMessage}</p>` : ""}
      </form>
      <div class="contact-info">
        <div class="contact-card">
          <span class="contact-icon">@</span>
          <div><span>Email</span><a href="mailto:contact@boombapchopshop.art">contact@boombapchopshop.art</a></div>
        </div>
        <div class="contact-card">
          <span class="contact-icon">IG</span>
          <div><span>Instagram</span><a href="https://instagram.com/boombapchopshop" target="_blank" rel="noreferrer">@boombapchopshop</a></div>
        </div>
        <div class="contact-card">
          <span class="contact-icon">24</span>
          <div><span>Reply</span><strong>24-48h business days</strong></div>
        </div>
        <div class="contact-card">
          <span class="contact-icon">YT</span>
          <div><span>YouTube</span><a href="https://youtube.com/@boombapchopshop" target="_blank" rel="noreferrer">youtube.com/@boombapchopshop</a></div>
        </div>
      </div>
    </section>
  `;
}
