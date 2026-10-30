// The archive formats the panel can write, and the bsdtar options that make each one. The panel's three
// level names (fast, balanced, max) map to each format's own numbers. The option strings were checked on this
// machine (docs/plans/2026-10-30-compression-results.md).

const LEVELS = {
	zip: { fast: 1, balanced: 6, max: 9 },
	zstd: { fast: 3, balanced: 9, max: 19 },
	xz: { fast: 1, balanced: 6, max: 9 },
};

function levelNumber(format, level) {
	if (!Object.hasOwn(LEVELS[format], level)) throw new Error(`unknown compression level "${level}"`);
	return LEVELS[format][level];
}

export const FORMATS = {
	zip: { ext: ".zip", args: (level) => ["--format", "zip", "--options", `zip:compression-level=${levelNumber("zip", level)}`] },
	zstd: { ext: ".tar.zst", args: (level) => ["--zstd", "--options", `zstd:compression-level=${levelNumber("zstd", level)}`] },
	xz: { ext: ".tar.xz", args: (level) => ["--xz", "--options", `xz:compression-level=${levelNumber("xz", level)}`] },
};

/** The file endings of every format, for callers that need to recognise backup files. */
export const ALL_EXTENSIONS = Object.values(FORMATS).map((f) => f.ext);

/** { stem, format } for a file name ending in a known archive extension, otherwise null. "a.tar.zst" -> { stem: "a", format: "zstd" }. */
export function splitArchiveName(name) {
	const format = formatForFile(name);
	if (!format) return null;
	// The stem keeps its original case. Only the ending is matched case-insensitively.
	const ext = FORMATS[format].ext;
	return { stem: name.slice(0, name.length - ext.length), format };
}

/** The format a file name is written in, by its ending (case-insensitive), or null. */
export function formatForFile(name) {
	if (typeof name !== "string") return null;
	const lower = name.toLowerCase();
	if (lower.endsWith(".tar.zst")) return "zstd";
	if (lower.endsWith(".tar.xz")) return "xz";
	if (lower.endsWith(".zip")) return "zip";
	return null;
}
