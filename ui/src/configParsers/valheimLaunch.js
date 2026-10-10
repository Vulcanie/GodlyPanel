// Valheim has no settings file: a dedicated server is configured by the arguments on the command line that starts it, in the start
// script (the `valheim_server -nographics -batchmode -name ... -port ... -world ...` line). This reads that line into settings a
// form can show and writes edits back into it, leaving everything else in the script alone (other lines, other arguments, comments,
// the file's line endings: a .bat with bare line feeds can misbehave).
//
// Editing a setting that isn't on the line adds it; clearing it (or switching a yes/no off) takes it off the line.

// [argument, key, kind]. kind "bool": the argument stands alone. "value": the next token is its value.
const FLAGS = [
	["-name", "name", "value"],
	["-port", "port", "value"],
	["-world", "world", "value"],
	["-password", "password", "value"],
	["-public", "public", "value"],
	["-crossplay", "crossplay", "bool"],
	["-savedir", "savedir", "value"],
	["-logFile", "logFile", "value"],
	["-saveinterval", "saveinterval", "value"],
	["-backups", "backups", "value"],
	["-backupshort", "backupshort", "value"],
	["-backuplong", "backuplong", "value"],
	["-instanceid", "instanceid", "value"],
	["-preset", "preset", "value"],
];
export const MODIFIERS = ["combat", "deathpenalty", "resources", "raids", "portals"];
export const SETKEYS = ["nobuildcost", "playerevents", "passivemobs", "nomap"];

// Values that are written in quotes whatever they hold: names, paths and the password may contain spaces or characters a batch
// file treats specially.
const ALWAYS_QUOTED = new Set(["-name", "-world", "-password", "-savedir", "-logFile"]);
const LAUNCH = /\bvalheim_server(?:\.exe)?\b/i;
const flagByArg = new Map(FLAGS.map((f) => [f[0].toLowerCase(), f]));

function tokenize(rest) {
	const tokens = [];
	const re = /"([^"]*)"|(\S+)/g;
	let m;
	while ((m = re.exec(rest))) tokens.push({ raw: m[0], value: m[1] !== undefined ? m[1] : m[2], quoted: m[1] !== undefined });
	return tokens;
}

const render = (value, quote) => (quote || /[\s"&|<>^]/.test(value) ? `"${value}"` : value);

export function parseValheimLaunch(text) {
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const lines = text.split(/\r\n|\n/);
	const at = lines.findIndex((l) => !/^\s*(rem\b|::|@?echo\b)/i.test(l) && LAUNCH.test(l) && /\s-\w/.test(l));
	if (at === -1) return { lines, eol, at: -1, prefix: "", items: [] };

	const match = LAUNCH.exec(lines[at]);
	const prefix = lines[at].slice(0, match.index + match[0].length);
	const tokens = tokenize(lines[at].slice(prefix.length));
	const items = [];
	for (let i = 0; i < tokens.length; i += 1) {
		const t = tokens[i];
		const lower = t.raw.toLowerCase();
		const flag = flagByArg.get(lower);
		if (flag && flag[2] === "bool") items.push({ arg: flag[0], values: [], raw: [t.raw] });
		else if (flag && tokens[i + 1] && (tokens[i + 1].quoted || !tokens[i + 1].raw.startsWith("-"))) {
			items.push({ arg: flag[0], values: [tokens[i + 1].value], raw: [t.raw, tokens[i + 1].raw] });
			i += 1;
		} else if (lower === "-modifier" && tokens[i + 2]) {
			items.push({ arg: "-modifier", values: [tokens[i + 1].value, tokens[i + 2].value], raw: [t.raw, tokens[i + 1].raw, tokens[i + 2].raw] });
			i += 2;
		} else if (lower === "-setkey" && tokens[i + 1]) {
			items.push({ arg: "-setkey", values: [tokens[i + 1].value], raw: [t.raw, tokens[i + 1].raw] });
			i += 1;
		} else items.push({ arg: null, values: [], raw: [t.raw] }); // something this doesn't manage (-nographics, -batchmode, ...)
	}
	return { lines, eol, at, prefix, items };
}

const find = (parsed, arg, first) => parsed.items.find((it) => it.arg === arg && (first === undefined || it.values[0] === first));

/** The settings, one per argument this manages, whether or not it is on the line now. */
export function valheimLaunchEntries(parsed) {
	if (parsed.at === -1) return [];
	const entries = [];
	const add = (group, key, value) => entries.push({ id: `${group}::${key}`, section: group, key, value, comment: null, occurrence: 0, repeatCount: 1 });
	for (const [arg, key, kind] of FLAGS) {
		const it = find(parsed, arg);
		const group = ["-name", "-port", "-world", "-password", "-public", "-crossplay"].includes(arg) ? "Server" : arg === "-preset" ? "World modifiers" : "Saves and logs";
		add(group, key, kind === "bool" ? (it ? "true" : "false") : (it?.values[0] ?? ""));
	}
	for (const key of MODIFIERS) add("World modifiers", key, find(parsed, "-modifier", key)?.values[1] ?? "");
	for (const key of SETKEYS) add("World modifiers", `setkey ${key}`, find(parsed, "-setkey", key) ? "true" : "false");
	return entries;
}

export function serializeValheimLaunch(parsed, edits) {
	if (parsed.at === -1) return parsed.lines.join(parsed.eol);
	const items = parsed.items.map((it) => ({ ...it }));
	const remove = (arg, first) => {
		const i = items.findIndex((it) => it.arg === arg && (first === undefined || it.values[0] === first));
		if (i !== -1) items.splice(i, 1);
	};
	const set = (arg, values, quote) => {
		const raw = [arg, ...values.map((v, n) => render(v, quote && n === values.length - 1))];
		const keyed = arg === "-modifier" || arg === "-setkey";
		const i = items.findIndex((it) => it.arg === arg && (!keyed || it.values[0] === values[0]));
		const next = { arg, values, raw, changed: true };
		if (i !== -1) items[i] = next;
		// Modifiers and keys act on the preset before them, so a new preset goes ahead of them.
		else if (arg === "-preset" && items.some((it) => it.arg === "-modifier" || it.arg === "-setkey")) items.splice(items.findIndex((it) => it.arg === "-modifier" || it.arg === "-setkey"), 0, next);
		else items.push(next);
	};

	const byId = new Map(valheimLaunchEntries(parsed).map((e) => [e.id, e]));
	for (const [id, value] of Object.entries(edits)) {
		const entry = byId.get(id);
		if (!entry) continue;
		const v = String(value).trim();
		const flag = FLAGS.find((f) => f[1] === entry.key);
		if (flag) {
			if (flag[2] === "bool") (v.toLowerCase() === "true" ? set(flag[0], [], false) : remove(flag[0]));
			else if (v === "") remove(flag[0]);
			else set(flag[0], [v], ALWAYS_QUOTED.has(flag[0]));
		} else if (entry.key.startsWith("setkey ")) {
			const key = entry.key.slice(7);
			if (v.toLowerCase() === "true") set("-setkey", [key], false);
			else remove("-setkey", key);
		} else if (MODIFIERS.includes(entry.key)) {
			if (v === "") remove("-modifier", entry.key);
			else set("-modifier", [entry.key, v], false);
		}
	}

	const args = items.map((it) => it.raw.join(" ")).join(" ");
	const lines = [...parsed.lines];
	lines[parsed.at] = args ? `${parsed.prefix} ${args}` : parsed.prefix;
	return lines.join(parsed.eol);
}
