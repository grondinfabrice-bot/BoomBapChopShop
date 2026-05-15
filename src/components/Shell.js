import { CartDrawer } from "./cart/CartDrawer.js";
import { Footer } from "./layout/Footer.js";
import { MiniPlayer } from "./player/MiniPlayer.js";
import { Nav } from "./layout/Nav.js";
import { Ticker } from "./layout/Ticker.js";
import { Toast } from "./feedback/Toast.js";

export function Shell(pageHtml, state) {
  return `
    ${Nav(state)}
    ${Ticker()}
    <main data-page-root>${pageHtml}</main>
    ${CartDrawer(state)}
    ${MiniPlayer(state)}
    ${Toast(state.toast)}
    ${Footer()}
  `;
}
