// build.js — Unified static site builder for Iron Hook Boxing
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

// ── Config ─────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const md = new MarkdownIt({ html: true, breaks: true, linkify: true, typographer: true });

const CONFIG = {
  // Content sources
  programsDir:   "./content/programs",
  sponsorsDir:   "./content/sponsors",
  blogDir:       "./content/blog",

  // Templates
  mainTemplate:  "./template.html",
  listTemplate:  "./template-list.html",
  postTemplate:  "./template-post.html",

  // Outputs (all in root — no public/ folder)
  mainOutput:    "./index.html",
  blogList:      "./blog.html",
  blogDirOut:    "./blog",
  dataJson:      "./data.json",
};

// ── Utilities ──────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const slugify = (f) => path.basename(f, ".md").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" })[c]);
const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
const fixImg = (p) => {
  if (!p) return "";
  if (p.startsWith("/images/")) return p;
  if (p.startsWith("public/images/")) return p.replace("public/images/", "/images/");
  if (p.startsWith("images/")) return "/" + p;
  return p;
};

// ── Markdown loader ────────────────────────────────────────────────
function loadCollection(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data, content } = matter(raw);
      return { ...data, content: md.render(content), filename: f };
    });
}

// ── Main site renders ──────────────────────────────────────────────
function renderPrograms(list) {
  return list.map((p) => `
    <div class="program-row bg-iron-card border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex-1">
        <h3 class="text-lg font-bold text-white mb-2">${esc(p.title)}</h3>
        <div class="text-gray-400 text-sm mb-4">${esc(p.schedule)}</div>
        <div class="text-gray-500 text-sm">${p.content}</div>
      </div>
      <a href="${esc(p.button_link || "/classes")}"
         class="inline-flex items-center px-6 py-2.5 bg-iron-green text-black text-sm font-bold rounded-full hover:bg-iron-green-dark transition-all">
        ${esc(p.button_text || "VIEW CLASS")}
      </a>
    </div>`).join("");
}

function renderSponsors(list) {
  return list.map((s) => `
    <a href="${esc(s.website)}" target="_blank" rel="noopener noreferrer"
       class="sponsor-logo bg-iron-card border border-gray-800 rounded-xl p-2 flex items-center justify-center aspect-[3/2] overflow-hidden">
      <img src="${fixImg(s.logo)}" alt="${esc(s.name)}" class="w-full h-full object-contain" loading="lazy" />
    </a>`).join("");
}

// ── Blog renders ───────────────────────────────────────────────────
function blogCard(post, url) {
  const tags = post.data.tags?.map((t) => `<span class="tag">#${esc(t)}</span>`).join("") ?? "";
  const excerpt = esc(post.data.excerpt || post.content.substring(0, 160).replace(/\n/g, " ").trim() + "...");
  return `
  <a href="${url}" class="blog-card rounded-2xl overflow-hidden border border-white/10 bg-iron-card p-6 group">
    <div class="flex flex-col gap-4">
      ${post.data.image ? `
      <div class="w-full h-48 flex-shrink-0 overflow-hidden rounded-xl">
        <img src="${esc(fixImg(post.data.image))}" alt="${esc(post.data.title)}"
             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
      </div>` : ""}
      <div>
        <div class="flex items-center gap-3 text-sm text-gray-500 mb-2">
          <time datetime="${post.data.date}">${fmtDate(post.data.date)}</time>
          ${post.data.author ? `• <span>${esc(post.data.author)}</span>` : ""}
        </div>
        <h3 class="text-xl font-black mb-2 group-hover:text-iron-green transition-colors line-clamp-2">${esc(post.data.title)}</h3>
        <p class="text-gray-400 mb-4 excerpt">${excerpt}</p>
        ${tags ? `<div class="flex flex-wrap">${tags}</div>` : ""}
      </div>
    </div>
  </a>`;
}

function renderBlogList(template, posts) {
  const has = posts.length > 0;
  const cards = has ? posts.map((p) => blogCard(p, `./blog/${p.slug}.html`)).join("\n") : "";
  let html = template;
  if (has) {
    html = html.replace(/{{#HAS_POSTS}}[\s\S]*?{{\/HAS_POSTS}}/, `<div class="grid md:grid-cols-2 gap-6">\n${cards}\n</div>`);
    html = html.replace(/{{\^HAS_POSTS}}[\s\S]*?{{\/\^HAS_POSTS}}/, "");
  } else {
    html = html.replace(/{{#HAS_POSTS}}[\s\S]*?{{\/HAS_POSTS}}/, "");
    html = html.replace(/{{\^HAS_POSTS}}[\s\S]*?{{\/\^HAS_POSTS}}/, `<div class="text-center py-20 bg-iron-card rounded-2xl border border-white/10"><p class="text-gray-400 text-lg">No blog posts yet.</p><p class="text-gray-500 text-sm mt-2">Check back soon!</p></div>`);
  }
  return html.replace(/{{BLOG_CARDS}}/g, cards);
}

function renderPostPage(template, post) {
  let html = template;
  const hero = post.data.image ? fixImg(post.data.image) : "";
  const tags = post.data.tags?.map((t) => `<span class="tag">#${esc(t)}</span>`).join("") ?? "";

  // Conditionals
  if (hero) {
    html = html.replace(/{{#POST_IMAGE}}[\s\S]*?{{\/POST_IMAGE}}/, `<div class="absolute inset-0 bg-cover bg-center opacity-40" style="background-image:url('${esc(hero)}');"></div>`);
  } else {
    html = html.replace(/{{#POST_IMAGE}}[\s\S]*?{{\/POST_IMAGE}}/, "");
  }
  if (post.data.author) {
    html = html.replace(/{{#POST_AUTHOR}}[\s\S]*?{{\/POST_AUTHOR}}/, `<span>By <strong class="text-white">${esc(post.data.author)}</strong></span>`);
  } else {
    html = html.replace(/{{#POST_AUTHOR}}[\s\S]*?{{\/POST_AUTHOR}}/, "");
  }

  // Simple placeholders
  return html
    .replace(/{{POST_TITLE}}/g, esc(post.data.title))
    .replace(/{{POST_DATE}}/g, post.data.date || "")
    .replace(/{{POST_DATE_FORMATTED}}/g, post.data.date ? fmtDate(post.data.date) : "")
    .replace(/{{POST_AUTHOR}}/g, esc(post.data.author || ""))
    .replace(/{{POST_IMAGE}}/g, esc(hero))
    .replace(/{{POST_TAGS}}/g, tags)
    .replace(/{{POST_CONTENT}}/g, md.render(post.content));
}

// ── Build steps ────────────────────────────────────────────────────
function buildMain() {
  console.log("🔨  Building main site…");
  const programs = loadCollection(CONFIG.programsDir);
  const sponsors = loadCollection(CONFIG.sponsorsDir);

  fs.writeFileSync(CONFIG.dataJson, JSON.stringify({ programs, sponsors }, null, 2));

  const tpl = fs.readFileSync(CONFIG.mainTemplate, "utf-8");
  const out = tpl
    .replace("{{PROGRAMS}}", renderPrograms(programs))
    .replace("{{SPONSORS}}", renderSponsors(sponsors));

  fs.writeFileSync(CONFIG.mainOutput, out);
  console.log(`✅  ${CONFIG.mainOutput}`);
}

function buildBlog() {
  console.log("🔨  Building blog…");
  if (!fs.existsSync(CONFIG.blogDir)) {
    console.log("⚠️  No blog content found");
    return;
  }

  // Clean & recreate output dir
  if (fs.existsSync(CONFIG.blogDirOut)) fs.rmSync(CONFIG.blogDirOut, { recursive: true, force: true });
  ensureDir(CONFIG.blogDirOut);

  const posts = fs.readdirSync(CONFIG.blogDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(CONFIG.blogDir, f), "utf-8");
      const { data, content } = matter(raw);
      return { filename: f, slug: slugify(f), data, content };
    })
    .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

  console.log(`📄  ${posts.length} post(s) loaded`);

  // Individual posts
  const postTpl = fs.readFileSync(CONFIG.postTemplate, "utf-8");
  for (const post of posts) {
    const html = renderPostPage(postTpl, post);
    fs.writeFileSync(path.join(CONFIG.blogDirOut, `${post.slug}.html`), html, "utf-8");
    console.log(`   ✓  blog/${post.slug}.html`);
  }

  // Listing page
  const listTpl = fs.readFileSync(CONFIG.listTemplate, "utf-8");
  const listHtml = renderBlogList(listTpl, posts);
  fs.writeFileSync(CONFIG.blogList, listHtml, "utf-8");
  console.log(`✅  ${CONFIG.blogList}`);
}

// ── Run ────────────────────────────────────────────────────────────
console.log("🚀  Starting build…\n");
try {
  buildMain();
  buildBlog();
  console.log("\n🎉  Build complete!");
  console.log("\n📍  Output files:");
  console.log(`   • ${CONFIG.mainOutput}`);
  console.log(`   • ${CONFIG.blogList}`);
  console.log(`   • ${CONFIG.blogDirOut}/*.html`);
  console.log(`   • ${CONFIG.dataJson}`);
} catch (err) {
  console.error("❌  Build failed:", err.message);
  process.exit(1);
}