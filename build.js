// build.js — Iron Hook Boxing static site builder
// Zero external templates. Everything generated programmatically.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const md = new MarkdownIt({ html: true, breaks: true, linkify: true, typographer: true });

const CFG = {
  programsDir: "./content/programs",
  sponsorsDir: "./content/sponsors",
  blogDir:     "./content/blog",
  outDir:      ".",
  blogOutDir:  "./blog",
  dataJson:    "./data.json",
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

// ── Shared HTML Snippets ───────────────────────────────────────────
const SHARED_HEAD = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<script>
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['Inter','sans-serif'] },
      colors: {
        'iron-green':'#84cc16','iron-green-dark':'#65a30d','iron-dark':'#0a0a0a',
        'iron-gray':'#1a1a1a','iron-card':'#111111','ygreen-light':'#d4f5a2',
        'ygreen-dark':'#6b8e23','ygreen-top':'#8db800','ygreen-bottom':'#5a7a00'
      }
    }
  }
};
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mobile-menu-button');
  const menu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
      if (iconOpen) iconOpen.classList.toggle('hidden');
      if (iconClose) iconClose.classList.toggle('hidden');
    });
  }
});
</script>
<style>
body{background:#0a0a0a}
::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:#0a0a0a}
::-webkit-scrollbar-thumb{background:#84cc16;border-radius:999px}
.hero-fade{background:linear-gradient(to bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.6),#0a0a0a)}
.service-card{transition:0.35s ease}.service-card:hover{transform:translateY(-10px)}
.program-row{transition:0.3s}.program-row:hover{transform:translateY(-5px);border-left:4px solid #84cc16;background:rgba(132,204,22,0.05)}
.sponsor-logo{transition:0.3s;filter:grayscale(100%);opacity:0.7}.sponsor-logo:hover{filter:grayscale(0%);opacity:1}
.btn-glow:hover{box-shadow:0 0 25px rgba(132,204,22,0.4)}
.blog-card{transition:0.3s ease;border-left:3px solid transparent;display:block;text-decoration:none}
.blog-card:hover{transform:translateY(-5px);border-left:4px solid #84cc16;background:rgba(132,204,22,0.05)}
.tag{display:inline-block;padding:0.25rem 0.75rem;background:rgba(132,204,22,0.15);color:#84cc16;border-radius:999px;font-size:0.75rem;font-weight:500;margin:0.25rem 0.25rem 0.25rem 0}
.excerpt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.post-content{color:#e5e7eb;line-height:1.8}
.post-content h1{font-size:2rem;font-weight:800;margin:2rem 0 1rem;color:#fff}
.post-content h2{font-size:1.5rem;font-weight:700;margin:1.75rem 0 0.75rem;color:#fff}
.post-content h3{font-size:1.25rem;font-weight:600;margin:1.25rem 0 0.5rem;color:#fff}
.post-content p{margin:1rem 0}
.post-content a{color:#84cc16;text-decoration:none;border-bottom:1px dashed #84cc16}
.post-content a:hover{border-bottom-style:solid}
.post-content ul,.post-content ol{padding-left:1.5rem;margin:1rem 0}
.post-content li{margin:0.5rem 0}
.post-content blockquote{border-left:4px solid #84cc16;padding:1rem 1.5rem;margin:1.5rem 0;background:rgba(132,204,22,0.08);border-radius:0 8px 8px 0;font-style:italic;color:#d1d5db}
.post-content code{background:#1a1a1a;padding:0.2rem 0.4rem;border-radius:4px;font-family:monospace;color:#84cc16}
.post-content pre{background:#111;padding:1rem;border-radius:8px;overflow-x:auto;margin:1rem 0}
.back-link{display:inline-flex;align-items:center;gap:0.5rem;color:#84cc16;font-weight:500;text-decoration:none;transition:gap 0.2s}
.back-link:hover{gap:0.75rem}
@media (max-width: 640px) {
  .post-content h1 { font-size: 1.75rem; }
  .post-content h2 { font-size: 1.35rem; }
  .post-content h3 { font-size: 1.15rem; }
}
</style>
`;

const NAV = `
<nav class="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="h-20 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <img src="/images/Screenshot 2026-05-23 215930-Photoroom.png" alt="Iron Hook Boxing Logo" class="h-12 w-auto">
      </a>
      
      <!-- Mobile menu button -->
      <button id="mobile-menu-button" class="md:hidden text-white focus:outline-none p-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path id="menu-icon-open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          <path id="menu-icon-close" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <div class="hidden md:flex items-center gap-8">
        <a href="/" class="hover:text-iron-green transition">Home</a>
        <a href="/blog.html" class="hover:text-iron-green transition">Blog</a>
        <a href="/#about" class="hover:text-iron-green transition">About us</a>
        <a href="https://ironhookboxing.sites.zenplanner.com/calendar.cfm" class="hover:text-iron-green transition">Calender</a>
        <a href="https://ironhookboxing.sites.zenplanner.com/scheduler.cfm" class="hover:text-iron-green transition">Make Appointment</a>
        <a href="/contact.html" class="hover:text-iron-green transition">contact</a>
      </div>
      <a href="https://ironhookboxing.sites.zenplanner.com/sign-up-now.cfm" class="hidden md:inline-flex px-6 py-3 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold btn-glow">JOIN NOW</a>
    </div>
  </div>
  
  <!-- Mobile menu panel -->
  <div id="mobile-menu" class="hidden md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col gap-4">
    <a href="/" class="hover:text-iron-green transition py-2 border-b border-white/5">Home</a>
    <a href="/blog.html" class="hover:text-iron-green transition py-2 border-b border-white/5">Blog</a>
    <a href="/#about" class="hover:text-iron-green transition py-2 border-b border-white/5">About us</a>
    <a href="https://ironhookboxing.sites.zenplanner.com/calendar.cfm" class="hover:text-iron-green transition py-2 border-b border-white/5">Calender</a>
    <a href="https://ironhookboxing.sites.zenplanner.com/scheduler.cfm" class="hover:text-iron-green transition py-2 border-b border-white/5">Make Appointment</a>
    <a href="/contact.html" class="hover:text-iron-green transition py-2 border-b border-white/5">contact</a>
    <a href="https://ironhookboxing.sites.zenplanner.com/sign-up-now.cfm" class="inline-flex px-6 py-3 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold btn-glow text-center mt-2">JOIN NOW</a>
  </div>
</nav>
`;

const FOOTER = `
<footer class="bg-iron-gray border-t border-gray-800 pt-12 md:pt-16 pb-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
      <div class="sm:col-span-2 md:col-span-1">
        <a href="/" class="flex items-center gap-3"><img src="/images/Screenshot 2026-05-23 215930-Photoroom.png" alt="Logo" class="h-12 w-auto"></a>
        <p class="text-gray-500 text-sm mt-4">Developed by ehsanagency</p>
      </div>
      <div>
        <h4 class="text-white font-bold mb-4">About us</h4>
        <ul class="space-y-3">
          <li><a href="#" class="text-gray-400 hover:text-iron-green transition-colors text-sm">Our Story</a></li>
          <li><a href="#" class="text-gray-400 hover:text-iron-green transition-colors text-sm">T & C</a></li>
          <li><a href="#" class="text-gray-400 hover:text-iron-green transition-colors text-sm">Privacy Policy</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-bold mb-4">Socials</h4>
        <ul class="space-y-3">
          <li><a href="https://instagram.com/ironhookboxing" class="text-gray-400 hover:text-iron-green transition-colors text-sm">Instagram</a></li>
          <li><a href="#" class="text-gray-400 hover:text-iron-green transition-colors text-sm">Facebook</a></li>
          <li><a href="#" class="text-gray-400 hover:text-iron-green transition-colors text-sm">Tiktok</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-bold mb-4">Visit us</h4>
        <p class="text-gray-400 text-sm leading-relaxed">646 North East Road,<br>Adelaide, South Australia</p>
      </div>
    </div>
    <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <p class="text-gray-500 text-sm text-center md:text-left">Copyright © 2026 Iron Hook | Powered by Astra WordPress Theme</p>
    </div>
  </div>
</footer>
`;

const CTA_SECTION = `
<section class="py-12 md:py-16 border-t border-white/10">
  <div class="max-w-4xl mx-auto px-4 text-center">
    <h2 class="text-2xl md:text-3xl lg:text-4xl font-black mb-4 md:mb-6">Ready to Train?</h2>
    <p class="text-gray-400 text-base md:text-lg mb-6 md:mb-8">Experience Iron Hook Boxing firsthand with a free introductory class.</p>
    <a href="https://ironhookboxing.sites.zenplanner.com/sign-up-now.cfm" class="inline-flex px-6 md:px-8 py-3 md:py-4 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-base md:text-lg btn-glow">CLAIM YOUR FREE CLASS</a>
  </div>
</section>
`;

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

// ── Render helpers ─────────────────────────────────────────────────
function renderPrograms(list) {
  return list.map((p) => `
    <div class="program-row bg-iron-card border border-gray-800 rounded-xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex-1">
        <h3 class="text-lg font-bold text-white mb-2">${esc(p.title)}</h3>
        <div class="text-gray-400 text-sm mb-4">${esc(p.schedule)}</div>
        <div class="text-gray-500 text-sm">${p.content}</div>
      </div>
      <a href="${esc(p.button_link || "/classes")}" class="inline-flex items-center justify-center px-6 py-2.5 bg-iron-green text-black text-sm font-bold rounded-full hover:bg-iron-green-dark transition-all w-full md:w-auto">${esc(p.button_text || "VIEW CLASS")}</a>
    </div>`).join("");
}

function renderSponsors(list) {
  return list.map((s) => `
    <a href="${esc(s.website)}" target="_blank" rel="noopener noreferrer" class="sponsor-logo bg-iron-card border border-gray-800 rounded-xl p-2 flex items-center justify-center aspect-[3/2] overflow-hidden">
      <img src="${fixImg(s.logo)}" alt="${esc(s.name)}" class="w-full h-full object-contain" loading="lazy" />
    </a>`).join("");
}

function blogCard(post, url) {
  const tags = post.data.tags?.map((t) => `<span class="tag">#${esc(t)}</span>`).join("") ?? "";
  const excerpt = esc(post.data.excerpt || post.content.substring(0, 160).replace(/\n/g, " ").trim() + "...");
  return `
  <a href="${url}" class="blog-card rounded-2xl overflow-hidden border border-white/10 bg-iron-card p-4 md:p-6 group">
    <div class="flex flex-col gap-4">
      ${post.data.image ? `
      <div class="w-full h-48 flex-shrink-0 overflow-hidden rounded-xl">
        <img src="${esc(fixImg(post.data.image))}" alt="${esc(post.data.title)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
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

// ── Page Generators ────────────────────────────────────────────────
function buildIndex(programs, sponsors) {
  const programsHtml = renderPrograms(programs);
  const sponsorsHtml = renderSponsors(sponsors);

  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <title>Iron Hook Boxing</title>
  ${SHARED_HEAD}
</head>
<body class="text-white font-sans antialiased">
${NAV}

<!-- HERO -->
<section id="home" class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <div class="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image:url('/images/Screenshot 2026-05-23 221640.png');"></div>
  <div class="block md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat" style="background-image:url('/images/Screenshot 2026-05-23 221656.png');"></div>
  <div class="relative z-10 text-center max-w-5xl px-4 pt-24">
    <h1 class="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight">Founded on Brotherhood. <span>Built on Discipline.</span></h1>
    <div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
      <a href="https://ironhookboxing.sites.zenplanner.com/scheduler.cfm" class="px-6 py-3 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-sm font-bold uppercase tracking-wide btn-glow">EXPERIENCE YOUR FREE CLASS</a>
      <a href="https://ironhookboxing.sites.zenplanner.com/login.cfm" class="px-6 py-3 rounded-full border border-white/20 hover:border-iron-green hover:text-iron-green transition text-sm font-medium uppercase tracking-wide">CLAIM YOUR MEMBERSHIP</a>
    </div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 h-52 hero-fade"></div>
</section>

<!-- ABOUT -->
<section id="about" class="py-16 md:py-24">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid lg:grid-cols-2 gap-10 md:gap-20 items-center">
      <div class="relative h-[350px] sm:h-[450px] md:h-[650px]">
        <div class="absolute top-5 left-0 w-[45%] h-[60%] md:top-10 md:h-[70%] rounded-3xl overflow-hidden border border-white/10">
          <img src="/images/Screenshot 2026-05-23 222250.png" alt="Gym" class="w-full h-full object-cover" loading="lazy">
        </div>
        <div class="absolute right-0 top-0 w-[65%] h-[85%] md:h-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <img src="/images/Screenshot 2026-05-23 222239.png" alt="Boxing" class="w-full h-full object-cover" loading="lazy">
        </div>
      </div>
      <div>
        <h2 class="text-3xl md:text-5xl font-black mb-6 md:mb-8">About Us</h2>
        <p class="text-gray-400 text-base md:text-lg leading-relaxed mb-8 md:mb-10">Iron Hook Boxing is focused on building confidence, discipline, fitness, and strong community culture through boxing and structured training.</p>
        <div class="grid grid-cols-2 gap-3 md:gap-4">
          <div class="bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-center py-3 md:py-4 rounded-full text-sm md:text-base">Brotherhood</div>
          <div class="bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-center py-3 md:py-4 rounded-full text-sm md:text-base">Discipline</div>
          <div class="bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-center py-3 md:py-4 rounded-full text-sm md:text-base">Respect</div>
          <div class="bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-center py-3 md:py-4 rounded-full text-sm md:text-base">Community</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services" class="py-16 md:py-24">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl md:text-5xl font-black text-center mb-10 md:mb-16">Offered Services</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      ${["Group Boxing","Personal Training","Youth Programs","Competition Coaching"].map((t,i) => `
      <div class="service-card rounded-3xl overflow-hidden border border-white/10 bg-iron-card">
        <div class="relative aspect-[4/5]">
          <img src="/images/Screenshot 2026-05-23 221656.png" alt="${t}" class="absolute inset-0 w-full h-full object-cover" loading="lazy">
          <div class="absolute inset-0 bg-black/40"></div>
          <div class="absolute bottom-0 p-6"><h3 class="text-2xl font-black">${t}</h3></div>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>

<!-- PROGRAMS -->
<section id="programs" class="py-16 md:py-24">
  <div class="max-w-5xl mx-auto px-4">
    <div class="mb-10 md:mb-14">
      <h2 class="text-3xl md:text-5xl font-black">Workout Programs</h2>
      <p class="text-gray-400 text-lg md:text-2xl mt-2">Made For You</p>
    </div>
    <div class="space-y-5">${programsHtml}</div>
  </div>
</section>

<!-- SPONSORS -->
<section id="sponsors" class="py-16 md:py-24 border-t border-white/10">
  <div class="max-w-7xl mx-auto px-4">
    <h2 class="text-3xl md:text-5xl font-black text-center mb-10 md:mb-16">Proud Sponsors</h2>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">${sponsorsHtml}</div>
  </div>
</section>

<!-- INSTAGRAM -->
<section id="social" class="py-16 md:py-32 bg-iron-dark border-t border-gray-800">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-10 md:mb-16">
      <h2 class="text-3xl md:text-5xl font-black mb-4">Follow us on Social</h2>
      <p class="text-lg md:text-xl text-gray-400">Never miss an update!</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 justify-center">
      ${[ "https://www.instagram.com/reel/DXogRySD0CX/", "https://www.instagram.com/p/DXTrzaTFXfy/", "https://www.instagram.com/p/DXL-i6hE87r/", "https://www.instagram.com/p/DXBXr-vE_I3/" ].map((url) => `
      <div class="bg-white rounded-xl p-3 shadow-lg flex-shrink-0 w-full max-w-[340px] mx-auto">
        <div class="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-50">
          <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${url}?utm_source=ig_embed&utm_campaign=loading" data-instgrm-version="14" style="background:#FFF;border:0;border-radius:3px;box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);margin:0;width:100%;max-width:100%;min-width:0;height:100%;">
            <div style="padding:16px;height:100%;">
              <a href="${url}?utm_source=ig_embed&utm_campaign=loading" style="background:#FFFFFF;line-height:0;padding:0 0;text-align:center;text-decoration:none;width:100%;height:100%;display:block;" target="_blank" rel="noopener noreferrer">
                <div style="display:flex;flex-direction:row;align-items:center;">
                  <div style="background-color:#F4F4F4;border-radius:50%;flex-grow:0;height:40px;margin-right:14px;width:40px;"></div>
                  <div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;">
                    <div style="background-color:#F4F4F4;border-radius:4px;flex-grow:0;height:14px;margin-bottom:6px;width:100px;"></div>
                    <div style="background-color:#F4F4F4;border-radius:4px;flex-grow:0;height:14px;width:60px;"></div>
                  </div>
                </div>
                <div style="padding:19% 0;"></div>
                <div style="display:block;height:50px;margin:0 auto 12px;width:50px;">
                  <svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000,-20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg>
                </div>
                <div style="padding-top:8px;"><div style="color:#3897f0;font-family:Arial,sans-serif;font-size:14px;font-style:normal;font-weight:550;line-height:18px;">View this post on Instagram</div></div>
                <div style="padding:12.5% 0;"></div>
                <div style="display:flex;flex-direction:row;margin-bottom:14px;align-items:center;">
                  <div>
                    <div style="background-color:#F4F4F4;border-radius:50%;height:12.5px;width:12.5px;transform:translateX(0px) translateY(7px);"></div>
                    <div style="background-color:#F4F4F4;height:12.5px;transform:rotate(-45deg) translateX(3px) translateY(1px);width:12.5px;flex-grow:0;margin-right:14px;margin-left:2px;"></div>
                    <div style="background-color:#F4F4F4;border-radius:50%;height:12.5px;width:12.5px;transform:translateX(9px) translateY(-18px);"></div>
                  </div>
                  <div style="margin-left:8px;">
                    <div style="background-color:#F4F4F4;border-radius:50%;flex-grow:0;height:20px;width:20px;"></div>
                    <div style="width:0;height:0;border-top:2px solid transparent;border-left:6px solid #f4f4f4;border-bottom:2px solid transparent;transform:translateX(16px) translateY(-4px) rotate(30deg)"></div>
                  </div>
                  <div style="margin-left:auto;">
                    <div style="width:0px;border-top:8px solid #F4F4F4;border-right:8px solid transparent;transform:translateY(16px);"></div>
                    <div style="background-color:#F4F4F4;flex-grow:0;height:12px;width:16px;transform:translateY(-4px);"></div>
                    <div style="width:0;height:0;border-top:8px solid #F4F4F4;border-left:8px solid transparent;transform:translateY(-4px) translateX(8px);"></div>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;flex-grow:1;justify-content:center;margin-bottom:24px;">
                  <div style="background-color:#F4F4F4;border-radius:4px;flex-grow:0;height:14px;margin-bottom:6px;width:224px;"></div>
                  <div style="background-color:#F4F4F4;border-radius:4px;flex-grow:0;height:14px;width:144px;"></div>
                </div>
              </a>
            </div>
          </blockquote>
        </div>
      </div>`).join("")}
    </div>
    <div class="mt-12 flex justify-center gap-6">
      <a href="https://instagram.com/ironhookboxing" class="text-gray-400 hover:text-iron-green transition-colors" target="_blank" rel="noopener noreferrer">
        <span class="sr-only">Instagram</span>
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      </a>
      <a href="#" class="text-gray-400 hover:text-iron-green transition-colors">
        <span class="sr-only">Facebook</span>
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <a href="#" class="text-gray-400 hover:text-iron-green transition-colors">
        <span class="sr-only">TikTok</span>
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
      </a>
    </div>
  </div>
</section>
<script async src="https://www.instagram.com/embed.js"></script>

${FOOTER}
</body>
</html>`;

  fs.writeFileSync(path.join(CFG.outDir, "index.html"), html, "utf-8");
  console.log("✅  index.html");
}

function buildBlogList(posts) {
  const hasPosts = posts.length > 0;
  const cards = hasPosts ? posts.map((p) => blogCard(p, `./blog/${p.slug}.html`)).join("\n") : "";
  const grid = hasPosts ? `<div class="grid md:grid-cols-2 gap-6">${cards}</div>` : `<div class="text-center py-20 bg-iron-card rounded-2xl border border-white/10"><p class="text-gray-400 text-lg">No blog posts yet.</p><p class="text-gray-500 text-sm mt-2">Check back soon!</p></div>`;

  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <title>Blog | Iron Hook Boxing</title>
  ${SHARED_HEAD}
</head>
<body class="text-white font-sans antialiased">
${NAV}

<section class="relative pt-32 pb-16 overflow-hidden">
  <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image:url('/images/Screenshot 2026-05-23 221640.png');"></div>
  <div class="absolute inset-0 bg-gradient-to-b from-iron-dark/80 to-iron-dark"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4 text-center">
    <span class="inline-block px-4 py-1 rounded-full bg-iron-green/20 text-iron-green text-sm font-medium mb-4">Latest Updates</span>
    <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">The Iron Hook Journal</h1>
    <p class="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">Training tips, community stories, and insights from the Iron Hook family.</p>
  </div>
</section>

<main class="py-16">
  <div class="max-w-5xl mx-auto px-4">${grid}</div>
</main>

${CTA_SECTION}
${FOOTER}
</body>
</html>`;

  fs.writeFileSync(path.join(CFG.outDir, "blog.html"), html, "utf-8");
  console.log("✅  blog.html");
}

function buildBlogPost(post) {
  const tags = post.data.tags?.map((t) => `<span class="tag">#${esc(t)}</span>`).join("") ?? "";
  const hero = post.data.image ? fixImg(post.data.image) : "";
  const heroDiv = hero ? `<div class="absolute inset-0 bg-cover bg-center opacity-30" style="background-image:url('${esc(hero)}');"></div>` : "";
  const authorSpan = post.data.author ? `<span>By <strong class="text-white">${esc(post.data.author)}</strong></span>` : "";

  const html = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <title>${esc(post.data.title)} | Iron Hook Boxing</title>
  <meta name="description" content="${esc(post.data.excerpt || "")}">
  ${SHARED_HEAD}
</head>
<body class="text-white font-sans antialiased">
${NAV}

<section class="relative pt-32 pb-8 overflow-hidden">
  ${heroDiv}
  <div class="absolute inset-0 bg-gradient-to-b from-iron-dark/80 via-iron-dark/90 to-iron-dark"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4">
    <a href="/blog.html" class="back-link mb-6">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      Back to Blog
    </a>
    <div class="flex flex-wrap gap-2 mb-4">${tags}</div>
    <h1 class="text-2xl sm:text-3xl md:text-5xl font-black leading-tight mb-4">${esc(post.data.title)}</h1>
    <div class="flex items-center gap-4 text-gray-400 text-sm">
      ${authorSpan}
      <time datetime="${post.data.date}" class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        ${fmtDate(post.data.date)}
      </time>
    </div>
  </div>
</section>

<main class="py-12"><article class="max-w-4xl mx-auto px-4 post-content">${md.render(post.content)}</article></main>

${CTA_SECTION}
${FOOTER}
</body>
</html>`;

  fs.writeFileSync(path.join(CFG.blogOutDir, `${post.slug}.html`), html, "utf-8");
  console.log(`   ✓  blog/${post.slug}.html`);
}

// ── Main Build ─────────────────────────────────────────────────────
console.log("🚀  Starting build…\n");

try {
  const programs = loadCollection(CFG.programsDir);
  const sponsors = loadCollection(CFG.sponsorsDir);

  fs.writeFileSync(CFG.dataJson, JSON.stringify({ programs, sponsors }, null, 2));
  console.log("✅  data.json");

  buildIndex(programs, sponsors);

  // Blog
  if (fs.existsSync(CFG.blogDir)) {
    if (fs.existsSync(CFG.blogOutDir)) fs.rmSync(CFG.blogOutDir, { recursive: true, force: true });
    ensureDir(CFG.blogOutDir);

    const posts = fs.readdirSync(CFG.blogDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const raw = fs.readFileSync(path.join(CFG.blogDir, f), "utf-8");
        const { data, content } = matter(raw);
        return { filename: f, slug: slugify(f), data, content };
      })
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

    console.log(`📄  ${posts.length} blog post(s) loaded`);
    for (const post of posts) buildBlogPost(post);
    buildBlogList(posts);
  } else {
    console.log("⚠️  No blog directory found");
    buildBlogList([]);
  }

  console.log("\n🎉  Build complete!");
  console.log("\n📍  Output:");
  console.log("   • index.html");
  console.log("   • blog.html");
  console.log("   • blog/*.html");
  console.log("   • data.json");
} catch (err) {
  console.error("❌  Build failed:", err.message);
  process.exit(1);
}