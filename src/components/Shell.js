import { CartDrawer } from "./cart/CartDrawer.js?v=6";
import { Footer } from "./layout/Footer.js?v=2";
import { MiniPlayer } from "./player/MiniPlayer.js?v=3";
import { DemoBanner } from "./layout/DemoBanner.js";
import { Nav } from "./layout/Nav.js?v=4";
import { LicensePicker } from "./shop/LicensePicker.js?v=2";
import { ServiceTargetPicker } from "./shop/ServiceTargetPicker.js?v=3";
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
    ${ServiceTargetPicker(state)}
    ${MiniPlayer(state)}
    ${Toast(state.toast, state)}
    ${Footer()}
  `;
}
