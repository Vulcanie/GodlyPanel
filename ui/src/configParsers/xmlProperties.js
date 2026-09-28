// Parser for 7 Days to Die's serverconfig.xml, e.g.
//   <property name="ServerName" value="GodlyHeroes"/> <!-- description -->
// Standalone comment lines (not attached to a <property> tag) are treated as
// section headers for whatever properties follow, e.g. <!-- Networking -->.
// Serializing only swaps the value="..." attribute on its original line.

const PROPERTY_RE = /<property\s+name="([^"]*)"\s+value="([^"]*)"/;
const TRAILING_COMMENT_RE = /<!--(.*?)-->\s*$/;
const STANDALONE_COMMENT_RE = /^<!--(.*)-->$/;

export function parseXmlProperties(text) {
	const lines = text.split(/\r\n|\n/);
	const entries = [];
	const occurrenceCounts = {};
	let currentSection = "General";

	lines.forEach((raw, lineIndex) => {
		const trimmed = raw.trim();

		const propMatch = trimmed.startsWith("<property")
			? trimmed.match(PROPERTY_RE)
			: null;

		if (propMatch) {
			const [, key, value] = propMatch;
			const commentMatch = raw.match(TRAILING_COMMENT_RE);
			const comment = commentMatch ? commentMatch[1].trim() : null;

			const occurrenceKey = `${currentSection}::${key}`;
			const occurrence = occurrenceCounts[occurrenceKey] || 0;
			occurrenceCounts[occurrenceKey] = occurrence + 1;

			entries.push({
				id: `${occurrenceKey}::${occurrence}`,
				section: currentSection,
				key,
				value,
				comment,
				occurrence,
				lineIndex,
			});
			return;
		}

		const standaloneMatch = trimmed.match(STANDALONE_COMMENT_RE);
		if (standaloneMatch) {
			const label = standaloneMatch[1].trim();
			if (label) currentSection = label;
		}
	});

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

export function serializeXmlProperties(parsed, edits) {
	const lines = [...parsed.lines];
	for (const entry of parsed.entries) {
		if (!(entry.id in edits)) continue;
		const raw = lines[entry.lineIndex];
		lines[entry.lineIndex] = raw.replace(
			PROPERTY_RE,
			(full, name) => `<property name="${name}" value="${edits[entry.id]}"`,
		);
	}
	return lines.join("\n");
}
