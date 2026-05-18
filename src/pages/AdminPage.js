import { isCmsConfigured } from "../services/cms.js";

export function AdminPage(state) {
  if (!isCmsConfigured()) return AdminSetup();
  if (!state.adminSession) return AdminLogin(state);

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
            <span>New beat</span>
            <strong>${state.adminBeats.length} saved</strong>
          </div>
          <label>Name<input name="name" required placeholder="STAIRCASE SWAGGER" /></label>
          <label>Subtitle<input name="subtitle" placeholder="boom bap instrumental" /></label>
          <div class="admin-two">
            <label>BPM<input name="bpm" type="number" min="40" max="220" placeholder="90" /></label>
            <label>Key<input name="key" placeholder="Eb Min" /></label>
          </div>
          <div class="admin-two">
            <label>Duration<input name="duration" placeholder="2:46" /></label>
            <label>Seconds<input name="durationSeconds" type="number" min="1" placeholder="166" /></label>
          </div>
          <label>Price<input name="price" type="number" min="0" step="0.01" placeholder="29.99" /></label>
          <label>Tags<input name="tags" placeholder="boom bap, soul, 90s" /></label>
          <label>Description<textarea name="description" rows="4" placeholder="Short mood and production notes"></textarea></label>
          <label>Cover image<input name="cover" type="file" accept="image/*" /></label>
          <label>Preview audio<input name="preview" type="file" accept="audio/*" /></label>
          <label class="admin-check"><input name="published" type="checkbox" checked /> Published</label>
          <button class="admin-submit" type="submit">Save beat</button>
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
            <small>${beat.bpm || "-"} BPM · ${(beat.tags || []).join(", ")}</small>
          </article>
        `).join("") || `<p>No beats saved yet.</p>`}
      </div>
    </section>
  `;
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
