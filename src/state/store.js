import { beats } from "../data/beats.js?v=9";
import { posts } from "../data/content.js?v=19";
import { getLicenseById, licenseOptions } from "../data/licenses.js?v=3";
import { uid } from "../utils/format.js";

const state = {
  page: "home",
  beats,
  posts,
  cmsReady: false,
  cmsMessage: "",
  adminSession: null,
  adminBeats: [],
  adminPosts: [],
  cart: [],
  filter: "all",
  currentTrackId: null,
  isPlaying: false,
  trackProgress: 0,
  audioVolume: 0.8,
  featuredPlaying: false,
  featuredProgress: 0,
  toast: "",
  checkoutEmail: "",
  checkoutOrder: "",
  upsellSeconds: 599,
  activePostId: "",
  blogCategory: "all",
  blogTag: "",
  licensePickerBeatId: null,
  servicePickerOffer: null,
  servicePickerSelection: {
    targetIds: [],
    customTitle: "",
  },
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
  listeners.forEach((listener) => listener(state, patch));
}

export function setContent({ beats: nextBeats, posts: nextPosts }) {
  setState({
    beats: nextBeats?.length ? nextBeats : state.beats,
    posts: nextPosts?.length ? nextPosts : state.posts,
    cmsReady: Boolean(nextBeats?.length || nextPosts?.length),
  });
}

export function navigate(page) {
  setState({ page });
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function addCartItem({
  beatId = "",
  name,
  license,
  licenseId = "",
  price,
  type = "beat",
  licenseSummary = "",
  includes = [],
  serviceFor = "",
  serviceTargetId = "",
  serviceTargetType = "",
}) {
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
    contractUrl: selectedLicense?.contractUrl || "",
    deliveryFiles: buildDemoDeliveryFiles(name, selectedLicense),
    serviceFor,
    serviceTargetId,
    serviceTargetType,
  });
  setState({ cart: state.cart });
  return true;
}

function buildDemoDeliveryFiles(name, license) {
  if (!license) return [];
  const beat = state.beats.find((item) => item.name === name);
  if (!beat?.previewUrl) return [];
  const formatLabel = license.id === "mp3-basic" ? "MP3 demo delivery" : `${license.label} demo delivery`;
  return [{
    label: formatLabel,
    url: beat.previewUrl,
    note: "Demo audio file. Replace with private final deliverables before real sales.",
  }];
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
  return state.beats.find((beat) => beat.id === state.currentTrackId) || null;
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
  const index = state.beats.findIndex((beat) => beat.id === state.currentTrackId);
  const nextIndex = index < 0 ? 0 : (index + direction + state.beats.length) % state.beats.length;
  playTrack(state.beats[nextIndex].id);
}
