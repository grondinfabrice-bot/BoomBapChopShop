import { isCmsConfigured } from "../services/cms.js";
import { money } from "../utils/format.js";

export function AccountPage(state) {
  if (!isCmsConfigured()) return AccountSetup();
  if (!state.customerSession) return AccountAuth(state);
  return AccountOrders(state);
}

function AccountAuth(state) {
  const mode = state.accountMode || "signin";
  const isSignup = mode === "signup";
  if (mode === "reset") return AccountReset(state);
  if (mode === "new-password") return AccountNewPassword(state);

  return `
    <section class="account-wrap account-login-wrap">
      <form class="account-login" data-account-auth>
        <span class="featured-kicker">Customer room</span>
        <h1>${isSignup ? "Create Account" : "My Account"}</h1>
        <p>${isSignup ? "Create a customer account to keep track of your purchases." : "Sign in to see your BOOM BAP CHOP SHOP orders."}</p>
        ${state.accountMessage ? `<div class="account-message">${text(state.accountMessage)}</div>` : ""}
        <input name="mode" type="hidden" value="${isSignup ? "signup" : "signin"}" />
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label>
        <label>Password<input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" required minlength="6" placeholder="Minimum 6 characters" /></label>
        <button class="account-submit" type="submit">${isSignup ? "Create account" : "Sign in"}</button>
        <button class="account-ghost" data-account-mode="${isSignup ? "signin" : "signup"}" type="button">
          ${isSignup ? "I already have an account" : "Create an account"}
        </button>
        ${isSignup ? "" : `<button class="account-link" data-account-mode="reset" type="button">Forgot password?</button>`}
      </form>
    </section>
  `;
}

function AccountReset(state) {
  return `
    <section class="account-wrap account-login-wrap">
      <form class="account-login" data-account-reset>
        <span class="featured-kicker">Customer room</span>
        <h1>Reset Password</h1>
        <p>Enter your account email and Supabase will send a secure reset link.</p>
        ${state.accountMessage ? `<div class="account-message">${text(state.accountMessage)}</div>` : ""}
        <label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label>
        <button class="account-submit" type="submit">Send reset link</button>
        <button class="account-ghost" data-account-mode="signin" type="button">Back to sign in</button>
      </form>
    </section>
  `;
}

function AccountNewPassword(state) {
  return `
    <section class="account-wrap account-login-wrap">
      <form class="account-login" data-account-new-password>
        <span class="featured-kicker">Customer room</span>
        <h1>New Password</h1>
        <p>Choose a new password for your BOOM BAP CHOP SHOP account.</p>
        ${state.accountMessage ? `<div class="account-message">${text(state.accountMessage)}</div>` : ""}
        <label>New password<input name="password" type="password" autocomplete="new-password" required minlength="6" placeholder="Minimum 6 characters" /></label>
        <label>Confirm password<input name="passwordConfirm" type="password" autocomplete="new-password" required minlength="6" placeholder="Repeat password" /></label>
        <button class="account-submit" type="submit">Update password</button>
        <button class="account-ghost" data-account-mode="signin" type="button">Back to sign in</button>
      </form>
    </section>
  `;
}

function AccountOrders(state) {
  const email = state.customerSession?.user?.email || "";
  const orders = state.customerOrders || [];
  return `
    <section class="account-wrap">
      <div class="account-head">
        <div>
          <span class="featured-kicker">Customer room</span>
          <h1>My Orders</h1>
          <p>Signed in as <strong>${text(email)}</strong>. Your purchases and delivery details stay tied to this email.</p>
        </div>
        <button class="account-ghost" data-account-logout type="button">Sign out</button>
      </div>
      ${state.accountMessage ? `<div class="account-message">${text(state.accountMessage)}</div>` : ""}
      <div class="account-list">
        <h2>Purchase history</h2>
        ${orders.length ? orders.map(OrderCard).join("") : EmptyOrders()}
      </div>
    </section>
  `;
}

function OrderCard(order) {
  const discountAmount = Number(order.discount?.discountAmount || 0);
  const created = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US") : "Recent";
  return `
    <article class="account-order">
      <div class="account-order-top">
        <div>
          <span>${text(order.status || "order")}</span>
          <strong>${text(order.orderNumber)}</strong>
        </div>
        <div>
          <small>${created}</small>
          <strong>${money(order.total)}</strong>
        </div>
      </div>
      <div class="account-order-lines">
        ${(order.items || []).map((item) => `
          <div>
            <span>${text(item.name || "Order item")} · ${text(item.license || "License")}</span>
            <strong>${money(item.price || 0)}</strong>
          </div>
          ${ManualDeliveryNote(item)}
        `).join("")}
        ${discountAmount > 0 ? `<div class="account-discount"><span>${text(order.discount?.code || "Promo")}</span><strong>-${money(discountAmount)}</strong></div>` : ""}
      </div>
      ${DeliveryLinks(order)}
    </article>
  `;
}

function ManualDeliveryNote(item) {
  return item.missingDeliveryFormats?.length
    ? `<p class="account-order-note">Manual delivery pending: ${text(item.missingDeliveryFormats.join(", ").toUpperCase())} will be sent separately.</p>`
    : "";
}

function DeliveryLinks(order) {
  const links = [];
  (order.items || []).forEach((item) => {
    (item.deliveryLinks || []).forEach((link) => {
      if (link.url) links.push(`<a href="${attr(link.url)}" target="_blank" rel="noreferrer">${text(item.name || "Download")} · ${text(link.label || "File")}</a>`);
    });
    if (item.personalizedContractUrl) links.push(`<a href="${attr(item.personalizedContractUrl)}" target="_blank" rel="noreferrer">${text(item.name || "Contract")} · Contract</a>`);
  });
  return links.length
    ? `<div class="account-downloads">${links.join("")}</div>`
    : `<p class="account-order-note">Delivery links are sent by email after payment confirmation. If a link has expired, contact the shop with this order number.</p>`;
}

function EmptyOrders() {
  return `
    <div class="account-empty">
      <strong>No orders found yet.</strong>
      <p>Orders made with this email will appear here after Stripe confirms payment.</p>
    </div>
  `;
}

function AccountSetup() {
  return `
    <section class="account-wrap account-login-wrap">
      <div class="account-login">
        <span class="featured-kicker">Setup needed</span>
        <h1>Connect Supabase</h1>
        <p>Customer accounts need your Supabase URL and anon key in the site config.</p>
      </div>
    </section>
  `;
}

function attr(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function text(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
