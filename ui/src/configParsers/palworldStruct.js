// Palworld's PalWorldSettings.ini stores every setting on one line as an
// Unreal "struct" literal: OptionSettings=(Key=Value,Key2=Value2,...).
// This splits that struct into individual key/value pairs (built on top of
// ini.js for the surrounding file/line), and reassembles it on save.

import { parseIni, serializeIni } from "./ini";

function splitTopLevel(inner) {
	const parts = [];
	let depth = 0;
	let inQuotes = false;
	let current = "";

	for (const ch of inner) {
		if (ch === '"') inQuotes = !inQuotes;
		if (!inQuotes) {
			if (ch === "(") depth++;
			if (ch === ")") depth--;
		}
		if (ch === "," && depth === 0 && !inQuotes) {
			parts.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	if (current.trim() !== "") parts.push(current);
	return parts;
}

export function parsePalworldStruct(text) {
	const ini = parseIni(text);
	const optionEntry = ini.entries.find((e) => e.key === "OptionSettings");

	const entries = [];
	if (optionEntry) {
		const raw = optionEntry.value.trim();
		const inner = raw.startsWith("(") && raw.endsWith(")")
			? raw.slice(1, -1)
			: raw;

		splitTopLevel(inner).forEach((token, i) => {
			const eq = token.indexOf("=");
			if (eq === -1) return;
			const key = token.slice(0, eq).trim();
			const value = token.slice(eq + 1).trim();
			entries.push({
				id: `optionSettings::${key}`,
				section: "OptionSettings",
				key,
				value,
				comment: null,
				occurrence: 0,
				repeatCount: 1,
			});
		});
	}

	return { ini, optionEntry, entries };
}

export function serializePalworldStruct(parsed, edits) {
	if (!parsed.optionEntry) return parsed.ini.lines.join("\n");

	const merged = parsed.entries.map((entry) => {
		const value = entry.id in edits ? edits[entry.id] : entry.value;
		return `${entry.key}=${value}`;
	});

	const newStructValue = `(${merged.join(",")})`;
	return serializeIni(parsed.ini, { [parsed.optionEntry.id]: newStructValue });
}
