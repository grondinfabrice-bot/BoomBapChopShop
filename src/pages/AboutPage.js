export function AboutPage() {
  return `
    <section class="about-wrap">
      <div class="about-hero">
        <div>
          <span class="about-kicker">About the shop</span>
          <h1 class="about-title">Built for artists who still care about feel.</h1>
          <p class="about-lead">
            BOOM BAP CHOP SHOP is a beat store and production space focused on dusty textures,
            heavy drums, soulful samples, and clean delivery for artists who want their records
            to sound intentional from the first loop to the final master.
          </p>
        </div>
        <div class="about-image-stack" aria-label="Images a ajouter">
          <div class="about-image-slot main">
            <span>Image zone</span>
            <small>Studio, gear, portrait, vinyl wall</small>
          </div>
          <div class="about-image-row">
            <div class="about-image-slot">
              <span>Detail</span>
              <small>Drum texture, sample tone, vocal space, low-end movement.</small>
            </div>
            <div class="about-image-slot">
              <span>Process</span>
              <small>Reference track, rough direction, focused revisions, final exports.</small>
            </div>
          </div>
        </div>
      </div>

      <div class="about-grid">
        <article>
          <span>Values</span>
          <h2>Raw, musical, usable.</h2>
          <p>
            The goal is not to chase trends. The goal is to create instrumentals with character:
            drums that knock, samples that breathe, bass that leaves room for the voice, and enough
            grit to feel human.
          </p>
        </article>
        <article>
          <span>Workflow</span>
          <h2>Simple for the artist.</h2>
          <p>
            Browse, listen, choose a license, then build your song. For custom work or mix/mastering,
            the process starts with your references, your deadline, and the sound you want people to remember.
          </p>
        </article>
        <article>
          <span>Sound</span>
          <h2>Classic foundation, modern finish.</h2>
          <p>
            The production keeps the classic boom bap language alive while making sure the files are
            clean, organized, and ready for real releases across streaming platforms and video content.
          </p>
        </article>
      </div>

      <section class="about-process">
        <div>
          <span class="about-kicker">How it works</span>
          <h2>From idea to finished record.</h2>
        </div>
        <ol>
          <li><strong>1. Pick the sound.</strong><span>Start with a beat from the catalogue or send a few references: artists, songs, drum feel, mood, release format, and what you want the listener to feel first.</span></li>
          <li><strong>2. Shape the record.</strong><span>We define the structure, vocal space, energy, and file needs. For mix/mastering, the focus is balance, clarity, impact, and keeping the character of the performance intact.</span></li>
          <li><strong>3. Refine the details.</strong><span>Small decisions matter: snare weight, bass control, sample warmth, vocal presence, transitions, headroom, and how the track reacts outside the studio.</span></li>
          <li><strong>4. Deliver clean files.</strong><span>Final exports are organized for the next step: streaming release, video, performance, stems, or future revisions if the project needs to keep moving.</span></li>
        </ol>
      </section>
    </section>
  `;
}
