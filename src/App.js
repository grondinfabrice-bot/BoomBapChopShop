import {
  addCartItem,
  getState,
  nextTrack,
  playTrack,
  removeCartItem,
  setState,
  subscribe,
} from "./state/store.js";
import { Shell } from "./components/Shell.js";
import { HomePage } from "./pages/HomePage.js";
import { BlogPage } from "./pages/BlogPage.js";
import { ContactPage } from "./pages/ContactPage.js";
import { UpsellPage } from "./pages/UpsellPage.js";
import { CheckoutPage } from "./pages/CheckoutPage.js";
import { ThanksPage } from "./pages/ThanksPage.js";
import { featuredBeat } from "./data/beats.js";
import { getCurrentTrack } from "./state/store.js";

let rootNode;
let trackTimer;
let featuredTimer;
let upsellTimer;

const pages = {
  home: HomePage,
  blog: BlogPage,
  contact: ContactPage,
  upsell: UpsellPage,
  checkout: CheckoutPage,
  thanks: ThanksPage,
};

export function App(root) {
  rootNode = root;
  subscribe(render);
  render();
  startClock();
}

function render() {
  const state = getState();
  const Page = pages[state.page] || HomePage;
  rootNode.innerHTML = Shell(Page(state), state);
  bindGlobalActions();
  bindPageActions();
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

  rootNode.querySelector("[data-cart-overlay]")?.addEventListener("click", (event) => {
    if (event.target.dataset.cartOverlay !== undefined) setState({ cartOpen: false });
  });

  rootNode.querySelectorAll("[data-remove-cart]").forEach((button) => {
    button.addEventListener("click", () => window.BBCS.removeCart(button.dataset.removeCart));
  });

  rootNode.querySelector("[data-checkout]")?.addEventListener("click", () => {
    const state = getState();
    if (!state.cart.length) return toast("Your cart is empty");
    setState({ cartOpen: false, page: "upsell", upsellSeconds: 599 });
  });

  rootNode.querySelector("[data-mini-toggle]")?.addEventListener("click", () => {
    const state = getState();
    if (!state.currentTrackId) return;
    setState({ isPlaying: !state.isPlaying });
  });

  rootNode.querySelector("[data-next]")?.addEventListener("click", () => window.BBCS.nextTrack(1));
  rootNode.querySelector("[data-prev]")?.addEventListener("click", () => window.BBCS.nextTrack(-1));
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

  rootNode.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setState({ filter: button.dataset.filter }));
  });

  rootNode.querySelectorAll("[data-play-track]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-add-cart]")) return;
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

  rootNode.querySelectorAll("[data-pad-hit]").forEach((pad) => {
    pad.addEventListener("click", () => {
      pad.classList.add("pad-flash");
      setTimeout(() => pad.classList.remove("pad-flash"), 180);
    });
  });

  rootNode.querySelectorAll("[data-upsell]").forEach((button) => {
    button.addEventListener("click", () => {
      window.BBCS.addCart({
        name: button.dataset.name,
        license: "Upgrade",
        price: Number(button.dataset.price),
      });
      route("checkout");
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

  rootNode.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => toast(button.dataset.toast));
  });

}

function route(page) {
  setState({ page });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startClock() {
  clearInterval(trackTimer);
  clearInterval(featuredTimer);
  clearInterval(upsellTimer);

  trackTimer = setInterval(() => {
    const state = getState();
    const track = getCurrentTrack();
    if (!state.isPlaying || !track) return;
    setState({ trackProgress: (state.trackProgress + 1 / track.durationSeconds) % 1 });
  }, 1000);

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
    playTrack(id);
  },
  nextTrack(direction) {
    nextTrack(direction);
  },
};
window.BBCS = window.VGB;
