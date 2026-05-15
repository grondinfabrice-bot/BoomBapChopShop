import { posts } from "../data/content.js";
import { SectionHeader } from "../components/common/SectionHeader.js";

export function BlogPage() {
  const featured = posts.find((post) => post.featured);
  const regular = posts.filter((post) => !post.featured);

  return `
    <section class="blog-wrap">
      ${SectionHeader("Chop", "Notes", "Culture, gear, licensing")}
      <article class="blog-featured">
        <div class="blog-feat-cover ${featured.tone}">
          <div class="blog-machine-tag">${featured.art}</div>
        </div>
        <div class="blog-featured-copy">
          <span class="blog-cat">${featured.category}</span>
          <button class="blog-feat-title" data-toast="Full article coming soon" type="button">${featured.title}</button>
          <p>${featured.excerpt}</p>
          <div class="blog-meta"><span>${featured.date}</span><span>${featured.readTime} read</span></div>
          <button class="blog-read-more" data-toast="Full article coming soon" type="button">Read more</button>
        </div>
      </article>
      <div class="blog-grid">
        ${regular.map(PostCard).join("")}
      </div>
    </section>
  `;
}

function PostCard(post) {
  return `
    <article class="blog-card" data-toast="Article coming soon">
      <div class="blog-card-cover ${post.tone}">
        <div class="blog-machine-tag">${post.art}</div>
      </div>
      <div class="blog-card-body">
        <span class="blog-cat">${post.category}</span>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="blog-card-meta">${post.date} · ${post.readTime}</div>
      </div>
    </article>
  `;
}
