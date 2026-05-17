import { CartDrawer } from "./cart/CartDrawer.js?v=5";
import { Footer } from "./layout/Footer.js?v=1";
import { MiniPlayer } from "./player/MiniPlayer.js?v=3";
import { DemoBanner } from "./layout/DemoBanner.js";
import { Nav } from "./layout/Nav.js?v=3";
import { LicensePicker } from "./shop/LicensePicker.js?v=1";
import { Ticker } from "./layout/Ticker.js";
import { Toast } from "./feedback/Toast.js?v=2";

export function Shell(pageHtml, state) {
  return `
    ${DemoBanner()}
    ${Nav(state)}
    ${Ticker()}
    <main data-page-root>${pageHtml}</main>
    ${CartDrawer(state)}
    ${LicensePicker(state)}
    ${MiniPlayer(state)}
    ${Toast(state.toast, state)}
    ${Footer()}
  `;
}
