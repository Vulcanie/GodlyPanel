import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";
import { getSecrets, patchSecrets } from "../config/secretsStore.js";

const STORE_PATH = path.join(paths.dataDir, "users.json");
const SCHEMA_VERSION = 1;
const BCRYPT_ROUNDS = 12;
const enqueue = createWriteQueue();

export { ROLES } from "../middleware/permissions.js";
import { ROLES } from "../middleware/permissions.js";

let users = [];

function publicView(user) {
	const { passwordHash, ...rest } = user;
	return rest;
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
		disabled: false,
		createdAt: new Date().toISOString(),
	};
}

export async function initUserStore() {
	const stored = await readJson(STORE_PATH, null);

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
			"Username must be 3-32 characters, letters/numbers/dot/underscore/hyphen only.",
		);
	}
}

function assertValidPassword(password) {
	if (typeof password !== "string" || password.length < 8) {
		throw new Error("Password must be at least 8 characters.");
	}
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
		assertValidPassword(password);
		if (!ROLES.includes(role)) throw new Error(`Unknown role "${role}".`);
		if (getByUsername(username)) {
			throw new Error(`A user named "${username}" already exists.`);
		}

		const user = makeUser(username, role, await bcrypt.hash(password, BCRYPT_ROUNDS));
		user.servers = role === "moderator" ? assertValidServers(servers) : null;
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

export async function setPassword(id, password) {
	return enqueue(async () => {
		assertValidPassword(password);
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		return mutate(
			id,
			{ passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
			{ bumpSession: true },
		);
	});
}

export async function setRole(id, role) {
	return enqueue(async () => {
		if (!ROLES.includes(role)) throw new Error(`Unknown role "${role}".`);
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		if (user.role !== role) assertNotLastAdmin(user, { changingRole: true });
		return mutate(id, { role, ...(role === "moderator" ? {} : { servers: null }) }, { bumpSession: true });
	});
}

/** Limit a moderator to some servers, or pass null to allow all. */
export async function setServers(id, servers) {
	return enqueue(async () => {
		const user = getById(id);
		if (!user) throw new Error("No such user.");
		return mutate(id, { servers: user.role === "moderator" ? assertValidServers(servers) : null }, { bumpSession: true });
	});
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
