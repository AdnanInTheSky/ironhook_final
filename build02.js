import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, extname, basename } from 'path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

// Configuration
const CONFIG = {
    contentDir: './content/blog',
    outputDir: './blog',
    listTemplate: './template-list.html',
    postTemplate: './template-post.html',
    listOutput: './blog.html'
};

// Initialize markdown-it with safe options
const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
});

// Utility: Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Utility: Create URL-friendly slug from filename
function createSlug(filename) {
    return basename(filename, '.md')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// Utility: Escape HTML for safe attribute insertion
function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}

// Generate blog card HTML for listing page
function generateBlogCard(post, postUrl) {
    const tagsHtml = post.data.tags?.map(tag => 
        `<span class="tag">#${escapeHtml(tag)}</span>`
    ).join('') || '';

    const excerpt = post.data.excerpt || 
                   post.content.substring(0, 160).replace(/\n/g, ' ').trim() + '...';

    return `
    <a href="${postUrl}" class="blog-card rounded-2xl overflow-hidden border border-white/10 bg-iron-card p-6 group">
        <div class="flex flex-col gap-4">
            ${post.data.image ? `
            <div class="w-full h-48 flex-shrink-0 overflow-hidden rounded-xl">
                <img src="${escapeHtml(post.data.image)}" 
                     alt="${escapeHtml(post.data.title)}" 
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
            </div>` : ''}
            
            <div>
                <div class="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    <time datetime="${post.data.date}">${formatDate(post.data.date)}</time>
                    ${post.data.author ? `• <span>${escapeHtml(post.data.author)}</span>` : ''}
                </div>
                
                <h3 class="text-xl font-black mb-2 group-hover:text-iron-green transition-colors line-clamp-2">
                    ${escapeHtml(post.data.title)}
                </h3>
                
                <p class="text-gray-400 mb-4 excerpt">
                    ${escapeHtml(excerpt)}
                </p>
                
                ${tagsHtml ? `<div class="flex flex-wrap">${tagsHtml}</div>` : ''}
            </div>
        </div>
    </a>`;
}

// Generate full post page HTML
function generatePostPage(post, postUrl) {
    const tagsHtml = post.data.tags?.map(tag => 
        `<span class="tag">#${escapeHtml(tag)}</span>`
    ).join('') || '';
    
    const contentHtml = md.render(post.content);

    return `
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(post.data.title)} | Iron Hook Boxing</title>
    <meta name="description" content="${escapeHtml(post.data.excerpt || '')}">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
 
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        'iron-green': '#84cc16',
                        'iron-green-dark': '#65a30d',
                        'iron-dark': '#0a0a0a',
                        'iron-gray': '#1a1a1a',
                        'iron-card': '#111111',
                        'ygreen-light': '#d4f5a2',
                        'ygreen-dark': '#6b8e23',
                        'ygreen-top': '#8db800',
                        'ygreen-bottom': '#5a7a00'
                    }
                }
            }
        }
    </script>
    <style>
        body { background: #0a0a0a; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #84cc16; border-radius: 999px; }
        .btn-glow:hover { box-shadow: 0 0 25px rgba(132,204,22,0.4); }
        .post-content { color: #e5e7eb; line-height: 1.8; }
        .post-content h1 { font-size: 2rem; font-weight: 800; margin: 2rem 0 1rem; color: #fff; }
        .post-content h2 { font-size: 1.5rem; font-weight: 700; margin: 1.75rem 0 0.75rem; color: #fff; }
        .post-content h3 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: #fff; }
        .post-content p { margin: 1rem 0; }
        .post-content a { color: #84cc16; text-decoration: none; border-bottom: 1px dashed #84cc16; }
        .post-content a:hover { border-bottom-style: solid; }
        .post-content ul, .post-content ol { padding-left: 1.5rem; margin: 1rem 0; }
        .post-content li { margin: 0.5rem 0; }
        .post-content blockquote {
            border-left: 4px solid #84cc16;
            padding: 1rem 1.5rem;
            margin: 1.5rem 0;
            background: rgba(132,204,22,0.08);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #d1d5db;
        }
        .post-content code {
            background: #1a1a1a;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: monospace;
            color: #84cc16;
        }
        .post-content pre {
            background: #111;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }
        .tag {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(132,204,22,0.15);
            color: #84cc16;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 500;
            margin: 0.25rem 0.25rem 0.25rem 0;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #84cc16;
            font-weight: 500;
            text-decoration: none;
            transition: gap 0.2s;
        }
        .back-link:hover { gap: 0.75rem; }
    </style>
</head>
<body class="text-white font-sans antialiased">
    <nav class="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="h-20 flex items-center justify-between">
                <a href="/" class="flex items-center gap-3">
                    <img src="/images/Screenshot 2026-05-23 215930-Photoroom.png" alt="Logo" class="h-12">
                </a>
                <div class="hidden md:flex items-center gap-8">
                    <a href="https://ironhookboxing.sites.zenplanner.com/calendar.cfm" class="hover:text-iron-green transition">Home</a>
                    <a href="/#about" class="hover:text-iron-green transition">About us</a>
                    <a href="https://ironhookboxing.sites.zenplanner.com/scheduler.cfm" class="hover:text-iron-green transition">Make Appointment</a>
                </div>
                <a href="https://ironhookboxing.sites.zenplanner.com/sign-up-now.cfm" 
                   class="hidden md:inline-flex px-6 py-3 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold btn-glow">
                    JOIN NOW
                </a>
            </div>
        </div>
    </nav>

    <section class="relative pt-32 pb-8 overflow-hidden">
        ${post.data.image ? `
        <div class="absolute inset-0 bg-cover bg-center opacity-30" style="background-image:url('${escapeHtml(post.data.image)}');"></div>` : ''}
        <div class="absolute inset-0 bg-gradient-to-b from-iron-dark/90 via-iron-dark/95 to-iron-dark"></div>
        
        <div class="relative z-10 max-w-4xl mx-auto px-4">
            <a href="/blog.html" class="back-link mb-6">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Blog
            </a>
            
            <div class="flex flex-wrap gap-2 mb-4">${tagsHtml}</div>
            
            <h1 class="text-3xl md:text-5xl font-black leading-tight mb-4">${escapeHtml(post.data.title)}</h1>
            
            <div class="flex items-center gap-4 text-gray-400 text-sm">
                ${post.data.author ? `<span>By <strong class="text-white">${escapeHtml(post.data.author)}</strong></span>` : ''}
                <time datetime="${post.data.date}" class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    ${formatDate(post.data.date)}
                </time>
            </div>
        </div>
    </section>

    <main class="py-12">
        <article class="max-w-4xl mx-auto px-4 post-content">
            ${contentHtml}
        </article>
    </main>

    <section class="py-16 border-t border-white/10">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <h2 class="text-3xl md:text-4xl font-black mb-6">Ready to Train?</h2>
            <p class="text-gray-400 text-lg mb-8">Experience Iron Hook Boxing firsthand with a free introductory class.</p>
            <a href="https://ironhookboxing.sites.zenplanner.com/sign-up-now.cfm" 
               class="inline-flex px-8 py-4 rounded-full bg-gradient-to-b from-ygreen-top to-ygreen-bottom text-white font-bold text-lg btn-glow">
                CLAIM YOUR FREE CLASS
            </a>
        </div>
    </section>

    <footer class="bg-iron-gray border-t border-gray-800 pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-12 mb-12">
                <div class="md:col-span-1">
                    <a href="/" class="flex items-center gap-3">
                        <img src="/images/Screenshot 2026-05-23 215930-Photoroom.png" alt="Logo" class="h-12">
                    </a>
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
                    <p class="text-gray-400 text-sm leading-relaxed">
                        646 North East Road,<br>
                        Adelaide, South Australia
                    </p>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p class="text-gray-500 text-sm text-center md:text-left">
                    Copyright © 2026 Iron Hook | Powered by Astra WordPress Theme
                </p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

// Load template file
async function loadTemplate(filepath) {
    return await readFile(filepath, 'utf-8');
}

// Read and parse all markdown posts using gray-matter
async function loadPosts() {
    try {
        await mkdir(CONFIG.contentDir, { recursive: true });
    } catch (e) { /* exists */ }

    const files = await readdir(CONFIG.contentDir);
    const mdFiles = files.filter(f => extname(f).toLowerCase() === '.md');
    
    if (mdFiles.length === 0) {
        console.log('⚠️ No markdown files found in', CONFIG.contentDir);
        return [];
    }

    const posts = [];
    
    for (const file of mdFiles) {
        const filePath = join(CONFIG.contentDir, file);
        const content = await readFile(filePath, 'utf-8');
        const parsed = matter(content); // gray-matter parses frontmatter
        
        posts.push({
            filename: file,
            slug: createSlug(file),
            data: parsed.data,      // frontmatter metadata
            content: parsed.content // markdown body
        });
    }
    
    // Sort by date (newest first)
    posts.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
    
    return posts;
}

// Render listing page (blog.html) using conditional blocks
function renderListingPage(template, posts) {
    const hasPosts = posts.length > 0;
    
    let cardsHtml = '';
    if (hasPosts) {
        cardsHtml = posts.map(post => {
            const postUrl = `./blog/${post.slug}.html`;
            return generateBlogCard(post, postUrl);
        }).join('\n');
    }
    
    // Handle {{#HAS_POSTS}}...{{/HAS_POSTS}} conditional
    let result = template;
    
    if (hasPosts) {
        // Replace conditional block with cards grid
        result = result.replace(
            /{{#HAS_POSTS}}[\s\S]*?{{\/HAS_POSTS}}/,
            `<div class="grid md:grid-cols-2 gap-6">\n${cardsHtml}\n</div>`
        );
        // Remove inverse conditional block
        result = result.replace(/{{\^HAS_POSTS}}[\s\S]*?{{\/\^HAS_POSTS}}/, '');
    } else {
        // Remove positive conditional block
        result = result.replace(/{{#HAS_POSTS}}[\s\S]*?{{\/HAS_POSTS}}/, '');
        // Replace inverse conditional with empty state
        result = result.replace(
            /{{\^HAS_POSTS}}[\s\S]*?{{\/\^HAS_POSTS}}/,
            '<div class="text-center py-20 bg-iron-card rounded-2xl border border-white/10"><p class="text-gray-400 text-lg">No blog posts yet.</p><p class="text-gray-500 text-sm mt-2">Check back soon for training tips and community updates!</p></div>'
        );
    }
    
    // Replace any remaining {{BLOG_CARDS}} placeholder
    result = result.replace(/{{BLOG_CARDS}}/g, cardsHtml);
    
    return result;
}

// Render individual post page
function renderPostPage(template, post) {
    return template
        .replace(/{{POST_TITLE}}/g, escapeHtml(post.data.title))
        .replace(/{{POST_DATE}}/g, post.data.date)
        .replace(/{{POST_DATE_FORMATTED}}/g, formatDate(post.data.date))
        .replace(/{{POST_AUTHOR}}/g, escapeHtml(post.data.author || ''))
        .replace(/{{POST_IMAGE}}/g, post.data.image || '')
        .replace(/{{POST_TAGS}}/g, post.data.tags?.map(tag => 
            `<span class="tag">#${escapeHtml(tag)}</span>`
        ).join('') || '')
        .replace(/{{POST_CONTENT}}/g, md.render(post.content));
}

// Main build function
async function build() {
    console.log('🔨 Starting blog build (build02.js)...');
    
    try {
        // Clean output directory
        await rm(CONFIG.outputDir, { recursive: true, force: true });
        await mkdir(CONFIG.outputDir, { recursive: true });
        
        // Load templates
        const [listTemplate, postTemplate] = await Promise.all([
            loadTemplate(CONFIG.listTemplate),
            loadTemplate(CONFIG.postTemplate)
        ]);
        
        // Load posts using gray-matter
        const posts = await loadPosts();
        console.log(`📄 Loaded ${posts.length} blog post${posts.length !== 1 ? 's' : ''}`);
        
        // Generate individual post pages
        for (const post of posts) {
            const postHtml = renderPostPage(postTemplate, post);
            const outputPath = join(CONFIG.outputDir, `${post.slug}.html`);
            await writeFile(outputPath, postHtml, 'utf-8');
            console.log(`   ✓ Generated: blog/${post.slug}.html`);
        }
        
        // Generate listing page (blog.html)
        const listHtml = renderListingPage(listTemplate, posts);
        await writeFile(CONFIG.listOutput, listHtml, 'utf-8');
        console.log(`✅ Generated: ${CONFIG.listOutput}`);
        
        console.log('\n🎉 Blog build complete!');
        console.log(`📂 Individual posts: ./${CONFIG.outputDir}/`);
        console.log(`📋 Blog listing: ./${CONFIG.listOutput}`);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run build when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    build();
}

export { build };