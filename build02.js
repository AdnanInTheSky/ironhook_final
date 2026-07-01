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

// Utility: Fix image paths for Vercel static deployment
function fixImagePath(imgPath) {
    if (!imgPath) return '';
    if (imgPath.startsWith('/images/')) return imgPath;
    if (imgPath.startsWith('public/images/')) return imgPath.replace('public/images/', '/images/');
    if (imgPath.startsWith('images/')) return '/' + imgPath;
    return imgPath;
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
                <img src="${escapeHtml(fixImagePath(post.data.image))}" 
                     alt="${escapeHtml(post.data.title)}" 
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                     loading="lazy">
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

// Render individual post page with conditional handling
function renderPostPage(template, post) {
    let result = template;

    // Handle conditional blocks first
    const heroImage = post.data.image ? fixImagePath(post.data.image) : '';

    if (heroImage) {
        // Keep the hero image div, replace the placeholder
        result = result.replace(
            /{{#POST_IMAGE}}[\s\S]*?{{\/POST_IMAGE}}/,
            `<div class="absolute inset-0 bg-cover bg-center opacity-40" style="background-image:url('${escapeHtml(heroImage)}');"></div>`
        );
    } else {
        // Remove the hero image block entirely
        result = result.replace(/{{#POST_IMAGE}}[\s\S]*?{{\/POST_IMAGE}}/, '');
    }

    if (post.data.author) {
        result = result.replace(
            /{{#POST_AUTHOR}}[\s\S]*?{{\/POST_AUTHOR}}/,
            `<span>By <strong class="text-white">${escapeHtml(post.data.author)}</strong></span>`
        );
    } else {
        result = result.replace(/{{#POST_AUTHOR}}[\s\S]*?{{\/POST_AUTHOR}}/, '');
    }

    // Simple replacements
    result = result
        .replace(/{{POST_TITLE}}/g, escapeHtml(post.data.title))
        .replace(/{{POST_DATE}}/g, post.data.date || '')
        .replace(/{{POST_DATE_FORMATTED}}/g, post.data.date ? formatDate(post.data.date) : '')
        .replace(/{{POST_AUTHOR}}/g, escapeHtml(post.data.author || ''))
        .replace(/{{POST_IMAGE}}/g, heroImage)
        .replace(/{{POST_TAGS}}/g, post.data.tags?.map(tag => 
            `<span class="tag">#${escapeHtml(tag)}</span>`
        ).join('') || '')
        .replace(/{{POST_CONTENT}}/g, md.render(post.content));

    return result;
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