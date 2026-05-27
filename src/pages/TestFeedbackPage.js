const ratingFields = [
  ["style", "Style visuel"],
  ["clarity", "Clarte"],
  ["navigation", "Navigation"],
  ["listening", "Ecoute des beats"],
  ["checkout", "Checkout"],
  ["licenses", "Licences"],
  ["mobile", "Mobile"],
  ["trust", "Confiance"],
  ["speed", "Vitesse"],
  ["global", "Impression globale"],
];

export function TestFeedbackPage(state) {
  const isSending = state.feedbackStatus === "sending";
  const isSent = state.feedbackStatus === "sent";
  const buttonLabel = isSending ? "Sending..." : isSent ? "Feedback sent" : "Send feedback";
  const buttonState = isSending || isSent ? "disabled" : "";
  return `
    <section class="feedback-wrap">
      <div class="feedback-head">
        <p class="feedback-kicker">Private beta test</p>
        <h1>Rate the shop</h1>
        <p>Entre tes notes, tes bugs, et ce qui t'a bloque. Ces retours servent directement a ameliorer BOOM BAP CHOP SHOP.</p>
      </div>
      <form class="feedback-form ${isSending ? "is-sending" : ""} ${isSent ? "is-sent" : ""}" data-feedback-form>
        <div class="feedback-panel">
          <h2>Tester</h2>
          <div class="cgrid">
            <label class="fg"><span class="fl">Name</span><input class="fi" name="testerName" type="text" placeholder="Ton nom" /></label>
            <label class="fg"><span class="fl">Email</span><input class="fi" name="testerEmail" type="email" placeholder="ton@email.com" /></label>
            <label class="fg full"><span class="fl">Device</span><input class="fi" name="device" type="text" placeholder="iPhone 15, Samsung, laptop..." /></label>
          </div>
        </div>

        <div class="feedback-panel">
          <h2>Notes /20</h2>
          <div class="feedback-ratings">
            ${ratingFields.map(([key, label]) => `
              <label>
                <span>${label}</span>
                <input name="rating_${key}" type="number" min="0" max="20" step="1" inputmode="numeric" placeholder="/20" />
              </label>
            `).join("")}
          </div>
        </div>

        <div class="feedback-panel">
          <h2>Questions</h2>
          <div class="cgrid">
            <label class="fg full"><span class="fl">Qu'est-ce qui t'a donne envie de cliquer ?</span><textarea class="fta" name="clicked"></textarea></label>
            <label class="fg full"><span class="fl">Qu'est-ce qui t'a freine ou semble flou ?</span><textarea class="fta" name="blocked"></textarea></label>
            <label class="fg full"><span class="fl">A quel moment tu t'es demande quoi faire ensuite ?</span><textarea class="fta" name="unclearStep"></textarea></label>
            <label class="fg full"><span class="fl">Confiance / achat</span><textarea class="fta" name="trustNotes" placeholder="Est-ce que tu aurais confiance pour acheter ou contacter ? Pourquoi ?"></textarea></label>
            <label class="fg full"><span class="fl">Bugs / boutons / textes bizarres</span><textarea class="fta" name="bugs"></textarea></label>
            <label class="fg full"><span class="fl">Priorite</span><textarea class="fta" name="priority" placeholder="La chose a ameliorer en premier selon toi"></textarea></label>
            <label class="fg full"><span class="fl">Tu acheterais un beat ici ?</span>
              <select class="fse" name="wouldBuy">
                <option value="">Choisir</option>
                <option value="yes">Oui</option>
                <option value="maybe">Peut-etre</option>
                <option value="no">Non</option>
              </select>
            </label>
          </div>
        </div>

        <button class="btn-pay feedback-submit" type="submit" ${buttonState}>${buttonLabel}</button>
        <p class="feedback-message">${state.feedbackMessage || ""}</p>
      </form>
    </section>
  `;
}
