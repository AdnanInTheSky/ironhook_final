import fs from "fs";
import path from "path";

import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt();

function loadMarkdown(folder) {

    const files = fs.readdirSync(folder);

    return files.map(file => {

        const raw = fs.readFileSync(
            path.join(folder, file),
            "utf-8"
        );

        const parsed = matter(raw);

        return {
            ...parsed.data,
            content: md.render(parsed.content)
        };

    });

}

const programs = loadMarkdown("./content/programs");
const sponsors = loadMarkdown("./content/sponsors");

const data = {
    programs,
    sponsors
};

if (!fs.existsSync("./public")) {
    fs.mkdirSync("./public");
}

fs.writeFileSync(
    "./public/data.json",
    JSON.stringify(data, null, 2)
);

const template = fs.readFileSync(
    "./template.html",
    "utf-8"
);

function renderPrograms(programs) {

    return programs.map(program => {

        return `
        <div class="program-row bg-iron-card border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

            <div class="flex-1">

                <h3 class="text-lg font-bold text-white mb-2">
                    ${program.title}
                </h3>

                <div class="text-gray-400 text-sm mb-4">
                    ${program.schedule}
                </div>

                <div class="text-gray-500 text-sm">
                    ${program.content}
                </div>

            </div>

            <a
                href="${program.button_link}"
                class="inline-flex items-center px-6 py-2.5 bg-iron-green text-black text-sm font-bold rounded-full hover:bg-iron-green-dark transition-all"
            >
                ${program.button_text}
            </a>

        </div>
        `;

    }).join("");

}

function renderSponsors(sponsors) {

    return sponsors.map(sponsor => {

        return `
        <a
            href="${sponsor.website}"
            target="_blank"
            class="sponsor-logo bg-iron-card border border-gray-800 rounded-xl p-6 flex items-center justify-center aspect-[3/2]"
        >

            <img
                src="${sponsor.logo}"
                alt="${sponsor.name}"
                class="max-h-16 object-contain"
            />

        </a>
        `;

    }).join("");

}

const finalHTML = template
    .replace("{{PROGRAMS}}", renderPrograms(programs))
    .replace("{{SPONSORS}}", renderSponsors(sponsors));

fs.writeFileSync(
    "./public/index.html",
    finalHTML
);

console.log("Build complete.");