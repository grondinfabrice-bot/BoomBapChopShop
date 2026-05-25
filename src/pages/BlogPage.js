import { SectionHeader } from "../components/common/SectionHeader.js";

export function BlogPage(state) {
  const posts = state.posts;
  const categories = ["all", ...new Set(posts.map((post) => post.category))];
  const visiblePosts = posts.filter((post) => {
    const categoryMatches = state.blogCategory === "all" || post.category === state.blogCategory;
    const tagMatches = !state.blogTag || post.tags.includes(state.blogTag);
    return categoryMatches && tagMatches;
  });
  const featured = visiblePosts.find((post) => post.featured) || visiblePosts[0];
  const regular = featured ? visiblePosts.filter((post) => post.id !== featured.id) : [];
  const activePost = posts.find((post) => post.id === state.activePostId);

  if (activePost) return ArticleView(activePost);

  return `
    <section class="blog-wrap">
      ${SectionHeader("Crate", "Notes", "Stories, culture, licensing")}
      ${state.blogTag ? `<button class="blog-filter-clear" data-blog-clear type="button">Showing tag: ${state.blogTag} - clear filter</button>` : ""}
      ${featured ? `
      <article class="blog-featured">
        ${BlogCover(featured, "blog-feat-cover")}
        <div class="blog-featured-copy">
          <span class="blog-cat">${featured.category}</span>
          <button class="blog-feat-title" data-blog-post="${featured.id}" type="button">${featured.title}</button>
          <p>${featured.excerpt}</p>
          <div class="blog-meta"><span>${featured.date}</span><span>${featured.readTime} read</span></div>
          <button class="blog-read-more" data-blog-post="${featured.id}" type="button">Read more</button>
        </div>
      </article>
      <div class="blog-grid">
        ${regular.map(PostCard).join("")}
      </div>
      ` : `<div class="blog-empty">No notes found for this filter.</div>`}
      ${BlogNav(categories, state.blogCategory)}
    </section>
  `;
}

function PostCard(post) {
  return `
    <article class="blog-card" data-blog-post="${post.id}">
      ${BlogCover(post, "blog-card-cover")}
      <div class="blog-card-body">
        <span class="blog-cat">${post.category}</span>
        <div class="blog-tag-row">${post.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="blog-card-meta">${post.date} · ${post.readTime}</div>
      </div>
    </article>
  `;
}

function BlogCover(post, className) {
  return post.imageUrl
    ? `<div class="${className} has-image">
        <img class="blog-cover-image" src="${post.imageUrl}" alt="${post.title}" loading="lazy" decoding="async" />
      </div>`
    : `<div class="${className} ${post.tone}">
        <div class="blog-machine-tag">${post.art}</div>
      </div>`;
}

function ArticleView(post) {
  const articleCover = post.imageUrl
    ? `<img class="blog-article-cover-image" src="${post.imageUrl}" alt="${post.title}" loading="eager" decoding="async" />`
    : `<div class="blog-feat-cover ${post.tone}">
        <div class="blog-machine-tag">${post.art}</div>
      </div>`;

  return `
    <section class="blog-wrap">
      <button class="blog-back" data-blog-back type="button">Back to notes</button>
      <article class="blog-article">
        ${articleCover}
        <div class="blog-article-head">
          <span class="blog-cat">${post.category}</span>
          <h1>${post.title}</h1>
          <p>${post.excerpt}</p>
          <div class="blog-meta"><span>${post.date}</span><span>${post.readTime} read</span></div>
        </div>
        <div class="blog-article-body">
          ${post.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
        </div>
        <div class="blog-article-tags">
          ${post.tags.map((tag) => `<button data-blog-tag="${tag}" type="button">${tag}</button>`).join("")}
        </div>
      </article>
    </section>
  `;
}

function BlogNav(categories, activeCategory) {
  return `
    <nav class="blog-bottom-nav" aria-label="Blog categories">
      <div>
        <span>Browse notes</span>
        <p>Jump by category and keep exploring the shop notes.</p>
      </div>
      <div class="blog-bottom-links">
        ${categories.map((category) => `
          <button class="${activeCategory === category ? "active" : ""}" data-blog-category="${category}" type="button">
            ${category === "all" ? "All notes" : category}
          </button>
        `).join("")}
      </div>
    </nav>
  `;
}
