import { posts } from "../data/content.js?v=19";
import { getLicenseById, licenseOptions } from "../data/licenses.js?v=3";
import { uid } from "../utils/format.js";

const state = {
  page: "home",
  beats: [],
  posts,
  cmsReady: false,
  cmsMessage: "",
  catalogStatus: "loading",
  catalogMessage: "Loading the beat catalogue...",
  feedbackMessage: "",
  feedbackStatus: "",
  adminSession: null,
  customerSession: null,
  customerOrders: [],
  accountMode: "signin",
  accountMessage: "",
  adminEditingBeatId: null,
  adminBeats: [],
  adminPosts: [],
  adminSettings: {},
  siteSettings: {
    tickerText: "MP3 / WAV / STEMS INSTANT DELIVERY | NEW DROP: SHADOW OF THE SP | REAL SAMPLES. RAW SOUL. TIMELESS BANGERS. SP-1200 MPC3000 LICENSING OPTIONS BUILT FOR ARTISTS",
  },
  cart: [],
  filter: "all",
  catalogQuery: "",
  catalogSort: "recent",
  currentTrackId: null,
  isPlaying: false,
  trackProgress: 0,
  audioVolume: 0.8,
  featuredPlaying: false,
  featuredProgress: 0,
  toast: "",
  checkoutEmail: "",
  checkoutOrder: "",
  checkoutHasService: false,
  checkoutPromo: null,
  checkoutPromoCode: "",
  chatOpen: false,
  chatLanguage: "en",
  chatMessages: [],
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

export function setContent({ beats: nextBeats, posts: nextPosts, settings: nextSettings }) {
  const hasBeats = Boolean(nextBeats?.length);
  setState({
    beats: hasBeats ? nextBeats : [],
    posts: nextPosts?.length ? nextPosts : state.posts,
    siteSettings: nextSettings ? { ...state.siteSettings, ...nextSettings } : state.siteSettings,
    cmsReady: Boolean(hasBeats || nextPosts?.length),
    catalogStatus: hasBeats ? "ready" : "unavailable",
    catalogMessage: hasBeats
      ? ""
      : "The beat catalogue is temporarily unavailable. Please try again in a moment or contact the shop.",
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
  setState({ cart: state.cart, checkoutPromo: null, checkoutPromoCode: "" });
  return true;
}

function buildDemoDeliveryFiles(name, license) {
  if (!license) return [];
  const beat = state.beats.find((item) => item.name === name);
  if (!beat?.deliveryFiles?.length) return [];
  const allowedFormats = getDeliveryFormatsForLicense(license.id);
  return beat.deliveryFiles
    .filter((file) => allowedFormats.includes(file.format))
    .map((file) => ({
      label: file.label || getDeliveryLabel(file.format),
      bucket: file.bucket || "deliverables",
      path: file.path || "",
      filename: file.filename || "",
      format: file.format || "",
      note: file.note || "",
    }))
    .filter((file) => file.path);
}

function getDeliveryFormatsForLicense(licenseId) {
  if (licenseId === "mp3-basic") return ["mp3"];
  if (licenseId === "wav") return ["mp3", "wav"];
  if (licenseId === "wav-stems") return ["mp3", "wav", "stems"];
  if (licenseId === "exclusive") return ["mp3", "wav", "stems"];
  return [];
}

function getDeliveryLabel(format) {
  if (format === "mp3") return "Download MP3";
  if (format === "wav") return "Download WAV";
  if (format === "stems") return "Download stems";
  return "Download audio file";
}

export function removeCartItem(id) {
  setState({ cart: state.cart.filter((item) => item.id !== id), checkoutPromo: null, checkoutPromoCode: "" });
}

export function clearCart() {
  setState({ cart: [], checkoutPromo: null, checkoutPromoCode: "" });
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
