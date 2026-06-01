import { isCmsConfigured } from "../services/cms.js";

export function AdminPage(state) {
  if (!isCmsConfigured()) return AdminSetup();
  if (!state.adminSession) return AdminLogin(state);

  const editingBeat = state.adminBeats.find((beat) => String(beat.id) === String(state.adminEditingBeatId));

  return `
    <section class="admin-wrap">
      <div class="admin-head">
        <div>
          <span class="featured-kicker">Private room</span>
          <h1>Shop Admin</h1>
          <p>Add beats, covers, previews, and Crate Notes without touching the code.</p>
        </div>
        <button class="admin-ghost" data-admin-logout type="button">Sign out</button>
      </div>
      ${state.cmsMessage ? `<div class="admin-message">${state.cmsMessage}</div>` : ""}
      <div class="admin-grid">
        <form class="admin-panel" data-admin-beat-form>
          <div class="admin-panel-head">
            <span>${editingBeat ? "Edit beat" : "New beat"}</span>
            <strong>${state.adminBeats.length} saved</strong>
          </div>
          ${editingBeat ? `<input name="id" type="hidden" value="${attr(editingBeat.id)}" />` : ""}
          <label>Name<input name="name" required placeholder="STAIRCASE SWAGGER" value="${attr(editingBeat?.name)}" /></label>
          <label>Subtitle<input name="subtitle" placeholder="boom bap instrumental" value="${attr(editingBeat?.subtitle)}" /></label>
          <div class="admin-two">
            <label>BPM<input name="bpm" type="number" min="40" max="220" placeholder="90" value="${attr(editingBeat?.bpm || "")}" /></label>
            <label>Key<input name="key" placeholder="Eb Min" value="${attr(editingBeat?.key)}" /></label>
          </div>
          <div class="admin-two">
            <label>Duration<input name="duration" placeholder="2:46" value="${attr(editingBeat?.duration)}" /></label>
            <label>Seconds<input name="durationSeconds" type="number" min="1" placeholder="166" value="${attr(editingBeat?.durationSeconds || "")}" /></label>
          </div>
          <div class="admin-two">
            <label>Price<input name="price" type="number" min="0" step="0.01" placeholder="29.99" value="${attr(editingBeat?.price || "")}" /></label>
            <label>Sort order<input name="sortOrder" type="number" placeholder="100" value="${attr(editingBeat?.sortOrder ?? "")}" /></label>
          </div>
          <label>Tags<input name="tags" placeholder="boom bap, soul, featured" value="${attr((editingBeat?.tags || []).join(", "))}" /></label>
          <label>Description<textarea name="description" rows="4" placeholder="Short mood and production notes">${text(editingBeat?.description)}</textarea></label>
          <label>Cover image<input name="cover" type="file" accept="image/*" />${editingBeat ? "<small>Leave empty to keep the current cover.</small>" : ""}</label>
          <label>Preview audio<input name="preview" type="file" accept="audio/*" />${editingBeat ? "<small>Leave empty to keep the current preview.</small>" : ""}</label>
          <label class="admin-check"><input name="stemsAvailable" type="checkbox" ${editingBeat?.stemsAvailable === false ? "" : "checked"} /> Stems available</label>
          <label class="admin-check"><input name="published" type="checkbox" ${editingBeat?.published === false ? "" : "checked"} /> Published</label>
          <button class="admin-submit" type="submit">${editingBeat ? "Update beat" : "Save beat"}</button>
          ${editingBeat ? `<button class="admin-ghost" data-admin-edit-cancel type="button">Cancel edit</button>` : ""}
        </form>

        <form class="admin-panel" data-admin-post-form>
          <div class="admin-panel-head">
            <span>New note</span>
            <strong>${state.adminPosts.length} saved</strong>
          </div>
          <label>Title<input name="title" required placeholder="Drums that knock" /></label>
          <label>Category<input name="category" placeholder="Production" /></label>
          <label>Excerpt<textarea name="excerpt" rows="3" placeholder="Short intro for the blog list"></textarea></label>
          <label>Body<textarea name="body" rows="8" placeholder="Paragraph one&#10;&#10;Paragraph two"></textarea></label>
          <label>Tags<input name="tags" placeholder="drums, vocal space, arrangement" /></label>
          <div class="admin-two">
            <label>Art<input name="art" placeholder="DRUMS" /></label>
            <label>Read time<input name="readTime" placeholder="5 MIN" /></label>
          </div>
          <label>Tone
            <select name="tone">
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
              <option value="orange">Orange</option>
              <option value="green">Green</option>
            </select>
          </label>
          <label class="admin-check"><input name="featured" type="checkbox" /> Featured</label>
          <label class="admin-check"><input name="published" type="checkbox" checked /> Published</label>
          <button class="admin-submit" type="submit">Save note</button>
        </form>
      </div>
      <div class="admin-list">
        <h2>Recent beats</h2>
        ${state.adminBeats.slice(0, 8).map((beat) => `
          <article>
            <span>${beat.published ? "Live" : "Draft"}</span>
            <strong>${beat.name}</strong>
            <small>${beat.bpm || "-"} BPM · ${beat.stemsAvailable === false ? "No stems" : "Stems"} · ${(beat.tags || []).join(", ")}</small>
            <button class="admin-ghost" data-admin-edit-beat="${beat.id}" type="button">Edit</button>
          </article>
        `).join("") || `<p>No beats saved yet.</p>`}
      </div>
    </section>
  `;
}

function attr(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function text(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function AdminSetup() {
  return `
    <section class="admin-wrap">
      <div class="admin-head">
        <div>
          <span class="featured-kicker">Setup needed</span>
          <h1>Connect Supabase</h1>
          <p>The admin is ready. Add your Supabase URL and anon key in src/config.js, then come back to #admin.</p>
        </div>
      </div>
    </section>
  `;
}

function AdminLogin(state) {
  return `
    <section class="admin-wrap admin-login-wrap">
      <form class="admin-login" data-admin-login>
        <span class="featured-kicker">Private access</span>
        <h1>Shop Admin</h1>
        <p>Sign in with the Supabase user you create for yourself.</p>
        ${state.cmsMessage ? `<div class="admin-message">${state.cmsMessage}</div>` : ""}
        <label>Email<input name="email" type="email" required autocomplete="email" /></label>
        <label>Password<input name="password" type="password" required autocomplete="current-password" /></label>
        <button class="admin-submit" type="submit">Sign in</button>
      </form>
    </section>
  `;
}
