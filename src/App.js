import {
  addCartItem,
  getState,
  removeCartItem,
  setContent,
  setState,
  subscribe,
} from "./state/store.js?v=3";
import { Shell } from "./components/Shell.js?v=11";
import { HomePage } from "./pages/HomePage.js?v=15";
import { BlogPage } from "./pages/BlogPage.js?v=6";
import { AboutPage } from "./pages/AboutPage.js?v=2";
import { LicensingPage } from "./pages/LicensingPage.js?v=1";
import { ContactPage } from "./pages/ContactPage.js?v=1";
import { UpsellPage } from "./pages/UpsellPage.js?v=4";
import { CheckoutPage } from "./pages/CheckoutPage.js?v=3";
import { ThanksPage } from "./pages/ThanksPage.js";
import { AdminPage } from "./pages/AdminPage.js";
import { featuredBeat } from "./data/beats.js?v=3";
import { getCurrentTrack } from "./state/store.js";
import {
  getAdminSession,
  loadAdminContent,
  loadPublishedContent,
  saveBeat,
  savePost,
  signInAdmin,
  signOutAdmin,
} from "./services/cms.js";

let rootNode;
let featuredTimer;
let upsellTimer;
let previousPage;
let motionObserver;
let motionPage = "";
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
  admin: AdminPage,
};

export function App(root) {
  rootNode = root;
  if (window.location.hash === "#admin") setState({ page: "admin" });
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#admin") route("admin");
  });
  subscribe(render);
  render();
  startClock();
  hydrateCms();
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
    ".section-header",
    ".catalogue-toolbar",
    ".filter-row",
    ".playlist-container > *",
    ".shop-info-section > *",
    ".licensing-section > *",
    ".licensing-page-wrap > *",
    ".license-detail-grid > *",
    ".license-compare > *",
    ".license-table > *",
    ".blog-wrap > *",
    ".about-wrap > *",
    ".contact-wrap > *",
    ".admin-wrap > *",
    ".checkout-wrap > *",
    ".thanks-wrap > *",
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

  rootNode.querySelector("[data-mini-toggle]")?.addEventListener("click", () => {
    toggleCurrentTrack();
  });

  rootNode.querySelector("[data-next]")?.addEventListener("click", () => window.BBCS.nextTrack(1));
  rootNode.querySelector("[data-prev]")?.addEventListener("click", () => window.BBCS.nextTrack(-1));
  rootNode.querySelector("[data-restart]")?.addEventListener("click", () => restartCurrentTrack());

  rootNode.querySelector("[data-newsletter]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = rootNode.querySelector("[data-newsletter-email]")?.value.trim() || "";
    if (!email.includes("@")) return toast("Enter a valid email");
    toast("Welcome to the Chop List");
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

  rootNode.querySelectorAll("[data-play-track]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-add-cart], [data-license-open]")) return;
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

  rootNode.querySelector("[data-featured-toggle]")?.addEventListener("click", () => {
    const state = getState();
    setState({ featuredPlaying: !state.featuredPlaying });
  });

  rootNode.querySelector("[data-featured-wave]")?.addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setState({ featuredProgress: clamp((event.clientX - rect.left) / rect.width) });
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
      window.BBCS.addCart({
        name: button.dataset.name,
        license: "Studio service",
        licenseId: `service-${button.dataset.name}`,
        price: Number(button.dataset.price),
        type: "service",
        licenseSummary: "Optional mix + mastering support before release",
        includes: ["Mix + mastering service", "Final delivery details confirmed after checkout"],
      });
      route("checkout");
    });
  });

  rootNode.querySelectorAll("[data-service-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const added = window.BBCS.addCart({
        name: button.dataset.name,
        license: "Mix + Mastering",
        licenseId: `service-${button.dataset.name}`,
        price: Number(button.dataset.price),
        type: "service",
        licenseSummary: button.dataset.summary,
        includes: button.dataset.includes.split("|"),
      });
      if (added) setState({ cartOpen: true });
    });
  });

  rootNode.querySelector("[data-skip-upsell]")?.addEventListener("click", () => route("checkout"));

  rootNode.querySelector("[data-pay]")?.addEventListener("click", () => {
    const email = rootNode.querySelector("[data-email]")?.value.trim() || "";
    if (!email.includes("@")) return toast("Enter a valid email");
    setState({ checkoutEmail: email, page: "thanks", cart: [] });
  });

  rootNode.querySelector("[data-contact-send]")?.addEventListener("click", () => {
    toast("Message sent. Reply within 48h.");
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

  rootNode.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    await signOutAdmin();
    setState({ adminSession: null, cmsMessage: "Signed out." });
  });

  rootNode.querySelector("[data-admin-beat-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveBeat(new FormData(event.currentTarget));
      event.currentTarget.reset();
      setState({ cmsMessage: "Beat saved." });
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
}

function route(page) {
  if (page === "admin") window.location.hash = "admin";
  if (page !== "admin" && window.location.hash === "#admin") history.replaceState(null, "", window.location.pathname);
  setState({
    page,
    activePostId: "",
    blogCategory: "all",
    blogTag: "",
    licensePickerBeatId: null,
  });
  resetPageScroll();
}

function resetPageScroll() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

function startClock() {
  clearInterval(featuredTimer);
  clearInterval(upsellTimer);

  featuredTimer = setInterval(() => {
    const state = getState();
    if (!state.featuredPlaying) return;
    setState({ featuredProgress: (state.featuredProgress + 1 / featuredBeat.durationSeconds) % 1 });
  }, 1000);

  upsellTimer = setInterval(() => {
    const state = getState();
    if (state.page !== "upsell" || state.upsellSeconds <= 0) return;
    setState({ upsellSeconds: state.upsellSeconds - 1 });
  }, 1000);
}

audioPlayer.addEventListener("timeupdate", () => {
  const track = getCurrentTrack();
  if (!track) return;
  const duration = audioPlayer.duration || track.durationSeconds;
  if (!duration) return;
  setState({ trackProgress: clamp(audioPlayer.currentTime / duration) });
});

audioPlayer.addEventListener("ended", () => {
  setState({ isPlaying: false, trackProgress: 0 });
});

audioPlayer.addEventListener("error", () => {
  setState({ isPlaying: false });
  toast("Preview audio unavailable");
});

function requestTrack(trackId) {
  const state = getState();
  const track = state.beats.find((beat) => beat.id === trackId);
  if (!track) return;

  if (!track.previewUrl) {
    toast("Preview audio not added yet");
    return;
  }

  const sameTrack = state.currentTrackId === trackId;

  if (sameTrack && state.isPlaying) {
    audioPlayer.pause();
    setState({ isPlaying: false });
    return;
  }

  if (!sameTrack || audioPlayer.src !== new URL(track.previewUrl, window.location.href).href) {
    audioPlayer.src = track.previewUrl;
    audioPlayer.currentTime = 0;
    setState({ currentTrackId: trackId, trackProgress: 0 });
  }

  audioPlayer.play()
    .then(() => setState({ currentTrackId: trackId, isPlaying: true }))
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

  if (!state.isPlaying) return;
  audioPlayer.play().catch(() => {
    setState({ isPlaying: false });
    toast("Audio playback blocked");
  });
}

function requestNextTrack(direction = 1) {
  const state = getState();
  const index = state.beats.findIndex((beat) => beat.id === state.currentTrackId);
  const nextIndex = index < 0 ? 0 : (index + direction + state.beats.length) % state.beats.length;
  requestTrack(state.beats[nextIndex].id);
}

async function hydrateCms() {
  try {
    const content = await loadPublishedContent();
    setContent(content);
    const session = await getAdminSession();
    if (session) {
      setState({ adminSession: session });
      if (getState().page === "admin") await refreshAdminContent();
    }
  } catch (error) {
    setState({ cmsMessage: error.message || "CMS unavailable. Local content is still loaded." });
  }
}

async function refreshAdminContent() {
  const content = await loadAdminContent();
  setState({ adminBeats: content.beats, adminPosts: content.posts });
}

function toast(message) {
  setState({ toast: message });
  setTimeout(() => {
    if (getState().toast === message) setState({ toast: "" });
  }, 2600);
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
