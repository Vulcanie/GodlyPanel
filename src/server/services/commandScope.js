import { get as getRole } from "../data/roleStore.js";
import { roleIdFor } from "../middleware/permissions.js";

// Which commands a role may send to a game's console. A role's scope is "all" (anything, as before), "allow" (only commands whose
// first word matches a pattern) or "deny" (anything but those). This is the one gate for free-form console commands: the RCON
// route calls checkCommand before anything reaches the game.
//
// Everything here fails closed. A missing user, an unknown role, or anything that isn't clearly a command is refused.

// Patterns are matched against the first word only, so a pattern names a command, not its arguments.
const READ_ONLY = ["list", "status", "help", "players", "info", "listplayers", "say"];

// Presets an admin can start a role from. They are plain data: the role's own scope is what is saved and checked.
export const PRESETS = [
	{ id: "read-only", label: "Read only", mode: "allow", patterns: [...READ_ONLY] },
	{
		id: "moderation",
		label: "Moderation",
		mode: "allow",
		patterns: [...READ_ONLY, "kick*", "ban*", "unban*", "mute*", "broadcast", "tell", "whisper"],
	},
	{
		id: "no-destructive",
		label: "No destructive commands",
		mode: "deny",
		patterns: ["stop", "shutdown", "quit", "exit", "saveandexit", "op", "deop", "whitelist", "wipe*", "destroy*"],
	},
];

// A first word longer than this can't match any sensible pattern, and a very long one would only cost time to compare.
const MAX_TOKEN = 256;

// Characters that let a second command ride along on the first: line breaks, any other control character (tabs too), and the
// separators a game console or shell might act on. Only applies to scopes that are not "all".
const SECOND_COMMAND = /[\u0000-\u001f\u007f;|]|&&/;

const REFUSED_REQUIRED = "A command is required.";
const REFUSED_CHAINED = "That command can't be sent here: one command at a time, no chaining.";
const REFUSED_SCOPE = "Your role isn't allowed to run that command.";

const refuse = (reason) => ({ ok: false, reason });
const OK = Object.freeze({ ok: true });

/**
 * The first word of a command, lower-cased: trimmed, with one leading "/" taken off, and cut at the first whitespace.
 * "" for anything that isn't a string.
 */
export function firstToken(command) {
	if (typeof command !== "string") return "";
	let text = command.trim();
	if (text.startsWith("/")) text = text.slice(1);
	const end = text.search(/\s/);
	return (end === -1 ? text : text.slice(0, end)).toLowerCase();
}

/**
 * Glob match, ignoring case. Only "*" is special (any run of characters, possibly none); everything else is literal. This is a
 * plain walk over the two strings rather than a regular expression, so no pattern can make it slow or change its meaning.
 */
export function matchesPattern(pattern, token) {
	if (typeof pattern !== "string" || typeof token !== "string") return false;
	if (token.length > MAX_TOKEN) return false;
	// A run of stars means the same as one star, so collapse them to keep the walk short.
	const p = pattern.toLowerCase().replace(/\*+/g, "*");
	const t = token.toLowerCase();

	// Remembers the last star, so a mismatch can retry with that star covering one more character.
	let pi = 0;
	let ti = 0;
	let starAt = -1;
	let starTi = 0;
	while (ti < t.length) {
		if (pi < p.length && p[pi] === "*") {
			starAt = pi++;
			starTi = ti;
		} else if (pi < p.length && p[pi] === t[ti]) {
			pi++;
			ti++;
		} else if (starAt !== -1) {
			pi = starAt + 1;
			ti = ++starTi;
		} else {
			return false;
		}
	}
	while (pi < p.length && p[pi] === "*") pi++;
	return pi === p.length;
}

/**
 * Whether this user may send this command to this server's console. Returns { ok: true }, or { ok: false, reason } where the
 * reason is safe to show and never contains the command.
 */
export function checkCommand(user, serverName, command) {
	if (typeof command !== "string" || command.trim() === "") return refuse(REFUSED_REQUIRED);
	if (!user) return refuse(REFUSED_SCOPE);

	// The same role the permission check used, so the scope always belongs to the role that let the request in.
	const role = getRole(roleIdFor(user, serverName));
	if (!role) return refuse(REFUSED_SCOPE);

	const { mode, patterns } = role.commandScope;
	if (mode === "all") return OK;
	if (mode !== "allow" && mode !== "deny") return refuse(REFUSED_SCOPE);

	if (SECOND_COMMAND.test(command)) return refuse(REFUSED_CHAINED);

	const token = firstToken(command);
	// Nothing to judge by, or a "/" left after the first one (which the game may read as a command of its own): refuse.
	if (token === "" || token.startsWith("/")) return refuse(token === "" ? REFUSED_REQUIRED : REFUSED_SCOPE);

	const named = patterns.some((pattern) => matchesPattern(pattern, token));
	if (mode === "allow") return named ? OK : refuse(REFUSED_SCOPE);
	return named ? refuse(REFUSED_SCOPE) : OK;
}
