// Where the written guides live. Every explanation that appears in the interface can point at the part of a guide that goes further
// ("how do I use this?"), and those links are made here so a guide that moves is changed in one place.
//
// The guides are in this repository's docs folder, on GitHub, so they are always the ones for the latest release.

export const GUIDE_BASE = "https://github.com/Vulcanie/GodlyPanel/blob/main/docs";

/** The guides a help entry can point at: the file under docs/ (without .md) and what it is called on screen. */
export const GUIDES = {
	settings: { file: "PANEL_SETTINGS", title: "Panel settings guide" },
	server: { file: "SERVER_OPTIONS", title: "Server options guide" },
	launch: { file: "LAUNCH_ARGUMENTS", title: "Launch arguments guide" },
	games: { file: "GAME_SETTINGS", title: "Game settings guide" },
};

/**
 * The heading link GitHub makes for a heading: lower case, punctuation dropped, spaces to hyphens.
 * Used for both the links and the tests that check every link has a heading to land on.
 */
export function slugify(heading) {
	return String(heading)
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/\s/g, "-");
}

/** @param {keyof typeof GUIDES} guide  @param {string} [heading] */
export function guideUrl(guide, heading) {
	const g = GUIDES[guide];
	if (!g) return GUIDE_BASE;
	return `${GUIDE_BASE}/${g.file}.md${heading ? `#${slugify(heading)}` : ""}`;
}
