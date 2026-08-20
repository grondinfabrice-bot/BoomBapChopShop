let analyticsReady = false;
let pendingPage = "home";

export function initAnalytics() {
  const config = window.BBCS_CONFIG || {};
  if (!config.umamiWebsiteId || document.querySelector("[data-bbcs-umami]")) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${String(config.umamiUrl || "").replace(/\/$/, "")}/script.js`;
  script.dataset.websiteId = config.umamiWebsiteId;
  script.dataset.domains = "boombapchopshop.art,www.boombapchopshop.art";
  script.dataset.autoPageview = "false";
  script.dataset.performance = "true";
  script.dataset.bbcsUmami = "true";
  script.addEventListener("load", () => {
    analyticsReady = true;
    trackPage(pendingPage);
  }, { once: true });
  document.head.appendChild(script);
}

export function trackPage(page) {
  pendingPage = String(page || "home");
  if (!analyticsReady || !window.umami?.track) return;
  const url = pendingPage === "home" ? "/" : `/${pendingPage}`;
  window.umami.track((properties) => ({
    ...properties,
    url,
    title: `BOOM BAP CHOP SHOP · ${pendingPage.toUpperCase()}`,
  }));
}

export function trackEvent(name, data = {}) {
  if (!analyticsReady || !window.umami?.track) return;
  window.umami.track(name, data);
}
