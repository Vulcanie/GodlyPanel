// Reads the arguments on the line of a start script that launches a game server, as settings a form can show, and writes edits
// back into that line, leaving everything else in the script alone (other lines, other arguments, comments, the file's line endings:
// a .bat with bare line feeds can misbehave).
//
// What counts as an argument comes from the game's definition in ../catalog/launchArgs.js. Three ways of joining a value to its flag:
//   space     -port 2456              plus     +server.port 28015
//   equals    -Port=7777  or  "-UserDataFolder=%~dp0userdata"        attached   -Xmx4g
// Editing a setting that isn't on the line adds it; clearing it (or switching a yes/no off) takes it off the line. Arguments the
// definition doesn't list are kept exactly as they were.

// A word of the line: a run of characters that aren't spaces or quotes, or a quoted part, so -cachedir="C:\My Folder" is one word.
const WORD = /(?:[^\s"]|"[^"]*")+/g;
const OPERATOR = /^(?:\d?>>?|<|\||&|\^)/; // redirection, pipes, line continuation: new arguments go in front of these

const unquote = (raw) => raw.replace(/"/g, "");
const needsQuotes = (value) => /[\s&|<>^]/.test(value);

function tokenize(rest) {
	return [...rest.matchAll(WORD)].map((m) => ({ raw: m[0] }));
}

const isFlagLike = (raw) => /^[-+][A-Za-z]/.test(raw);

/** How an argument is joined to its value. */
const styleOf = (arg, def) => (arg.kind === "attached" ? "attached" : (arg.style ?? def.style));
const keyOf = (arg) => arg.key ?? arg.flag.replace(/^[-+]+/, "");
const editable = (def) => def.args.filter((a) => a.edit !== false && !/\s/.test(a.flag));

/** Does the token `raw` carry this argument? Returns { value } or null. */
function match(raw, arg, def, next) {
	const style = styleOf(arg, def);
	const plain = unquote(raw);
	const flag = arg.flag;
	if (arg.kind === "bool") return plain.toLowerCase() === flag.toLowerCase() ? { value: "", used: 1 } : null;
	if (style === "attached") return plain.startsWith(flag) && plain.length > flag.length ? { value: plain.slice(flag.length), used: 1 } : null;
	if (style === "equals") {
		const head = `${flag}=`.toLowerCase();
		return plain.toLowerCase().startsWith(head) ? { value: plain.slice(head.length), used: 1 } : null;
	}
	// space / plus: the value is the next word, unless that is plainly another argument.
	if (plain.toLowerCase() !== flag.toLowerCase()) return null;
	if (!next || (!next.raw.includes('"') && isFlagLike(next.raw))) return null;
	return { value: unquote(next.raw), used: 2, quoted: next.raw.includes('"') };
}

export function parseLaunchArgs(text, def) {
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const lines = text.split(/\r\n|\n/);
	const at = lines.findIndex((l) => !/^\s*(rem\b|::|@?echo\b|set\b)/i.test(l) && def.program.test(l) && /\s[-+]\w/.test(l));
	if (at === -1) return { lines, eol, at: -1, prefix: "", items: [], def };

	const found = def.program.exec(lines[at]);
	let prefixEnd = found.index + found[0].length;
	// A program written in quotes ("Game.exe") has its closing quote right after the match; that quote is part of the program, not
	// the start of the first argument.
	if (lines[at][prefixEnd] === '"' && lines[at].slice(0, found.index).split('"').length % 2 === 0) prefixEnd += 1;
	const prefix = lines[at].slice(0, prefixEnd);
	const tokens = tokenize(lines[at].slice(prefix.length));
	const args = editable(def);
	const items = [];
	for (let i = 0; i < tokens.length; i += 1) {
		let taken = null;
		for (const arg of args) {
			const m = match(tokens[i].raw, arg, def, tokens[i + 1]);
			if (m) {
				taken = { arg, ...m };
				break;
			}
		}
		if (!taken) {
			items.push({ arg: null, raw: tokens[i].raw }); // something this doesn't manage
			continue;
		}
		const wholeQuoted = tokens[i].raw.startsWith('"');
		const innerQuoted = !wholeQuoted && /="/.test(tokens[i].raw);
		items.push({
			arg: taken.arg,
			value: taken.value,
			quoted: Boolean(taken.quoted || wholeQuoted || innerQuoted),
			wholeQuoted,
			raw: taken.used === 2 ? `${tokens[i].raw} ${tokens[i + 1].raw}` : tokens[i].raw,
		});
		i += taken.used - 1;
	}
	return { lines, eol, at, prefix, items, def };
}

/** The settings, one per argument the form manages, whether or not it is on the line now. */
export function launchArgsEntries(parsed) {
	if (parsed.at === -1) return [];
	return editable(parsed.def).map((arg) => {
		const item = parsed.items.find((it) => it.arg === arg);
		const value = arg.kind === "bool" ? (item ? "true" : "false") : (item?.value ?? "");
		return { id: `${arg.group}::${keyOf(arg)}`, section: arg.group, key: keyOf(arg), value, comment: null, occurrence: 0, repeatCount: 1 };
	});
}

function render(arg, def, value, previous) {
	const style = styleOf(arg, def);
	const clean = value.replace(/"/g, "");
	if (arg.kind === "bool") return arg.flag;
	if (style === "attached") return `${arg.flag}${clean}`;
	if (style === "equals") {
		const token = `${arg.flag}=${clean}`;
		if (previous?.wholeQuoted) return `"${token}"`;
		if (previous?.quoted) return `${arg.flag}="${clean}"`;
		return needsQuotes(clean) ? `"${token}"` : token;
	}
	return `${arg.flag} ${previous?.quoted || needsQuotes(clean) ? `"${clean}"` : clean}`;
}

export function serializeLaunchArgs(parsed, edits) {
	if (parsed.at === -1) return parsed.lines.join(parsed.eol);
	const def = parsed.def;
	const items = parsed.items.map((it) => ({ ...it }));
	const byId = new Map(launchArgsEntries(parsed).map((e) => [e.id, e]));
	const argByKey = new Map(editable(def).map((a) => [keyOf(a), a]));

	for (const [id, edit] of Object.entries(edits)) {
		const entry = byId.get(id);
		const arg = entry && argByKey.get(entry.key);
		if (!arg) continue;
		const value = String(edit).trim();
		const index = items.findIndex((it) => it.arg === arg);
		const off = arg.kind === "bool" ? value.toLowerCase() !== "true" : value === "";
		if (off) {
			if (index !== -1) items.splice(index, 1);
			continue;
		}
		const next = { arg, value, quoted: items[index]?.quoted, wholeQuoted: items[index]?.wholeQuoted };
		next.raw = render(arg, def, value, items[index]);
		if (index !== -1) items[index] = next;
		else {
			// Before any redirection or line continuation at the end of the line.
			const stop = items.findIndex((it) => !it.arg && OPERATOR.test(it.raw));
			items.splice(stop === -1 ? items.length : stop, 0, next);
		}
	}

	const args = items.map((it) => it.raw).join(" ");
	const lines = [...parsed.lines];
	lines[parsed.at] = args ? `${parsed.prefix} ${args}` : parsed.prefix;
	return lines.join(parsed.eol);
}
