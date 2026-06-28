import {
  addCartItem,
  getCurrentTrack,
  getState,
  removeCartItem,
  setContent,
  setState,
  subscribe,
} from "./state/store.js?v=38";
import { Shell } from "./components/Shell.js?v=19";
import { HomePage } from "./pages/HomePage.js?v=25";
import { BlogPage } from "./pages/BlogPage.js?v=8";
import { AboutPage } from "./pages/AboutPage.js?v=2";
import { LicensingPage } from "./pages/LicensingPage.js?v=5";
import { ContactPage } from "./pages/ContactPage.js?v=7";
import { UpsellPage } from "./pages/UpsellPage.js?v=4";
import { CheckoutPage } from "./pages/CheckoutPage.js?v=9";
import { ThanksPage } from "./pages/ThanksPage.js?v=6";
import { AccountPage } from "./pages/AccountPage.js?v=2";
import { AdminPage } from "./pages/AdminPage.js?v=2";
import { TestFeedbackPage } from "./pages/TestFeedbackPage.js?v=3";
import { getFeaturedBeat } from "./utils/featured.js?v=3";
import { getVisibleBeats } from "./utils/catalog.js";
import {
  loadAdminContent,
  loadPublishedContent,
  saveBeat,
  saveNewsletterSignup,
  savePost,
  saveSiteSettings,
  saveTestFeedback,
  sendContactMessage,
  signInAdmin,
  signOutAdmin,
} from "./services/cms.js";
import { createCheckoutSession, validatePromoCode } from "./services/orders.js?v=6";
import {
  getCustomerSession,
  loadCustomerOrders,
  signInCustomer,
  signOutCustomer,
  signUpCustomer,
} from "./services/account.js?v=2";
import { buildCatalogSearchReply, buildChatReply } from "./services/chatbot.js?v=2";
import { askAiChatbot } from "./services/aiChat.js?v=1";
import { serviceOffers } from "./data/content.js?v=5";
import { time } from "./utils/format.js";

let rootNode;
let featuredTimer;
let upsellTimer;
let previousPage;
let motionObserver;
let motionPage = "";
let lastAudioProgressRender = 0;
const revealedMotionKeys = new Set();
const audioPlayer = new Audio();
audioPlayer.preload = "metadata";

const pages = {
  home: HomePage,
  blog: BlogPage,
  about: AboutPage,
  licensing: LicensingPage,
  contact: ContactPage,
  upsell: UpsellPage,
  checkout: CheckoutPage,
  thanks: ThanksPage,
  account: AccountPage,
  admin: AdminPage,
  feedback: TestFeedbackPage,
};

export function App(root) {
  rootNode = root;
  hydrateCheckoutReturn();
  hydrateHashRoute();
  if (window.location.hash === "#admin") setState({ page: "admin" });
  window.addEventListener("hashchange", () => {
    hydrateHashRoute();
  });
  subscribe(handleStateChange);
  render();
  startClock();
  hydrateCms();
}

function hydrateHashRoute() {
  const hash = window.location.hash.replace("#", "");
  if (hash === "admin") route("admin");
  if (hash === "test-feedback") route("feedback");
  if (hash === "account") route("account");
}

function hydrateCheckoutReturn() {
  const params = new URLSearchParams(window.location.search);
  const checkoutStatus = params.get("checkout");
  const order = params.get("order") || "";
  if (checkoutStatus === "success") {
    const savedCheckout = getSavedCheckout(order);
    setState({
      page: "thanks",
      checkoutOrder: order,
      checkoutEmail: savedCheckout.email || "",
      checkoutHasService: Boolean(savedCheckout.hasService),
      cart: [],
      cartOpen: false,
    });
  }
}

function saveCheckoutReturn(orderNumber, email, hasService = false) {
  if (!orderNumber || !email) return;
  try {
    localStorage.setItem(`bbcs_checkout_${orderNumber}`, JSON.stringify({ email, hasService, savedAt: Date.now() }));
  } catch (error) {
    console.warn("Checkout email could not be saved locally.", error);
  }
}

function getSavedCheckout(orderNumber) {
  if (!orderNumber) return {};
  try {
    return JSON.parse(localStorage.getItem(`bbcs_checkout_${orderNumber}`) || "{}");
  } catch {
    return {};
  }
}

function handleStateChange(state, patch = {}) {
  if (isPlaybackProgressPatch(patch)) {
    updatePlaybackProgress(state, patch);
    return;
  }
  render();
}

function isPlaybackProgressPatch(patch) {
  const keys = Object.keys(patch);
  return keys.length === 1 && (keys[0] === "trackProgress" || keys[0] === "featuredProgress");
}

function updatePlaybackProgress(state, patch) {
  if (patch.featuredProgress !== undefined) {
    const featuredBeat = getFeaturedBeat(state);
    const progress = state.featuredProgress;
    rootNode.querySelector(".featured-player .player-progress")?.style.setProperty("width", `${progress * 100}%`);
    rootNode.querySelector(".featured-player .time-display")?.replaceChildren(
      document.createTextNode(`${time(Math.floor(featuredBeat.durationSeconds * progress))} / ${featuredBeat.duration}`)
    );
    updateWaveBars(rootNode.querySelector(".featured-player .player-waveform"), progress);
  }

  if (patch.trackProgress !== undefined) {
    const track = state.beats.find((beat) => beat.id === state.currentTrackId);
    const progress = state.trackProgress;
    rootNode.querySelector(".mini-progress-fill")?.style.setProperty("width", `${progress * 100}%`);
    const miniElapsed = rootNode.querySelector(".mini-progress-wrap .mini-time:first-child");
    if (miniElapsed && track) miniElapsed.textContent = time(track.durationSeconds * progress);
    updateWaveBars(rootNode.querySelector(".beat-row.playing .player-waveform"), progress);
  }
}

function updateWaveBars(waveform, progress) {
  if (!waveform) return;
  waveform.querySelector(".player-progress")?.style.setProperty("width", `${progress * 100}%`);
  waveform.querySelectorAll(".wbar").forEach((bar, index) => {
    bar.classList.toggle("played", index / 64 <= progress);
  });
}

function render() {
  const state = getState();
  const Page = pages[state.page] || HomePage;
  const pageChanged = previousPage !== state.page;
  rootNode.innerHTML = Shell(Page(state), state);
  bindGlobalActions();
  bindPageActions();
  if (pageChanged) {
    resetPageScroll();
  }
  setupPageMotion(state.page, pageChanged);
  previousPage = state.page;
}

function setupPageMotion(page, pageChanged) {
  if (pageChanged && motionPage !== page) {
    revealedMotionKeys.clear();
    motionPage = page;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  motionObserver?.disconnect();

  const selectors = [
    ".featured-label",
    ".hero-copy > *",
    ".featured-info",
    ".sp1200-graphic",
    ".crate-sep",
    ".testimonials-section > *",
    ".testimonial-grid > *",
    ".section-header",
    ".catalogue-toolbar",
    ".filter-row",
    ".playlist-container > *",
    ".shop-info-section > *",
    ".licensing-section > *",
    ".licensing-page-wrap > *",
    ".license-detail-grid > *",
    ".license-compare > *",
    ".license-legal-notes > *",
    ".license-table > *",
    ".blog-wrap > *",
    ".about-wrap > *",
    ".contact-wrap > *",
    ".admin-wrap > *",
    ".checkout-wrap > *",
    ".thanks-wrap > *",
    ".account-wrap > *",
    ".upsell-wrap > *",
  ];

  const items = [...rootNode.querySelectorAll(selectors.join(","))]
    .filter((item) => item.offsetParent !== null);

  motionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.dataset.motionKey) revealedMotionKeys.add(entry.target.dataset.motionKey);
      motionObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });

  items.forEach((item, index) => {
    const key = `${page}:${index}:${item.tagName}:${item.className}`;
    item.dataset.motionKey = key;
    item.style.setProperty("--motion-delay", `${Math.min((index % 5) * 55, 220)}ms`);
    item.classList.add("motion-reveal");

    if (revealedMotionKeys.has(key)) {
      item.classList.add("is-visible");
    } else {
      motionObserver.observe(item);
    }
  });
}

function bindGlobalActions() {
  rootNode.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => route(button.dataset.route));
  });

  rootNode.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ page: "home" });
      setTimeout(() => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" }), 80);
    });
  });

  rootNode.querySelectorAll("[data-catalogue]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ page: "home" });
      setTimeout(() => document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" }), 80);
    });
  });

  rootNode.querySelector("[data-cart-open]")?.addEventListener("click", () => {
    setState({ cartOpen: true });
  });

  rootNode.querySelector("[data-cart-close]")?.addEventListener("click", () => {
    setState({ cartOpen: false });
  });

  rootNode.querySelector("[data-license-close]")?.addEventListener("click", () => {
    setState({ licensePickerBeatId: null });
  });

  rootNode.querySelector("[data-cart-overlay]")?.addEventListener("click", (event) => {
    if (event.target.dataset.cartOverlay !== undefined) setState({ cartOpen: false });
  });

  rootNode.querySelector("[data-license-overlay]")?.addEventListener("click", (event) => {
    if (event.target.dataset.licenseOverlay !== undefined) setState({ licensePickerBeatId: null });
  });

  rootNode.querySelector("[data-service-overlay]")?.addEventListener("click", (event) => {
    if (event.target.dataset.serviceOverlay !== undefined) setState({ servicePickerOffer: null });
  });

  rootNode.querySelector("[data-service-close]")?.addEventListener("click", () => {
    setState({ servicePickerOffer: null });
  });

  rootNode.querySelector("[data-service-target-add]")?.addEventListener("click", () => {
    addSelectedStudioServices();
  });

  rootNode.querySelectorAll("[data-service-target-beat]").forEach((input) => {
    input.addEventListener("change", () => {
      updateServicePickerSelection();
    });
  });

  rootNode.querySelector("[data-service-custom-title]")?.addEventListener("input", () => {
    updateServicePickerSelection();
  });

  rootNode.querySelectorAll("[data-remove-cart]").forEach((button) => {
    button.addEventListener("click", () => window.BBCS.removeCart(button.dataset.removeCart));
  });

  rootNode.querySelector("[data-checkout]")?.addEventListener("click", () => {
    const state = getState();
    if (!state.cart.length) return toast("Your cart is empty");
    const shouldOfferStudioService = state.cart.some((item) => item.type !== "service") && !state.cart.some((item) => item.type === "service");
    setState({
      cartOpen: false,
      page: shouldOfferStudioService ? "upsell" : "checkout",
      upsellSeconds: 599,
    });
  });

  rootNode.querySelector("[data-mini-toggle]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCurrentTrack();
  });

  rootNode.querySelector("[data-next]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.BBCS.nextTrack(1);
  });
  rootNode.querySelector("[data-prev]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.BBCS.nextTrack(-1);
  });
  rootNode.querySelector("[data-restart]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    restartCurrentTrack();
  });

  rootNode.querySelector("[data-newsletter]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = rootNode.querySelector("[data-newsletter-email]")?.value.trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ newsletterStatus: "error", newsletterMessage: "Enter a valid email." });
      return toast("Enter a valid email");
    }

    setState({ newsletterStatus: "sending", newsletterMessage: "Joining the Chop List..." });
    try {
      const result = await saveNewsletterSignup(email);
      setState({
        newsletterStatus: "sent",
        newsletterMessage: result.duplicate ? "You are already on the Chop List." : "Welcome to the Chop List.",
      });
      toast(result.duplicate ? "Already on the Chop List" : "Welcome to the Chop List");
    } catch (error) {
      console.error(error);
      setState({
        newsletterStatus: "error",
        newsletterMessage: "Signup unavailable right now. Contact contact@boombapchopshop.art.",
      });
      toast("Newsletter signup unavailable");
    }
  });

  rootNode.querySelector("[data-chat-toggle]")?.addEventListener("click", () => {
    setState({ chatOpen: !getState().chatOpen });
    setTimeout(() => rootNode.querySelector("[data-chat-input]")?.focus(), 40);
  });

  rootNode.querySelector("[data-chat-close]")?.addEventListener("click", () => {
    setState({ chatOpen: false });
  });

  rootNode.querySelectorAll("[data-chat-language]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ chatLanguage: button.dataset.chatLanguage });
    });
  });

  rootNode.querySelectorAll("[data-chat-suggest]").forEach((button) => {
    button.addEventListener("click", () => {
      submitChatMessage(button.dataset.chatSuggest);
    });
  });

  rootNode.querySelectorAll("[data-chat-play-track]").forEach((button) => {
    button.addEventListener("click", () => {
      playChatTrack(button.dataset.chatPlayTrack);
    });
  });

  rootNode.querySelectorAll("[data-chat-service]").forEach((button) => {
    button.addEventListener("click", () => {
      openChatService(button.dataset.chatService);
    });
  });

  rootNode.querySelector("[data-chat-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = rootNode.querySelector("[data-chat-input]");
    submitChatMessage(input?.value || "");
  });
}

function bindPageActions() {
  rootNode.querySelector("[data-page-root]")?.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (!addButton) return;
    event.preventDefault();
    event.stopPropagation();
    const added = window.BBCS.addCart({
      name: addButton.dataset.name,
      license: addButton.dataset.license,
      price: Number(addButton.dataset.price),
    });
    if (added) setState({ cartOpen: true });
  });

  rootNode.querySelectorAll("[data-license-open]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setState({ licensePickerBeatId: button.dataset.licenseOpen });
    });
  });

  rootNode.querySelectorAll("[data-add-license]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const added = window.BBCS.addCart({
        beatId: button.dataset.beatId,
        name: button.dataset.name,
        licenseId: button.dataset.licenseId,
      });
      if (added) setState({ cartOpen: true, licensePickerBeatId: null });
    });
  });

  rootNode.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setState({ filter: button.dataset.filter }));
  });

  rootNode.querySelector("[data-catalog-search]")?.addEventListener("input", (event) => {
    setState({ catalogQuery: event.target.value });
    restoreCatalogSearchFocus();
  });

  rootNode.querySelector("[data-catalog-sort]")?.addEventListener("change", (event) => {
    setState({ catalogSort: event.target.value });
  });

  rootNode.querySelector("[data-catalog-reset]")?.addEventListener("click", () => {
    setState({ catalogQuery: "", filter: "all", catalogSort: "recent" });
    setTimeout(() => document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" }), 40);
  });

  rootNode.querySelectorAll("[data-play-track]").forEach((row) => {
    row.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-add-cart], [data-license-open]")) return;
      event.preventDefault();
      event.stopPropagation();
      window.BBCS.playTrack(Number(row.dataset.playTrack));
    });
  });

  rootNode.querySelectorAll("[data-add-cart]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const added = window.BBCS.addCart({
        name: button.dataset.name,
        license: button.dataset.license,
        price: Number(button.dataset.price),
      });
      if (added) setState({ cartOpen: true });
    });
  });

  rootNode.querySelector("[data-featured-toggle]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestFeaturedTrack();
  });

  rootNode.querySelector("[data-featured-wave]")?.addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = clamp((event.clientX - rect.left) / rect.width);
    const state = getState();
    if (state.featuredPlaying) audioPlayer.currentTime = getFeaturedBeat(state).durationSeconds * progress;
    setState({ featuredProgress: progress });
  });

  rootNode.querySelector("[data-volume-control]")?.addEventListener("input", (event) => {
    const volume = clamp(Number(event.target.value) / 100);
    audioPlayer.volume = volume;
    getState().audioVolume = volume;
  });

  rootNode.querySelectorAll("[data-sp-pad]").forEach((pad) => {
    pad.addEventListener("click", () => {
      const id = Number(pad.dataset.spPad);
      pad.classList.add("hit");
      setTimeout(() => pad.classList.remove("hit"), 250);
      window.BBCS.playTrack(id);
    });
  });

  rootNode.querySelectorAll("[data-upsell]").forEach((button) => {
    button.addEventListener("click", () => {
      openServicePicker({
        name: button.dataset.name,
        price: Number(button.dataset.price),
        summary: "Optional mix + mastering support before release",
        includes: ["Mix + mastering service", "Final delivery details confirmed after checkout"],
        afterAddPage: "checkout",
      });
    });
  });

  rootNode.querySelectorAll("[data-service-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      openServicePicker({
        name: button.dataset.name,
        price: Number(button.dataset.price),
        summary: button.dataset.summary,
        includes: button.dataset.includes.split("|"),
      });
    });
  });

  rootNode.querySelector("[data-skip-upsell]")?.addEventListener("click", () => route("checkout"));

  rootNode.querySelector("[data-promo-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = rootNode.querySelector("[data-promo-code]")?.value.trim() || "";
    const state = getState();
    const cart = [...state.cart];
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (!code) {
      setState({ checkoutPromo: null, checkoutPromoCode: "" });
      return;
    }
    try {
      const promo = await validatePromoCode({ code, items: cart, total });
      setState({ checkoutPromo: promo?.valid ? promo : { code, error: promo?.error || "Promo code unavailable." }, checkoutPromoCode: code });
      toast(promo?.valid ? "Promo code applied" : promo?.error || "Promo code unavailable.");
    } catch (error) {
      console.error(error);
      setState({ checkoutPromo: { code, error: "Promo code unavailable right now." }, checkoutPromoCode: code });
      toast("Promo code unavailable right now.");
    }
  });

  rootNode.querySelector("[data-pay]")?.addEventListener("click", async () => {
    const email = rootNode.querySelector("[data-email]")?.value.trim() || "";
    const firstName = rootNode.querySelector("[data-first-name]")?.value.trim() || "";
    const lastName = rootNode.querySelector("[data-last-name]")?.value.trim() || "";
    if (!email.includes("@")) return toast("Enter a valid email");
    if (!rootNode.querySelector("[data-license-accept]")?.checked) return toast("Please accept the license terms");
    const state = getState();
    const cart = [...state.cart];
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const promoCode = state.checkoutPromo?.valid ? state.checkoutPromo.code : "";
    const hasService = cart.some((item) => item.type === "service");
    try {
      const checkout = await createCheckoutSession({ email, firstName, lastName, items: cart, total, promoCode });
      saveCheckoutReturn(checkout.orderNumber, email, hasService);
      window.location.href = checkout.checkoutUrl;
      return;
    } catch (error) {
      console.error(error);
      toast(getCheckoutErrorMessage(error));
      return;
    }
  });

  rootNode.querySelector("[data-contact-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      artistName: formData.get("artistName"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      website: formData.get("website"),
    };

    const email = String(payload.email || "").trim();
    const message = String(payload.message || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ contactStatus: "error", contactMessage: "Enter a valid email address." });
      return;
    }
    if (message.length < 10) {
      setState({ contactStatus: "error", contactMessage: "Add a few more details so I can answer properly." });
      return;
    }

    setState({ contactStatus: "sending", contactMessage: "Sending your message..." });
    try {
      await sendContactMessage(payload);
      form.reset();
      setState({ contactStatus: "sent", contactMessage: "Message sent. Reply within 24-48 business hours." });
      toast("Message sent.");
    } catch (error) {
      console.error(error);
      setState({ contactStatus: "error", contactMessage: "Message unavailable right now. Email contact@boombapchopshop.art directly." });
      toast("Message unavailable right now.");
    }
  });

  rootNode.querySelectorAll("[data-blog-post]").forEach((item) => {
    item.addEventListener("click", () => {
      setState({ activePostId: item.dataset.blogPost });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  rootNode.querySelector("[data-blog-back]")?.addEventListener("click", () => {
    setState({ activePostId: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  rootNode.querySelectorAll("[data-blog-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ activePostId: "", blogCategory: "all", blogTag: button.dataset.blogTag });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  rootNode.querySelector("[data-blog-clear]")?.addEventListener("click", () => {
    setState({ blogTag: "", blogCategory: "all", activePostId: "" });
  });

  rootNode.querySelectorAll("[data-blog-category]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ blogCategory: button.dataset.blogCategory, blogTag: "", activePostId: "" });
      setTimeout(() => document.querySelector(".blog-wrap")?.scrollIntoView({ behavior: "smooth" }), 80);
    });
  });

  rootNode.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => toast(button.dataset.toast));
  });

  rootNode.querySelector("[data-admin-login]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const session = await signInAdmin(form.get("email"), form.get("password"));
      setState({ adminSession: session, cmsMessage: "Signed in." });
      await refreshAdminContent();
    } catch (error) {
      setState({ cmsMessage: error.message || "Sign in failed." });
    }
  });

  rootNode.querySelectorAll("[data-account-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ accountMode: button.dataset.accountMode, accountMessage: "" });
    });
  });

  rootNode.querySelector("[data-account-auth]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = form.get("mode");
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (!email.includes("@")) return toast("Enter a valid email");
    if (password.length < 6) return toast("Password must be at least 6 characters");
    try {
      if (mode === "signup") {
        const data = await signUpCustomer(email, password);
        const session = data.session || await getCustomerSession();
        setState({
          customerSession: session,
          accountMode: "signin",
          accountMessage: session ? "Account created." : "Account created. Check your email to confirm it, then sign in.",
        });
      } else {
        const session = await signInCustomer(email, password);
        setState({ customerSession: session, accountMessage: "Signed in." });
      }
      if (getState().customerSession) await refreshCustomerOrders();
    } catch (error) {
      setState({ accountMessage: error.message || "Account action failed." });
    }
  });

  rootNode.querySelector("[data-account-logout]")?.addEventListener("click", async () => {
    await signOutCustomer();
    setState({ customerSession: null, adminSession: null, customerOrders: [], accountMessage: "Signed out." });
  });

  rootNode.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    await signOutAdmin();
    setState({ adminSession: null, customerSession: null, customerOrders: [], adminEditingBeatId: null, cmsMessage: "Signed out." });
  });

  rootNode.querySelectorAll("[data-admin-edit-beat]").forEach((button) => {
    button.addEventListener("click", () => {
      setState({ adminEditingBeatId: button.dataset.adminEditBeat, cmsMessage: "" });
      setTimeout(() => rootNode.querySelector("[data-admin-beat-form]")?.scrollIntoView({ behavior: "smooth" }), 40);
    });
  });

  rootNode.querySelector("[data-admin-edit-cancel]")?.addEventListener("click", () => {
    setState({ adminEditingBeatId: null, cmsMessage: "" });
  });

  rootNode.querySelector("[data-admin-beat-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const editing = Boolean(getState().adminEditingBeatId);
    try {
      await saveBeat(new FormData(event.currentTarget));
      event.currentTarget.reset();
      setState({ adminEditingBeatId: null, cmsMessage: editing ? "Beat updated." : "Beat saved." });
      await refreshAdminContent();
      await hydrateCms();
    } catch (error) {
      setState({ cmsMessage: error.message || "Beat save failed." });
    }
  });

  rootNode.querySelector("[data-admin-post-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await savePost(new FormData(event.currentTarget));
      event.currentTarget.reset();
      setState({ cmsMessage: "Note saved." });
      await refreshAdminContent();
      await hydrateCms();
    } catch (error) {
      setState({ cmsMessage: error.message || "Note save failed." });
    }
  });

  rootNode.querySelector("[data-admin-settings-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveSiteSettings(new FormData(event.currentTarget));
      setState({ cmsMessage: "Banner updated." });
      await refreshAdminContent();
      await hydrateCms();
    } catch (error) {
      setState({ cmsMessage: error.message || "Banner save failed." });
    }
  });

  rootNode.querySelector("[data-feedback-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const state = getState();
    if (state.feedbackStatus === "sending" || state.feedbackStatus === "sent") return;
    setState({ feedbackStatus: "sending", feedbackMessage: "Sending feedback..." });
    const form = new FormData(event.currentTarget);
    const ratingKeys = ["style", "clarity", "navigation", "listening", "checkout", "licenses", "mobile", "trust", "speed", "global"];
    const ratings = Object.fromEntries(ratingKeys.map((key) => [key, numberOrNull(form.get(`rating_${key}`))]));
    try {
      await saveTestFeedback({
        testerName: form.get("testerName"),
        testerEmail: form.get("testerEmail"),
        device: form.get("device"),
        ratings,
        clicked: form.get("clicked"),
        blocked: form.get("blocked"),
        unclearStep: form.get("unclearStep"),
        trustNotes: form.get("trustNotes"),
        bugs: form.get("bugs"),
        priority: form.get("priority"),
        wouldBuy: form.get("wouldBuy"),
      });
    } catch (error) {
      console.error(error);
    }
    event.currentTarget.reset();
    setState({ feedbackStatus: "sent", feedbackMessage: "Feedback sent. Respect for the help." });
    toast("Feedback sent");
  });
}

function openServicePicker(offer) {
  setState({
    servicePickerOffer: {
      name: offer.name,
      price: offer.price,
      summary: offer.summary,
      includes: offer.includes || [],
      afterAddPage: offer.afterAddPage || "",
    },
    servicePickerSelection: {
      targetIds: [],
      customTitle: "",
    },
    cartOpen: false,
  });
}

function updateServicePickerSelection() {
  const state = getState();
  state.servicePickerSelection = {
    targetIds: [...rootNode.querySelectorAll("[data-service-target-beat]:checked")].map((input) => String(input.value)),
    customTitle: rootNode.querySelector("[data-service-custom-title]")?.value || "",
  };
}

function addSelectedStudioServices() {
  const state = getState();
  const offer = state.servicePickerOffer;
  if (!offer) return;
  updateServicePickerSelection();

  const selectedTargets = [...rootNode.querySelectorAll("[data-service-target-beat]:checked")].map((input) => ({
    id: input.value,
    name: input.dataset.targetName,
    type: "beat",
  }));
  const customTitle = rootNode.querySelector("[data-service-custom-title]")?.value.trim() || "";
  if (customTitle) {
    selectedTargets.push({
      id: serviceKey(customTitle),
      name: customTitle,
      type: "custom",
    });
  }

  if (!selectedTargets.length) return toast("Choose the song for this service");

  let addedCount = 0;
  let blockedCount = 0;
  selectedTargets.forEach((target) => {
    const alreadyHasService = state.cart.some((item) => (
      item.type === "service"
      && item.serviceTargetType === target.type
      && String(item.serviceTargetId) === String(target.id)
    ));
    if (alreadyHasService) {
      blockedCount += 1;
      return;
    }

    const added = addCartItem({
      name: offer.name,
      license: "Mix + Mastering",
      licenseId: `service-${serviceKey(offer.name)}-${target.type}-${serviceKey(target.id)}`,
      price: Number(offer.price),
      type: "service",
      licenseSummary: `${offer.summary || "Mix + mastering for one song."} Assigned to: ${target.name}`,
      includes: offer.includes,
      serviceFor: target.name,
      serviceTargetId: target.id,
      serviceTargetType: target.type,
    });
    if (added) addedCount += 1;
  });

  if (!addedCount) {
    return toast(blockedCount ? "This song already has a mix/master service" : "This service is already in your cart for that song");
  }

  setState({
    servicePickerOffer: null,
    servicePickerSelection: {
      targetIds: [],
      customTitle: "",
    },
    cartOpen: !offer.afterAddPage,
    page: offer.afterAddPage || state.page,
  });
  toast(addedCount > 1 ? `${addedCount} services added to cart` : "Service added to cart");
}

function serviceKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function route(page) {
  if (page === "admin" && window.location.hash !== "#admin") window.location.hash = "admin";
  if (page === "feedback" && window.location.hash !== "#test-feedback") window.location.hash = "test-feedback";
  if (page === "account" && window.location.hash !== "#account") window.location.hash = "account";
  if (!["admin", "feedback", "account"].includes(page) && ["#admin", "#test-feedback", "#account"].includes(window.location.hash)) history.replaceState(null, "", window.location.pathname);
  setState({
    page,
    activePostId: "",
    blogCategory: "all",
    blogTag: "",
    licensePickerBeatId: null,
  });
  resetPageScroll();
  if (page === "account" && getState().customerSession) {
    refreshCustomerOrders().catch((error) => {
      setState({ accountMessage: error.message || "Orders unavailable right now." });
    });
  }
}

async function submitChatMessage(rawMessage) {
  const message = String(rawMessage || "").trim();
  if (!message) return;
  const state = getState();
  const resolvedMessage = resolveChatShortcut(message, state.chatMessages || []);
  const userMessage = { role: "user", text: message, actions: [] };
  const pendingMessages = [...(state.chatMessages || []), userMessage].slice(-12);
  setState({
    chatOpen: true,
    chatMessages: pendingMessages,
  });
  scrollChatToEnd();

  const catalogReply = buildCatalogSearchReply(resolvedMessage, state);
  if (catalogReply) {
    setState({
      chatMessages: [...pendingMessages, {
        role: "assistant",
        text: catalogReply.text,
        actions: catalogReply.actions || [],
      }].slice(-12),
    });
    scrollChatToEnd();
    return;
  }

  try {
    const ai = await askAiChatbot({
      message: resolvedMessage,
      language: state.chatLanguage || "auto",
      history: state.chatMessages || [],
    });
    const actions = serviceActionsForChat(`${resolvedMessage}\n${ai.reply}`, state.chatLanguage || "auto");
    setState({
      chatMessages: [...pendingMessages, {
        role: "assistant",
        text: ai.reply,
        actions,
      }].slice(-12),
    });
  } catch (error) {
    console.warn("AI chatbot unavailable, using local fallback.", error);
    const reply = buildChatReply(resolvedMessage, state);
    setState({
      chatMessages: [...pendingMessages, {
        role: "assistant",
        text: reply.text,
        actions: reply.actions || [],
      }].slice(-12),
    });
  }

  scrollChatToEnd();
}

function resolveChatShortcut(message, messages = []) {
  const value = String(message || "").trim();
  if (!/^[1-4]$/.test(value)) return value;
  const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant")?.text || "";
  const menuText = String(lastAssistant).toLowerCase();
  if (!menuText.includes("tu cherches") && !menuText.includes("you looking")) return value;
  const choices = {
    1: "I choose option 1: beat license.",
    2: "I choose option 2: mix and mastering.",
    3: "I choose option 3: stems, Content ID, or exclusivity information.",
    4: "I choose option 4: delivery or refund.",
  };
  return choices[value] || value;
}

function scrollChatToEnd() {
  setTimeout(() => {
    const log = rootNode.querySelector("[data-chat-log]");
    if (log) log.scrollTop = log.scrollHeight;
    rootNode.querySelector("[data-chat-input]")?.focus();
  }, 40);
}

function playChatTrack(trackId) {
  const state = getState();
  const id = Number(trackId);
  const track = state.beats.find((beat) => String(beat.id) === String(trackId));
  if (track) {
    setState({ page: "home" });
    setTimeout(() => {
      document.querySelector("#catalogue")?.scrollIntoView({ behavior: "smooth" });
      window.BBCS.playTrack(Number.isFinite(id) ? id : track.id);
    }, 80);
    return;
  }

  const featuredBeat = getFeaturedBeat(state);
  if (String(featuredBeat.id) === String(trackId) || String(featuredBeat.name) === String(trackId)) {
    setState({ page: "home" });
    setTimeout(() => requestFeaturedTrack(), 80);
  }
}

function openChatService(serviceName) {
  const offer = serviceOffers.find((item) => item.name === serviceName);
  if (!offer) return;
  setState({ page: "home" });
  setTimeout(() => {
    document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
    openServicePicker({
      name: offer.name,
      price: Number(offer.price),
      summary: offer.summary,
      includes: offer.includes,
    });
  }, 80);
}

function serviceActionsForChat(text, language = "auto") {
  const normalized = normalizeText(text);
  const isEnglish = language !== "fr";
  const matched = serviceOffers.filter((offer) => {
    const offerText = normalizeText(offer.name);
    if (normalized.includes(offerText)) return true;
    if (offerText.includes("express") && includesAnyText(normalized, ["plus vite", "le plus vite", "rapide", "fastest", "priority", "urgent"])) return true;
    return false;
  });

  return matched.map((offer) => ({
    label: isEnglish ? `View / add ${offer.name}` : `Voir / ajouter ${offer.name}`,
    serviceName: offer.name,
  }));
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAnyText(text, words) {
  return words.some((word) => text.includes(word));
}

function resetPageScroll() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

function startClock() {
  clearInterval(featuredTimer);
  clearInterval(upsellTimer);

  upsellTimer = setInterval(() => {
    const state = getState();
    if (state.page !== "upsell" || state.upsellSeconds <= 0) return;
    setState({ upsellSeconds: state.upsellSeconds - 1 });
  }, 1000);
}

audioPlayer.addEventListener("timeupdate", () => {
  const state = getState();
  const now = performance.now();
  if (now - lastAudioProgressRender < 250 && !audioPlayer.ended) return;
  lastAudioProgressRender = now;

  if (state.featuredPlaying) {
    const featuredBeat = getFeaturedBeat(state);
    const duration = audioPlayer.duration || featuredBeat.durationSeconds;
    if (!duration) return;
    setState({ featuredProgress: clamp(audioPlayer.currentTime / duration) });
    return;
  }

  const track = getCurrentTrack();
  if (!track) return;
  const duration = audioPlayer.duration || track.durationSeconds;
  if (!duration) return;
  setState({ trackProgress: clamp(audioPlayer.currentTime / duration) });
});

audioPlayer.addEventListener("ended", () => {
  const state = getState();
  if (state.featuredPlaying) {
    setState({ featuredPlaying: false, featuredProgress: 0 });
    return;
  }

  requestNextTrack(1, { autoplay: true });
});

audioPlayer.addEventListener("error", () => {
  setState({ isPlaying: false, featuredPlaying: false });
  toast("Preview audio unavailable");
});

function requestTrack(trackId, options = {}) {
  const state = getState();
  const track = state.beats.find((beat) => beat.id === trackId);
  if (!track) return;

  if (!track.previewUrl) {
    toast("Preview audio not added yet");
    return;
  }

  const sameTrack = state.currentTrackId === trackId;

  if (sameTrack && state.isPlaying && !options.autoplay) {
    audioPlayer.pause();
    setState({ isPlaying: false });
    return;
  }

  if (!sameTrack || options.autoplay || audioPlayer.src !== new URL(track.previewUrl, window.location.href).href) {
    audioPlayer.src = track.previewUrl;
    audioPlayer.currentTime = 0;
  }
  audioPlayer.volume = state.audioVolume;

  audioPlayer.play()
    .then(() => setState({
      currentTrackId: trackId,
      isPlaying: true,
      featuredPlaying: false,
      trackProgress: sameTrack && !options.autoplay ? state.trackProgress : 0,
    }))
    .catch(() => {
      setState({ isPlaying: false });
      toast("Audio playback blocked");
    });
}

function toggleCurrentTrack() {
  const state = getState();
  if (!state.currentTrackId) return;
  requestTrack(state.currentTrackId);
}

function requestFeaturedTrack() {
  const state = getState();
  const featuredBeat = getFeaturedBeat(state);
  if (!featuredBeat.previewUrl) {
    toast("Preview audio not added yet");
    return;
  }

  const featuredUrl = new URL(featuredBeat.previewUrl, window.location.href).href;
  if (state.featuredPlaying) {
    audioPlayer.pause();
    setState({ featuredPlaying: false });
    return;
  }

  if (audioPlayer.src !== featuredUrl) {
    audioPlayer.src = featuredBeat.previewUrl;
    audioPlayer.currentTime = featuredBeat.durationSeconds * state.featuredProgress;
  }
  audioPlayer.volume = state.audioVolume;

  audioPlayer.play()
    .then(() => setState({ featuredPlaying: true, isPlaying: false }))
    .catch(() => {
      setState({ featuredPlaying: false });
      toast("Audio playback blocked");
    });
}

function restartCurrentTrack() {
  const state = getState();
  const track = getCurrentTrack();
  if (!track) return;

  if (!track.previewUrl) {
    setState({ trackProgress: 0 });
    toast("Preview audio not added yet");
    return;
  }

  audioPlayer.currentTime = 0;
  setState({ trackProgress: 0 });

  audioPlayer.play()
    .then(() => setState({ isPlaying: true }))
    .catch(() => {
      setState({ isPlaying: false });
      toast("Audio playback blocked");
    });
}

function requestNextTrack(direction = 1, options = {}) {
  const state = getState();
  const queue = getCatalogueQueue(state).filter((beat) => beat.previewUrl);
  if (!queue.length) {
    setState({ isPlaying: false, trackProgress: 0 });
    toast("No preview audio available");
    return;
  }

  const currentIndex = queue.findIndex((beat) => beat.id === state.currentTrackId);
  const step = direction < 0 ? -1 : 1;
  const nextIndex = currentIndex < 0
    ? (step > 0 ? 0 : queue.length - 1)
    : (currentIndex + step + queue.length) % queue.length;

  requestTrack(queue[nextIndex].id, options);
}

function getCatalogueQueue(state) {
  return getVisibleBeats(state.beats, state);
}

function restoreCatalogSearchFocus() {
  const queryLength = String(getState().catalogQuery || "").length;
  setTimeout(() => {
    const input = rootNode.querySelector("[data-catalog-search]");
    input?.focus();
    input?.setSelectionRange?.(queryLength, queryLength);
  }, 0);
}

async function hydrateCms() {
  try {
    const content = await loadPublishedContent();
    setContent(content);
    const session = await getCustomerSession();
    if (session) {
      setState({ customerSession: session });
      if (getState().page === "admin") {
        await refreshAdminContent();
        setState({ adminSession: session });
      }
      if (getState().page === "account") await refreshCustomerOrders();
    }
  } catch (error) {
    setState({
      beats: [],
      catalogStatus: "unavailable",
      catalogMessage: "The beat catalogue is temporarily unavailable. Please try again in a moment or contact the shop.",
      cmsMessage: error.message || "CMS unavailable.",
    });
  }
}

async function refreshAdminContent() {
  const content = await loadAdminContent();
  setState({ adminBeats: content.beats, adminPosts: content.posts, adminSettings: content.settings || {} });
}

async function refreshCustomerOrders() {
  const orders = await loadCustomerOrders();
  setState({ customerOrders: orders });
}

function toast(message) {
  setState({ toast: message });
  setTimeout(() => {
    if (getState().toast === message) setState({ toast: "" });
  }, 2600);
}

function getCheckoutErrorMessage(error) {
  const message = [
    error?.message,
    error?.context?.error,
    error?.details,
    error?.hint,
  ].filter(Boolean).join(" ");
  if (message.includes("subtotal") || message.includes("discount")) return "Checkout setup missing: run the orders schema update.";
  if (message.includes("STRIPE_SECRET_KEY")) return "Stripe secret key is missing in Supabase.";
  if (message.includes("Invalid beat or license")) return "Checkout item data is stale. Refresh the page and try again.";
  if (message) return message.slice(0, 140);
  return "Stripe payment is not available right now. Please try again in a moment.";
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

window.VGB = {
  addCart(item) {
    const added = addCartItem(item);
    toast(added ? `${item.name} added to cart` : "Already in your cart");
    return added;
  },
  removeCart(id) {
    removeCartItem(id);
  },
  playTrack(id) {
    requestTrack(id);
  },
  nextTrack(direction) {
    requestNextTrack(direction);
  },
};
window.BBCS = window.VGB;
