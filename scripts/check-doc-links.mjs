// Checks that every relative link in the README, SECURITY.md and docs/*.md points at a file that exists and,
// where it names a heading (#anchor), at a heading that exists. Run: node scripts/check-doc-links.mjs
// Exits 1 listing any broken link, so it can run in CI.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
	"README.md",
	"SECURITY.md",
	"CONTRIBUTING.md",
	...fs.readdirSync(path.join(root, "docs")).filter((f) => f.endsWith(".md")).map((f) => path.join("docs", f)),
];

/** GitHub's rule for turning a heading into an anchor. */
const slug = (heading) =>
	heading
		.trim()
		.toLowerCase()
		.replace(/`/g, "")
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/\s+/g, "-");

const anchorsOf = (file) => {
	const text = fs.readFileSync(path.join(root, file), "utf8");
	return new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1].replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[*_]/g, ""))));
};

const problems = [];
for (const file of files) {
	const text = fs.readFileSync(path.join(root, file), "utf8");
	// Links in code fences are examples, not links.
	const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
	for (const m of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
		const target = m[1];
		if (/^(https?:|mailto:)/i.test(target)) continue;
		const [rel, anchor] = target.split("#");
		const resolved = rel === "" ? file : path.normalize(path.join(path.dirname(file), rel));
		if (!fs.existsSync(path.join(root, resolved))) {
			problems.push(`${file}: ${target} (no such file)`);
			continue;
		}
		if (anchor && resolved.endsWith(".md") && !anchorsOf(resolved).has(anchor.toLowerCase())) {
			problems.push(`${file}: ${target} (no heading "${anchor}" in ${resolved})`);
		}
	}
}

if (problems.length) {
	console.error(`${problems.length} broken link(s):\n${problems.map((p) => `  ${p}`).join("\n")}`);
	process.exit(1);
}
console.log(`Checked ${files.length} files: every relative link and heading anchor resolves.`);
