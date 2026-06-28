import { CartDrawer } from "./cart/CartDrawer.js?v=6";
import { Footer } from "./layout/Footer.js?v=2";
import { MiniPlayer } from "./player/MiniPlayer.js?v=4";
import { DemoBanner } from "./layout/DemoBanner.js";
import { Nav } from "./layout/Nav.js?v=5";
import { LicensePicker } from "./shop/LicensePicker.js?v=2";
import { ServiceTargetPicker } from "./shop/ServiceTargetPicker.js?v=3";
import { Ticker } from "./layout/Ticker.js?v=1";
import { Toast } from "./feedback/Toast.js?v=2";
import { Chatbot } from "./chat/Chatbot.js?v=2";

export function Shell(pageHtml, state) {
  return `
    ${DemoBanner()}
    ${Nav(state)}
    ${Ticker(state)}
    <main data-page-root>${pageHtml}</main>
    ${CartDrawer(state)}
    ${LicensePicker(state)}
    ${ServiceTargetPicker(state)}
    ${MiniPlayer(state)}
    ${Chatbot(state)}
    ${Toast(state.toast, state)}
    ${Footer(state)}
  `;
}
