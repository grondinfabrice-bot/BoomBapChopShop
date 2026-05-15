import { beats } from "../data/beats.js";
import { uid } from "../utils/format.js";

const state = {
  page: "home",
  cart: [],
  filter: "all",
  currentTrackId: null,
  isPlaying: false,
  trackProgress: 0,
  featuredPlaying: false,
  featuredProgress: 0,
  toast: "",
  checkoutEmail: "",
  upsellSeconds: 599,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((listener) => listener(state));
}

export function navigate(page) {
  setState({ page });
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function addCartItem({ name, license, price }) {
  const exists = state.cart.some((item) => item.name === name && item.license === license);
  if (exists) return false;
  state.cart.push({ id: uid("cart"), name, license, price });
  setState({ cart: state.cart });
  return true;
}

export function removeCartItem(id) {
  setState({ cart: state.cart.filter((item) => item.id !== id) });
}

export function clearCart() {
  setState({ cart: [] });
}

export function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price, 0);
}

export function getCurrentTrack() {
  return beats.find((beat) => beat.id === state.currentTrackId) || null;
}

export function playTrack(trackId) {
  const sameTrack = state.currentTrackId === trackId;
  setState({
    currentTrackId: trackId,
    isPlaying: sameTrack ? !state.isPlaying : true,
    trackProgress: sameTrack ? state.trackProgress : 0,
  });
}

export function pauseTrack() {
  setState({ isPlaying: false });
}

export function nextTrack(direction = 1) {
  const index = beats.findIndex((beat) => beat.id === state.currentTrackId);
  const nextIndex = index < 0 ? 0 : (index + direction + beats.length) % beats.length;
  playTrack(beats[nextIndex].id);
}
