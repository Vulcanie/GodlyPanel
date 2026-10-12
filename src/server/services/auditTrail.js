import { logActivity } from "./activityLog.js";
import { getById } from "../data/userStore.js";
import { clientAddress } from "../middleware/auth.js";

// Who did what, in the activity log: every sign-in by an administrator or moderator, every refused or wrong password, and every
// change anyone makes through the panel. This is what the activity export and the audit webhook carry, so it records the fact of
// each action and never what was typed: no request bodies, no passwords, no values of settings or secrets, only which ones.
//
// Events: auth.signed_in, auth.failed, auth.signed_out, auth.password_changed, admin.action.

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// POSTs that only look at something (or ask the panel to look again) rather than change it.
const NOT_CHANGES = [
	/\/ports\/check$/,
	/\/check-folder$/,
	/\/launch\/(detect|capture)$/,
	/\/import\/(legacy\/preview|scan)$/,
	/\/backup-destinations\/(test|check|retry)$/,
	/\/panel\/(check|update-result\/dismiss)$/,
	/\/storage\/rescan$/,
	/\/notifications\/(test|check-disks)$/,
	/^\/auth\/(login|join|logout|change-password)$/, // sign-in and out are recorded by their own events
	/^\/auth\/preferences$/, // hiding a banner isn't a change to the panel
	/^\/setup\//,
];

const PLAYER_ACTION = { kick: "kicked", ban: "banned", unban: "unbanned" };
const CONTROL = { start: "started", stop: "stopped", restart: "restarted", update: "updated", "update-reboot": "updated and restarted", kill: "force-stopped" };

/** User-supplied text, made safe to put in one line of a log: no control characters, not too long. */
export const oneLine = (text, max = 60) => String(text ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);

const decodeURIComponentSafe = (text) => {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
};
const nameOf = (id) => getById(id)?.username ?? `account ${oneLine(id, 12)}`;
const keysOf = (body, depth = 1) => {
	if (!body || typeof body !== "object" || Array.isArray(body)) return [];
	const out = [];
	for (const [k, v] of Object.entries(body)) {
		if (depth > 0 && v && typeof v === "object" && !Array.isArray(v)) out.push(...Object.keys(v).map((s) => `${k}.${s}`));
		else out.push(k);
	}
	return out.slice(0, 12);
};

/** What a request did, in words. `route` is the pattern that matched (/server/:serverName/backups), `p` its parameters. */
export function describe(method, route, p = {}, body = {}) {
	const s = oneLine(p.serverName ?? p.name);
	const at = `${method} ${route}`;
	const rules = [
		[/^POST \/control\/:serverName\/:action$/, () => `${CONTROL[p.action] ?? `ran "${oneLine(p.action, 20)}" on`} ${s}`],
		[/^POST \/server\/:serverName\/backups$/, () => `started a backup of ${s}`],
		[/^DELETE \/server\/:serverName\/backups\/:id$/, () => `deleted backup ${oneLine(p.id, 40)} of ${s}`],
		[/^POST \/server\/:serverName\/backups\/:id\/restore$/, () => `restored backup ${oneLine(p.id, 40)} of ${s}`],
		[/^POST \/server\/:serverName\/rcon-password\/rotate$/, () => `changed the RCON password of ${s}`],
		[/^POST \/server\/:serverName\/players\/(kick|ban|unban)$/, () => `${PLAYER_ACTION[at.split("/").pop()]} a player on ${s}`],
		[/^PUT \/server\/:serverName\/session$/, () => `changed the session text of ${s}`],
		[/^DELETE \/server\/:serverName$/, () => `deleted the server ${s}`],
		[/^POST \/server\/:serverName\/clone$/, () => `cloned ${s}`],
		[/^POST \/servers$/, () => `created a server${body?.name ? ` (${oneLine(body.name)})` : ""}`],
		[/^PUT \/settings\/secrets$/, () => `changed secrets (${keysOf(body).join(", ") || "none"})`],
		[/^PUT \/settings$/, () => `changed settings (${keysOf(body).join(", ") || "none"})`],
		[/^POST \/settings\/backup-destinations$/, () => `added a backup destination${body?.name ? ` (${oneLine(body.name)})` : ""}`],
		[/^PUT \/settings\/backup-destinations\/:id$/, () => "changed a backup destination"],
		[/^DELETE \/settings\/backup-destinations\/:id$/, () => "removed a backup destination"],
		[/^POST \/users$/, () => `created the account ${oneLine(body?.username)} (${oneLine(body?.role, 12)})`],
		[/^PUT \/users\/:id\/role$/, () => `made ${nameOf(p.id)} ${oneLine(body?.role, 12)}`],
		[/^PUT \/users\/:id\/servers$/, () => `changed which servers ${nameOf(p.id)} can reach`],
		[/^PUT \/users\/:id\/disabled$/, () => `${body?.disabled ? "disabled" : "enabled"} the account ${nameOf(p.id)}`],
		[/^PUT \/users\/:id\/password$/, () => `set a new password for ${nameOf(p.id)}`],
		[/^DELETE \/users\/:id$/, () => `deleted the account ${nameOf(p.id)}`],
		[/^DELETE \/users\/:id\/sessions$/, () => `signed ${nameOf(p.id)} out everywhere`],
		[/^DELETE \/users\/sessions\/:id$/, () => "ended someone's sign-in"],
		[/^DELETE \/auth\/sessions\/:id$/, () => "ended one of their own sign-ins"],
		[/^POST \/auth\/sessions\/revoke-others$/, () => "signed out everywhere else"],
		[/^PUT \/users\/invite$/, () => "changed the community access code"],
		[/^POST \/updates\/panel\/install$/, () => "installed a GodlyPanel update"],
		[/^POST \/schedules$/, () => "added a scheduled task"],
		[/^PUT \/schedules\/:id$/, () => "changed a scheduled task"],
		[/^DELETE \/schedules\/:id$/, () => "removed a scheduled task"],
		[/^POST \/community\/(enable|disable)$/, () => `${at.split("/").pop()}d the community view`],
	];
	for (const [pattern, say] of rules) if (pattern.test(at)) return say();
	return `${method} ${route.replace(/:(serverName|name)/g, s || "?")}`;
}

function record(req, res) {
	const user = req.user;
	if (!user) return;
	const status = res.statusCode;
	if (status >= 400 && status !== 403 && status < 500) return; // a typo or a missing thing isn't an action
	// A request refused for the caller's role never reaches a route; it is still worth a line, by the address it asked for.
	if (!req.route && status !== 403) return;
	// The pattern that matched, without /api and without the trailing slash a router mounted at its own path leaves.
	const route = (req.route ? `${req.baseUrl ?? ""}${req.route.path}` : oneLine(decodeURIComponentSafe(req.originalUrl.split("?")[0]), 80)).replace(/^\/api(?=\/)/, "").replace(/(.)\/$/, "$1");
	if (NOT_CHANGES.some((pattern) => pattern.test(route))) return;
	const what = describe(req.method, route, req.params, req.body);
	const refused = status === 403;
	const failed = status >= 500;
	logActivity({
		type: "admin.action",
		server: req.params?.serverName ? oneLine(req.params.serverName) : null,
		level: failed ? "error" : refused ? "warn" : "info",
		message: `${user.username} (${user.role}): ${what}${refused ? " (refused)" : failed ? ` (failed, ${status})` : ""}`,
		data: { user: user.username, role: user.role, method: req.method, route, status, ip: clientAddress(req) },
	});
}

/** Middleware: after the caller is known, record each change they make once it has been answered. */
export function auditActions(req, res, next) {
	if (MUTATING.has(req.method)) {
		res.on("finish", () => {
			try {
				record(req, res);
			} catch (err) {
				console.warn("[audit] Couldn't record an action:", err.message);
			}
		});
	}
	next();
}

// ---- signing in and out -------------------------------------------------------------------------------

/** A successful sign-in. Viewers signing in are not an administrator's action, so they are not recorded. */
export function auditSignedIn(req, user, via = "") {
	if (user.role === "guest") return;
	logActivity({
		type: "auth.signed_in",
		message: `${user.username} (${user.role}) signed in${via ? ` ${via}` : ""}.`,
		data: { user: user.username, role: user.role, ip: clientAddress(req) },
	});
}

/** A wrong password, or an account that doesn't exist (the two read the same on purpose). */
export function auditSignInFailed(req, username, via = "") {
	logActivity({
		type: "auth.failed",
		level: "warn",
		message: `A sign-in as "${oneLine(username, 40)}" failed${via ? ` ${via}` : ""}.`,
		data: { user: oneLine(username, 40), ip: clientAddress(req) },
	});
}

export function auditSignedOut(req) {
	if (!req.user || req.user.role === "guest") return;
	logActivity({ type: "auth.signed_out", message: `${req.user.username} (${req.user.role}) signed out.`, data: { user: req.user.username, ip: clientAddress(req) } });
}

export function auditPasswordChanged(req) {
	logActivity({
		type: "auth.password_changed",
		message: `${req.user.username} (${req.user.role}) changed their own password.`,
		data: { user: req.user.username, ip: clientAddress(req) },
	});
}
