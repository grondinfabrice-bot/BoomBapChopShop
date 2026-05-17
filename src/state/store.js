import { beats } from "../data/beats.js?v=3";
import { getLicenseById, licenseOptions } from "../data/licenses.js?v=1";
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
  activePostId: "",
  blogCategory: "all",
  blogTag: "",
  licensePickerBeatId: null,
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

export function addCartItem({ beatId = "", name, license, licenseId = "", price, type = "beat", licenseSummary = "", includes = [] }) {
  const selectedLicense = licenseOptions.some((option) => option.id === licenseId) ? getLicenseById(licenseId) : null;
  const licenseName = license || selectedLicense?.name || "Upgrade";
  const itemLicenseId = selectedLicense?.id || licenseId || uid("upgrade");
  const licensePrice = Number.isFinite(price) ? price : selectedLicense?.price || 0;
  const exists = state.cart.some((item) => item.name === name && item.licenseId === itemLicenseId);
  if (exists) return false;
  state.cart.push({
    id: uid("cart"),
    beatId,
    name,
    license: licenseName,
    licenseId: itemLicenseId,
    type,
    price: licensePrice,
    includes: selectedLicense?.includes || includes || ["Upgrade added to order"],
    usage: selectedLicense?.allowed || [],
    licenseSummary: selectedLicense?.short || licenseSummary || "Optional cart upgrade",
  });
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
