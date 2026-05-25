import { featuredBeat } from "../data/beats.js?v=3";
import { serviceOffers } from "../data/content.js?v=5";
import { SectionHeader } from "../components/common/SectionHeader.js";
import { Waveform } from "../components/player/Waveform.js";
import { LicenseButtons } from "../components/shop/LicenseButtons.js?v=4";
import { BeatRow } from "../components/shop/BeatRow.js?v=5";
import { Sp1200Panel } from "../components/studio/Sp1200Panel.js?v=2";
import { time } from "../utils/format.js";

export function HomePage(state) {
  const beats = state.beats;
  const filters = ["all", ...new Set(beats.flatMap((beat) => beat.tags || []))];
  const priorityFilters = ["all", "jazzy", "soul", "drums", "freestyle", "guitare"];
  const visibleBeats = state.filter === "all" ? beats : beats.filter((beat) => (beat.tags || []).includes(state.filter));
  const currentSeconds = Math.floor(featuredBeat.durationSeconds * state.featuredProgress);
  const featuredCover = featuredBeat.coverUrl || beats.find((beat) => beat.id === featuredBeat.storeBeatId)?.coverUrl;

  return `
    <section class="featured-section">
      <div class="sp-deco">
        BOOM BAP CHOP SHOP<br>
        READY<br>
        CHOPS: ████████░░<br>
        BPM: ${featuredBeat.bpm}
      </div>
      <div class="featured-label">Dusty Beats. Heavy Drums. Sharp Chops.</div>
      <div class="featured-inner">
        <div class="hero-copy">
          <div class="cat-number">CAT# ${featuredBeat.catalog} · ${featuredBeat.year} · PREMIUM SAMPLE-BASED INSTRUMENTALS</div>
          <h1 class="beat-title-main">REAL SAMPLES.<span>RAW SOUL.</span><span>TIMELESS BANGERS.</span></h1>
          <p class="hero-sub">Authentic Boom Bap instrumentals built from rare samples, heavy drums, and classic sounds.</p>
          <div class="hero-actions">
            <button class="btn-hero primary" data-catalogue type="button">BROWSE BEATS</button>
            <button class="btn-hero outline" data-route="licensing" type="button">LICENSING INFO</button>
          </div>
          <div class="hero-benefits">
            <span>Premium quality</span>
            <span>Instant delivery</span>
            <span>Licensing options</span>
            <span>Built for artists</span>
          </div>
        </div>
      </div>
    </section>
    <section class="featured-player">
      <div class="featured-info">
        ${featuredCover ? `
          <div class="featured-cover-thumb">
            <img src="${featuredCover}" alt="${featuredBeat.name} cover" />
            <span>${featuredBeat.catalog}</span>
          </div>
        ` : ""}
        <div class="featured-player-body">
          <div class="featured-track-head">
            <div>
              <span class="featured-kicker">Featured drop</span>
              <h2>${featuredBeat.name}</h2>
            </div>
            <div class="beat-meta">
              <span class="meta-tag bpm">${featuredBeat.bpm} BPM</span>
              <span class="meta-tag key">${featuredBeat.key}</span>
              <span class="meta-tag mood">${featuredBeat.mood}</span>
              <span class="meta-tag type">${featuredBeat.type}</span>
            </div>
          </div>
          <p class="beat-desc">${featuredBeat.description}</p>
          <div class="player-wrap">
            ${Waveform(state.featuredProgress, "data-featured-wave")}
            <div class="player-controls">
              <button class="btn-play" data-featured-toggle type="button">${state.featuredPlaying ? "Pause" : "Play"}</button>
              <span class="time-display">${time(currentSeconds)} / ${featuredBeat.duration}</span>
              <label class="volume-wrap">VOL <input type="range" min="0" max="100" value="80" /></label>
            </div>
          </div>
          ${LicenseButtons(featuredBeat)}
          <div class="price-note">Instant delivery after checkout · License included</div>
        </div>
      </div>
    </section>
    ${Sp1200Panel(state)}
    ${CrateSeparator()}
    ${TestimonialsSection()}
    <section class="playlist-section" id="catalogue">
      ${SectionHeader("Browse", "Beats", `${visibleBeats.length} tracks`)}
      <div class="catalogue-toolbar">
        <label class="search-box">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search beats, tags, moods..." />
        </label>
        <select aria-label="Sort catalogue">
          <option>Most Recent</option>
          <option>Highest BPM</option>
          <option>Lowest Price</option>
        </select>
      </div>
      <div class="filter-row">
        <span>Tags</span>
        ${filters.map((filter) => `
          <button class="filter-tag ${state.filter === filter ? "active" : ""} ${priorityFilters.includes(filter) ? "" : "mobile-hidden"}" data-filter="${filter}" type="button">
            ${filter === "all" ? "All" : filter}
          </button>
        `).join("")}
      </div>
      <div class="playlist-container">
        ${visibleBeats.map((beat, index) => BeatRow(beat, index, state)).join("")}
      </div>
    </section>
    <section class="shop-info-section" id="services">
      <div class="service-intro">
        <span class="featured-kicker">Mix / Mastering</span>
        <h2>One service: mix plus mastering, ready for release.</h2>
        <p>
          For artists who already recorded their vocals and want the song to translate with weight,
          clarity, and the same raw character as the beat. I do not split mix and master for now:
          the finish is handled as one complete process.
        </p>
      </div>
      <div class="service-workflow">
        <span>How it works</span>
        <ol>
          <li>Send the instrumental, vocal stems, BPM, key if known, and 1 or 2 reference tracks.</li>
          <li>I check the files before starting, then build the vocal balance, low-end control, space, and punch.</li>
          <li>You receive a first version, revisions if included, then final WAV + MP3 exports.</li>
        </ol>
      </div>
      <div class="service-pricing">
        ${serviceOffers.map(ServiceCard).join("")}
      </div>
    </section>
    <section class="licensing-section" id="licensing">
      <div>
        <span class="featured-kicker">Licensing info</span>
        <h2>Clear options for every release.</h2>
      </div>
      <div class="licensing-copy">
        <p>Start with MP3 Basic, upgrade to WAV + stems when you need more control, or lock an exclusive for your campaign. Every purchase keeps the checkout simple and delivery immediate.</p>
        <div class="licensing-mini-list" aria-label="License options">
          <span>MP3 Basic</span>
          <span>WAV Lease</span>
          <span>WAV + Stems</span>
          <span>Exclusive</span>
        </div>
        <button class="licensing-cta" data-route="licensing" type="button">View licensing</button>
      </div>
    </section>
  `;
}

function CrateSeparator() {
  return `
    <div class="crate-sep" aria-hidden="true">
      <div class="crate-records">
        ${Array.from({ length: 10 }, () => `<span></span>`).join("")}
      </div>
      <div class="crate-text">Authentic sounds. Classic vibes. Built to last.</div>
    </div>
  `;
}

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Malo K.",
      role: "Independent artist",
      rating: 5,
      quote: "The beat had that dusty knock without fighting my vocal. I wrote fast, recorded clean, and the final track kept its grit.",
    },
    {
      name: "Nina V.",
      role: "Singer / songwriter",
      rating: 5,
      quote: "Everything felt intentional: warm samples, drums with weight, and enough space to build a real song around the hook.",
    },
    {
      name: "R. Camden",
      role: "Producer",
      rating: 4,
      quote: "Licensing was clear, delivery was quick, and the stems gave me room to shape the record without losing the original feel.",
    },
  ];

  return `
    <section class="testimonials-section" aria-labelledby="testimonials-title">
      <div class="testimonials-head">
        <span class="featured-kicker">Artist feedback</span>
        <h2 id="testimonials-title">Trusted when the verse needs weight.</h2>
      </div>
      <div class="testimonial-grid">
        ${testimonials.map(TestimonialCard).join("")}
      </div>
    </section>
  `;
}

function TestimonialCard(item) {
  const stars = Array.from({ length: 5 }, (_, index) => `
    <span class="${index < item.rating ? "filled" : ""}" aria-hidden="true">★</span>
  `).join("");

  return `
    <article class="testimonial-card">
      <div class="testimonial-rating" aria-label="${item.rating} out of 5 stars">${stars}</div>
      <p>“${item.quote}”</p>
      <footer>
        <strong>${item.name}</strong>
        <span>${item.role}</span>
      </footer>
    </article>
  `;
}

function ServiceCard(offer) {
  return `
    <article class="service-card ${offer.highlighted ? "featured" : ""}">
      <span>${offer.tag}</span>
      <h3>${offer.name}</h3>
      <strong>${offer.price.toFixed(2)}€</strong>
      <p>${offer.description}</p>
      <ul>
        ${offer.includes.map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <button
        class="service-add"
        data-service-cart
        data-name="${offer.name}"
        data-price="${offer.price}"
        data-summary="${offer.summary}"
        data-includes="${offer.includes.join("|")}"
        type="button"
      >
        Add service
      </button>
    </article>
  `;
}

function InfoCard(title, copy, meta, id = "") {
  return `
    <article class="shop-info-card" ${id ? `id="${id}"` : ""}>
      <span>${title}</span>
      <p>${copy}</p>
      <small>${meta}</small>
    </article>
  `;
}
