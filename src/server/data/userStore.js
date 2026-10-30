import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";
import { getSecrets, patchSecrets } from "../config/secretsStore.js";
import { passwordProblem } from "../util/passwordRules.js";
import { isKnownRole } from "./roleStore.js";

const STORE_PATH = path.join(paths.dataDir, "users.json");
const SCHEMA_VERSION = 1;
const BCRYPT_ROUNDS = 12;
const enqueue = createWriteQueue();
// Caps how many per-server roles one account can carry, so a request can't bloat users.json.
const MAX_SERVER_ROLES = 50;
// Control characters, which have no place in a server name.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

export { ROLES } from "../middleware/permissions.js";

let users = [];

function publicView(user) {
	const { passwordHash, ...rest } = user;
	// Accounts saved before per-server roles existed have no field; report them as null, without rewriting the file.
	return { ...rest, serverRoles: rest.serverRoles ?? null };
}

// Admins always have every permission, and guests can't be limited to a list of servers. Every other role can be,
// so a custom role can be given to some servers only.
function canBeLimited(role) {
	return role !== "admin" && role !== "guest";
}

async function persist() {
	await writeJsonAtomic(STORE_PATH, { schemaVersion: SCHEMA_VERSION, users });
}

/**
 * Adopt the two fixed accounts that used to live as bare hashes in secrets,
 * so an existing install keeps working and nobody is locked out by the
 * upgrade. Runs once; the hashes are then cleared from secrets.
 */
async function migrateFromSecrets() {
	const secrets = getSecrets();
	const migrated = [];

	if (secrets.adminPasswordHash) {
		migrated.push(makeUser("admin", "admin", secrets.adminPasswordHash));
	}
	if (secrets.guestPasswordHash) {
		migrated.push(makeUser("guest", "guest", secrets.guestPasswordHash));
	}

	if (migrated.length === 0) return false;

	users = migrated;
	await persist();
	await patchSecrets({ adminPasswordHash: "", guestPasswordHash: "" });
	console.log(
		`[users] Migrated ${migrated.length} account(s) from secrets into users.json.`,
	);
	return true;
}

function makeUser(username, role, passwordHash) {
	return {
		id: crypto.randomUUID(),
		username,
		role,
		passwordHash,
		// Bumped on password change, role change, or an explicit revoke.
		// Tokens carry the value they were issued with, so raising it
		// invalidates every outstanding session for that user immediately —
		// without it, demoting someone would take up to the token lifetime.
		sessionVersion: 1,
		// null = may act on every server; a list limits a moderator to those servers.
		servers: null,
		// null, or { [serverName]: roleId }: on a server named here that role applies instead of the account's own role.
		serverRoles: null,
		disabled: false,
		createdAt: new Date().toISOString(),
	};
}

export async function initUserStore() {
	const stored = await readJson(STORE_PATH, null, { strict: true });

	if (stored && Array.isArray(stored.users)) {
		users = stored.users;
	} else if (!(await migrateFromSecrets())) {
		users = [];
		await persist();
	}

	console.log(`[users] ${users.length} account(s).`);
	return list();
}

export function list() {
	return users.map(publicView);
}

export function count() {
	return users.length;
}

/** True on a brand-new install: nobody can sign in, so setup must run. */
export function needsSetup() {
	return !users.some((u) => u.role === "admin" && !u.disabled);
}

export function getByUsername(username) {
	const lowered = String(username ?? "").toLowerCase();
	return users.find((u) => u.username.toLowerCase() === lowered) ?? null;
}

export function getById(id) {
	return users.find((u) => u.id === id) ?? null;
}

// A real hash of a throwaway value, so an unknown or disabled account costs the
// same ~250ms as a wrong password. Returning instantly for those let anyone on
// the network tell which usernames exist just by timing the login.
const DUMMY_HASH = "$2b$12$bRaJFtoRlDkppltmf2rbWOoqcmUIn1j.qdYfTrC/9LkeASbbDhKHS";

export async function verifyCredentials(username, password) {
	const user = getByUsername(username);
	const usable = Boolean(user) && !user.disabled;
	const ok = await bcrypt.compare(String(password ?? ""), usable ? user.passwordHash : DUMMY_HASH);
	return usable && ok ? user : null;
}

function assertValidUsername(username) {
	if (!/^[A-Za-z0-9._-]{3,32}$/.test(username ?? "")) {
		throw new Error(
			"A username is 3 to 32 characters long and can use letters, numbers, dots, dashes and underscores (no spaces).",
		);
	}
}

function assertValidPassword(password, username) {
	const problem = passwordProblem(password, username);
	if (problem) throw new Error(problem);
}

function assertValidServers(servers) {
	if (servers === null || servers === undefined) return null;
	if (!Array.isArray(servers) || servers.some((s) => typeof s !== "string")) {
		throw new Error("The server list must be a list of server names.");
	}
	return [...new Set(servers)];
}

export async function createUser({ username, password, role, servers = null }) {
	return enqueue(async () => {
		assertValidUsername(username);
		assertValidPassword(password, username);
		if (!isKnownRole(role)) throw new Error(`Unknown role "${role}".`);
		if (getByUsername(username)) {
			throw new Error(`A user named "${username}" already exists.`);
		}

		const user = makeUser(username, role, await bcrypt.hash(password, BCRYPT_ROUNDS));
		user.servers = canBeLimited(role) ? assertValidServers(servers) : null;
		users = [...users, user];
		await persist();
		return publicView(user);
	});
}

/** Guards against locking everyone out of their own panel. */
function assertNotLastAdmin(user, { changingRole = false, disabling = false, deleting = false }) {
	if (user.role !== "admin" || user.disabled) return;
	const otherActiveAdmins = users.filter(
		(u) => u.id !== user.id && u.role === "admin" && !u.disabled,
	);
	if (otherActiveAdmins.length > 0) return;

	const action = deleting ? "delete" : disabling ? "disable" : "change the role of";
	throw new Error(`Cannot ${action} the only admin account.`);
}

async function mutate(id, patch, { bumpSession = false } = {}) {
	const index = users.findIndex((u) => u.id === id);
	if (index === -1) throw new Error("No such user.");
	const updated = {
		...users[index],
		...patch,
		sessionVersion: bumpSession
			? users[index].sessionVersion + 1
			: users[index].sessionVersion,
	};
	users = users.map((u, i) => (i === index ? updated : u));
	await persist();
	return publicView(updated);
}

// ---- preferences -------------------------------------------------------------------------------
// Small things a person has chosen for themselves ("don't show this again"), kept on their account rather than in the browser,
// so they hold on every browser, address and device instead of coming back whenever local storage is a different one. Only the
// keys listed here are accepted, and each has a shape; anything else is refused.

const PREFERENCES = {
	checklistDismissed: (v) => typeof v === "boolean",
	// The version of the panel whose "update available" banner was closed; the next version shows it again.
	updateBannerDismissed: (v) => v === null || (typeof v === "string" && v.length > 0 && v.length <= 64),
	// The panel's language, as a code like "es" or "en-XA". Only the shape is checked: the UI ignores codes it does not ship.
	language: (v) => v === null || (typeof v === "string" && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(v)),
};

export function getPreferences(id) {
	return { ...(getById(id)?.prefs ?? {}) };
}

export async function setPreferences(id, patch) {
	return enqueue(async () => {
		if (!getById(id)) throw new Error("No such user.");
		const clean = {};
		for (const [key, value] of Object.entries(patch ?? {})) {
			if (!Object.hasOwn(PREFERENCES, key) || !PREFERENCES[key](value)) throw new Error("Not a setting that can be kept: " + key);
			clean[key] = value;
		}
		const next = { ...(getById(id).prefs ?? {}), ...clean };
		for (const key of Object.keys(next)) if (next[key] === null || next[key] === false) delete next[key];
		await mutate(id, { prefs: next });
		return getPreferences(id);
	});
}

export async function setPassword(id, password) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		assertValidPassword(password, user.username);
		return mutate(
			id,
			{ passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
			{ bumpSession: true },
		);
	});
}

export async function setRole(id, role) {
	return enqueue(async () => {
		if (!isKnownRole(role)) throw new Error(`Unknown role "${role}".`);
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		if (user.role !== role) assertNotLastAdmin(user, { changingRole: true });
		return mutate(
			id,
			{
				role,
				servers: canBeLimited(role) ? (user.servers ?? null) : null,
				// An admin has every permission already, so per-server roles on one would do nothing and only confuse.
				serverRoles: role === "admin" ? null : (user.serverRoles ?? null),
			},
			{ bumpSession: true },
		);
	});
}

/** Limit an account to some servers, or pass null to allow all. Admins and guests are never limited. */
export async function setServers(id, servers) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		return mutate(id, { servers: canBeLimited(user.role) ? assertValidServers(servers) : null }, { bumpSession: true });
	});
}

// Checks a { [serverName]: roleId } map. Returns the map to store, or null for "no per-server roles".
function cleanServerRoles(map) {
	if (map === null || map === undefined) return null;
	const shapeProblem = "The per-server roles must be a list of server names, each with one role.";
	if (!map || typeof map !== "object" || Array.isArray(map)) throw new Error(shapeProblem);
	// Must be a plain object: a class instance would carry its own behaviour into what gets saved.
	const proto = Object.getPrototypeOf(map);
	if (proto !== Object.prototype && proto !== null) throw new Error(shapeProblem);
	const entries = Object.entries(map);
	if (entries.length === 0) return null;
	if (entries.length > MAX_SERVER_ROLES) {
		throw new Error(`An account can have at most ${MAX_SERVER_ROLES} per-server roles.`);
	}
	for (const [server, roleId] of entries) {
		if (typeof server !== "string" || [...server].length < 1 || [...server].length > 100 || CONTROL_CHARS.test(server)) {
			throw new Error("Each server name is 1 to 100 characters with no control characters.");
		}
		if (typeof roleId !== "string" || roleId === "admin" || !isKnownRole(roleId)) {
			throw new Error(`Server "${server}" needs a role that exists. Administrator can't be given for a single server.`);
		}
	}
	// Object.fromEntries defines each key as an ordinary property, so a key such as "__proto__" can't change the prototype.
	return Object.fromEntries(entries);
}

/** Give an account a different role on some servers. Admin accounts can't have these, since they already have everything. */
export async function setServerRoles(id, map) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		if (user.role === "admin") throw new Error("Administrators already have every permission.");
		return mutate(id, { serverRoles: cleanServerRoles(map) }, { bumpSession: true });
	});
}

/**
 * How many accounts use this role, either as their own role or on one server. An account counts once even if it uses the
 * role both ways. Synchronous on purpose: the role store only lets a plain 0 mean "unused".
 */
export function countWithRole(roleId) {
	return users.filter((u) => u.role === roleId || Object.values(u.serverRoles ?? {}).includes(roleId)).length;
}

export async function setDisabled(id, disabled) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		if (disabled) assertNotLastAdmin(user, { disabling: true });
		return mutate(id, { disabled: Boolean(disabled) }, { bumpSession: true });
	});
}

export async function removeUser(id) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		assertNotLastAdmin(user, { deleting: true });
		users = users.filter((u) => u.id !== id);
		await persist();
	});
}

export const usersPath = STORE_PATH;
