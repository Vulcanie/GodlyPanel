// Turns help entries into the markdown page a tooltip's link lands on. Used by scripts/build-guides.mjs to write docs/, and by the
// tests to check that the committed pages are the ones this makes.
import { slugify } from "./guides.js";

const NOTICE = "<!-- Generated from the help text in the interface (ui/src/help). Edit it there, then run `npm run build:guides`. -->";

/**
 * @param {{ title: string, intro: string[], outro?: string[] }} doc
 * @param {Array<{ id?: string, section: string, title: string, text: string, details?: string, extra?: string }>} entries
 */
export function renderGuide(doc, entries) {
	const out = [NOTICE, "", `# ${doc.title}`, "", ...doc.intro.flatMap((p) => [p, ""])];

	const sections = [];
	for (const entry of entries) {
		let s = sections.find((x) => x.name === entry.section);
		if (!s) sections.push((s = { name: entry.section, entries: [] }));
		s.entries.push(entry);
	}

	out.push("## Contents", "");
	for (const s of sections) out.push(`- [${s.name}](#${slugify(s.name)})`);
	out.push("");

	for (const s of sections) {
		out.push(`## ${s.name}`, "");
		for (const e of s.entries) {
			// An entry that is the whole section (a card with one thing in it) is written under the section's own heading.
			if (e.title !== s.name) out.push(`### ${e.title}`, "");
			out.push(e.text, "");
			if (e.details) out.push(e.details, "");
			if (e.extra) out.push(e.extra, "");
		}
	}
	for (const p of doc.outro ?? []) out.push(p, "");
	return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

/** Every heading in a rendered page, as the links GitHub makes for them. */
export function headingSlugs(markdown) {
	return [...markdown.matchAll(/^#{2,4} (.+)$/gm)].map((m) => slugify(m[1]));
}
