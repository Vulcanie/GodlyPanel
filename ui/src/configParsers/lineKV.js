// Generic line-based Key=Value parser/serializer shared by the INI and
// .properties formats. Never rebuilds the file from a parsed object —
// edits replace only the value token on their original line, so comments,
// ordering, and any key we don't have a catalog entry for always survive.

const DESC_PREFIX = "#=";
const DIVIDER_RE = /^-[\s-]*$/;

export function parseLineKV(text, { sectioned }) {
	const lines = text.split(/\r\n|\n/);
	const entries = [];
	const occurrenceCounts = {};
	let currentSection = "root";
	let pendingComment = null;

	lines.forEach((raw, lineIndex) => {
		const trimmed = raw.trim();

		if (trimmed === "") {
			pendingComment = null;
			return;
		}

		if (sectioned && /^\[.+\]$/.test(trimmed)) {
			currentSection = trimmed.slice(1, -1);
			pendingComment = null;
			return;
		}

		if (trimmed.startsWith(DESC_PREFIX)) {
			const text = trimmed.slice(DESC_PREFIX.length).trim();
			if (DIVIDER_RE.test(text)) {
				pendingComment = null;
			} else {
				pendingComment = pendingComment
					? `${pendingComment} ${text}`
					: text;
			}
			return;
		}

		if (trimmed.startsWith(";") || trimmed.startsWith("#")) {
			pendingComment = null;
			return;
		}

		const eq = raw.indexOf("=");
		if (eq === -1) {
			pendingComment = null;
			return;
		}

		const key = raw.slice(0, eq).trim();
		if (!key) {
			pendingComment = null;
			return;
		}
		const value = raw.slice(eq + 1);

		const occurrenceKey = `${currentSection}::${key}`;
		const occurrence = occurrenceCounts[occurrenceKey] || 0;
		occurrenceCounts[occurrenceKey] = occurrence + 1;

		entries.push({
			id: `${occurrenceKey}::${occurrence}`,
			section: currentSection,
			key,
			value,
			comment: pendingComment,
			occurrence,
			lineIndex,
		});
		pendingComment = null;
	});

	// Mark keys that repeat within their section so the UI can disambiguate.
	const totalsByKey = {};
	for (const entry of entries) {
		const k = `${entry.section}::${entry.key}`;
		totalsByKey[k] = (totalsByKey[k] || 0) + 1;
	}
	for (const entry of entries) {
		entry.repeatCount = totalsByKey[`${entry.section}::${entry.key}`];
	}

	return { lines, entries };
}

export function serializeLineKV(parsed, edits) {
	const lines = [...parsed.lines];
	for (const entry of parsed.entries) {
		if (!(entry.id in edits)) continue;
		const raw = lines[entry.lineIndex];
		const eq = raw.indexOf("=");
		lines[entry.lineIndex] = `${raw.slice(0, eq + 1)}${edits[entry.id]}`;
	}
	return lines.join("\n");
}
