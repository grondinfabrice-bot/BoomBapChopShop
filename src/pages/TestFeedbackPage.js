const ratingFields = [
  ["style", "Visual style"],
  ["clarity", "Clarity"],
  ["navigation", "Navigation"],
  ["listening", "Beat listening"],
  ["checkout", "Checkout"],
  ["licenses", "Licenses"],
  ["mobile", "Mobile"],
  ["trust", "Trust"],
  ["speed", "Speed"],
  ["global", "Overall impression"],
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
        <p>Share your scores, bugs, and blockers. This feedback directly helps improve BOOM BAP CHOP SHOP.</p>
      </div>
      <form class="feedback-form ${isSending ? "is-sending" : ""} ${isSent ? "is-sent" : ""}" data-feedback-form>
        <div class="feedback-panel">
          <h2>Tester</h2>
          <div class="cgrid">
            <label class="fg"><span class="fl">Name</span><input class="fi" name="testerName" type="text" placeholder="Your name" /></label>
            <label class="fg"><span class="fl">Email</span><input class="fi" name="testerEmail" type="email" placeholder="you@email.com" /></label>
            <label class="fg full"><span class="fl">Device</span><input class="fi" name="device" type="text" placeholder="iPhone 15, Samsung, laptop..." /></label>
          </div>
        </div>

        <div class="feedback-panel">
          <h2>Scores /20</h2>
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
            <label class="fg full"><span class="fl">What made you want to click?</span><textarea class="fta" name="clicked"></textarea></label>
            <label class="fg full"><span class="fl">What slowed you down or felt unclear?</span><textarea class="fta" name="blocked"></textarea></label>
            <label class="fg full"><span class="fl">When did you wonder what to do next?</span><textarea class="fta" name="unclearStep"></textarea></label>
            <label class="fg full"><span class="fl">Trust / purchase intent</span><textarea class="fta" name="trustNotes" placeholder="Would you trust this shop enough to buy or contact? Why?"></textarea></label>
            <label class="fg full"><span class="fl">Bugs / buttons / awkward copy</span><textarea class="fta" name="bugs"></textarea></label>
            <label class="fg full"><span class="fl">Priority</span><textarea class="fta" name="priority" placeholder="The first thing you would improve"></textarea></label>
            <label class="fg full"><span class="fl">Would you buy a beat here?</span>
              <select class="fse" name="wouldBuy">
                <option value="">Choose</option>
                <option value="yes">Yes</option>
                <option value="maybe">Maybe</option>
                <option value="no">No</option>
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
