import { chatSuggestions } from "../../services/chatbot.js?v=1";

export function Chatbot(state) {
  const open = Boolean(state.chatOpen);
  const messages = state.chatMessages || [];
  const language = state.chatLanguage || "auto";
  const suggestions = chatSuggestions.map((item) => language === "en" ? item.en : item.fr);
  const iconSrc = "./src/assets/images/chop-shop-guide-icon.png?v=1";

  return `
    <section class="chatbot ${open ? "open" : ""}" aria-label="Customer support chat">
      <button class="chatbot-toggle" data-chat-toggle type="button" aria-expanded="${open ? "true" : "false"}">
        <img src="${iconSrc}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <span>Chat</span>
      </button>
      <div class="chatbot-panel" aria-hidden="${open ? "false" : "true"}">
        <header class="chatbot-head">
          <img class="chatbot-avatar" src="${iconSrc}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <div>
            <span>Chop Shop Guide</span>
            <h2>${language === "en" ? "Licenses, files, support" : "Licences, fichiers, support"}</h2>
          </div>
          <button data-chat-close type="button" aria-label="Close chat">x</button>
        </header>
        <div class="chatbot-tools" aria-label="Chat language">
          <button class="${language === "auto" ? "active" : ""}" data-chat-language="auto" type="button">Auto</button>
          <button class="${language === "fr" ? "active" : ""}" data-chat-language="fr" type="button">FR</button>
          <button class="${language === "en" ? "active" : ""}" data-chat-language="en" type="button">EN</button>
        </div>
        <div class="chatbot-log" data-chat-log>
          ${messages.length ? messages.map(ChatMessage).join("") : WelcomeMessage(language)}
        </div>
        <div class="chatbot-suggestions">
          ${suggestions.map((suggestion) => `<button data-chat-suggest="${attr(suggestion)}" type="button">${suggestion}</button>`).join("")}
        </div>
        <form class="chatbot-form" data-chat-form>
          <input data-chat-input type="text" placeholder="${language === "en" ? "Ask about licenses, delivery..." : "Pose ta question sur les licences, livraison..."}" autocomplete="off" />
          <button type="submit">Send</button>
        </form>
      </div>
    </section>
  `;
}

function WelcomeMessage(language) {
  const text = language === "en"
    ? "Hi, I am the Chop Shop Guide. Ask me about licenses, prices, instant delivery, refunds, stems, exclusives, Content ID, or mix/mastering."
    : "Salut, je suis Chop Shop Guide. Pose-moi une question sur les licences, prix, livraison instantanee, remboursements, stems, exclusives, Content ID ou mix/mastering.";
  return ChatMessage({ role: "assistant", text, actions: [] });
}

function ChatMessage(message) {
  return `
    <article class="chatbot-message ${message.role}">
      <p>${lines(message.text)}</p>
      ${message.actions?.length ? `
        <div class="chatbot-actions">
          ${message.actions.map((action) => `
            <button
              type="button"
              ${action.route ? `data-route="${attr(action.route)}"` : ""}
              ${action.scroll ? `data-scroll="${attr(action.scroll)}"` : ""}
            >${attr(action.label)}</button>
          `).join("")}
        </div>
      ` : ""}
    </article>
  `;
}

function lines(value = "") {
  return attr(value).replace(/\n/g, "<br>");
}

function attr(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
