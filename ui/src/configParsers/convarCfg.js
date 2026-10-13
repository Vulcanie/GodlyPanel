// Rust's server.cfg (and any console-variable file like it): one setting per line, its name and then its value, with the value in
// quotes when it has spaces:
//   server.hostname "My Server"
//   server.maxplayers 50
// Lines starting with // or # are comments. When a name appears more than once the game uses the last, so that is the one shown and
// edited. Editing changes only that line; everything else stays as it was. A setting the file doesn't have yet is added at the end.

const COMMENT = /^\s*(\/\/|#)/;

const unquote = (value) => {
	const v = value.trim();
	return v.length >= 2 && v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
};

export function parseConvarCfg(text) {
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const lines = text.split(/\r\n|\n/);
	const last = new Map();
	lines.forEach((raw, lineIndex) => {
		if (!raw.trim() || COMMENT.test(raw)) return;
		const m = /^(\s*)(\S+)(?:\s+(.*))?$/.exec(raw);
		if (!m) return;
		const [, indent, key, rest = ""] = m;
		last.set(key, { id: key, section: "root", key, value: unquote(rest), quoted: rest.trim().startsWith('"'), indent, comment: null, occurrence: 0, repeatCount: 1, lineIndex });
	});
	return { lines, eol, entries: [...last.values()] };
}

/** The settings in the file, then the ones the catalog explains that the file doesn't have yet (empty, so they can be filled in). */
export function convarEntries(parsed, knownKeys = []) {
	const have = new Set(parsed.entries.map((e) => e.key));
	const missing = knownKeys.filter((key) => !have.has(key)).map((key) => ({ id: key, section: "root", key, value: "", comment: null, occurrence: 0, repeatCount: 1, lineIndex: -1 }));
	return [...parsed.entries, ...missing];
}

const render = (value, wasQuoted) => (wasQuoted || /\s/.test(value) ? `"${value.replace(/"/g, "")}"` : value);

export function serializeConvarCfg(parsed, edits) {
	const lines = [...parsed.lines];
	const remove = new Set();
	const append = [];
	const byId = new Map(parsed.entries.map((e) => [e.id, e]));
	for (const [id, raw] of Object.entries(edits)) {
		const value = String(raw).trim();
		const entry = byId.get(id);
		if (entry) {
			if (value === "") remove.add(entry.lineIndex);
			else lines[entry.lineIndex] = `${entry.indent}${entry.key} ${render(value, entry.quoted)}`;
		} else if (value !== "") {
			append.push(`${id} ${render(value, false)}`);
		}
	}
	let out = lines.filter((_, i) => !remove.has(i));
	if (append.length) {
		// Keep the file's own trailing newline, if it has one.
		const trailing = out.length > 0 && out[out.length - 1] === "";
		if (trailing) out = out.slice(0, -1);
		out = [...out, ...append, ...(trailing ? [""] : [])];
	}
	return out.join(parsed.eol);
}
