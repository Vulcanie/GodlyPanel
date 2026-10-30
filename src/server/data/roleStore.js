import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";
import { PERMISSIONS, MODERATOR_PERMISSIONS } from "./permissionCatalog.js";

// Roles are data: the three built-in roles are fixed in code, and anything an admin makes is saved here.
// This file must not import userStore or permissions.js, which both import this one.

const STORE_PATH = path.join(paths.dataDir, "roles.json");
const SCHEMA_VERSION = 1;
const enqueue = createWriteQueue();

const PERMISSION_SET = new Set(PERMISSIONS);
const SCOPE_MODES = new Set(["all", "allow", "deny"]);
const MAX_PATTERNS = 50;
// Control characters, which have no business in a name or a command pattern and can mangle a log line or a screen.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;
// Ids this store makes. Anything else in roles.json is refused, which also keeps "admin" and the other built-in ids out.
const CUSTOM_ID = /^r-[0-9a-f]{8}$/;

export class RoleError extends Error {
	constructor(status, code, message) {
		super(message);
		this.name = "RoleError";
		this.status = status;
		this.code = code;
	}
}

const bad = (message) => new RoleError(400, "bad_role", message);

function builtIn(id, name, permissions) {
	return { id, name, locked: true, permissions, commandScope: { mode: "all", patterns: [] } };
}

// The admin role is always "everything", whatever this list says: permissionsFor() returns null for it.
const BUILT_IN = [
	builtIn("admin", "Administrator", [...PERMISSIONS]),
	builtIn("moderator", "Moderator", [...MODERATOR_PERMISSIONS]),
	builtIn("guest", "Viewer", []),
];

// Starts as just the built-ins, so the sync getters give sensible answers even before initRoleStore() has run.
let custom = [];

const everything = () => [...BUILT_IN, ...custom];

// Looks up by comparing ids, not by indexing an object, so a user-supplied "__proto__" or "constructor" finds nothing.
function find(id) {
	if (typeof id !== "string") return null;
	return everything().find((r) => r.id === id) ?? null;
}

// Hands out a copy, so a caller changing the result can't change the stored role.
function copy(role) {
	return {
		id: role.id,
		name: role.name,
		locked: role.locked === true,
		permissions: [...role.permissions],
		commandScope: { mode: role.commandScope.mode, patterns: [...role.commandScope.patterns] },
	};
}

// ---- validation ---------------------------------------------------------------------------------

function cleanName(name, others) {
	if (typeof name !== "string") throw bad("A role needs a name.");
	const trimmed = name.trim();
	if (trimmed.length < 1 || trimmed.length > 40) throw bad("A role name is 1 to 40 characters.");
	if (CONTROL_CHARS.test(trimmed)) throw bad("A role name can't contain control characters.");
	// Names are compared without case, so "Moderator" and "moderator" can't both exist and confuse whoever picks a role.
	const lowered = trimmed.toLowerCase();
	if (others.some((r) => r.name.toLowerCase() === lowered)) throw bad(`There is already a role called "${trimmed}".`);
	return trimmed;
}

function cleanPermissions(list) {
	if (!Array.isArray(list)) throw bad("Permissions must be a list.");
	const out = new Set();
	for (const p of list) {
		// Anything that isn't one of the known names is refused, so a typo can't quietly grant nothing or something unexpected.
		if (typeof p !== "string" || !PERMISSION_SET.has(p)) {
			throw bad(`Unknown permission: ${typeof p === "string" ? `"${p.slice(0, 64)}"` : "(not a name)"}.`);
		}
		out.add(p);
	}
	return [...out];
}

function cleanScope(scope) {
	// A role saved without a scope gets the default, which is no restriction on commands.
	if (scope === undefined) return { mode: "all", patterns: [] };
	if (!scope || typeof scope !== "object" || Array.isArray(scope)) throw bad("The command scope must be an object.");
	if (!SCOPE_MODES.has(scope.mode)) throw bad('The command scope mode must be "all", "allow" or "deny".');
	if (!Array.isArray(scope.patterns) || scope.patterns.length > MAX_PATTERNS) {
		throw bad(`A command scope can have at most ${MAX_PATTERNS} patterns.`);
	}
	const patterns = scope.patterns.map((p) => {
		if (typeof p !== "string" || p.length < 1 || p.length > 64 || CONTROL_CHARS.test(p)) {
			throw bad("Each command pattern is 1 to 64 characters with no control characters.");
		}
		return p;
	});
	return { mode: scope.mode, patterns };
}

// Checks the three editable fields together. `others` is the set of roles the name must not clash with.
function cleanFields(input, others) {
	if (!input || typeof input !== "object") throw bad("A role needs a name and a list of permissions.");
	return {
		name: cleanName(input.name, others),
		permissions: cleanPermissions(input.permissions),
		commandScope: cleanScope(input.commandScope),
	};
}

// Reads one saved custom role. Throws for anything wrong, so the caller can drop just that entry.
function readCustomRole(raw, accepted) {
	if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !CUSTOM_ID.test(raw.id)) {
		throw bad("Saved role has a bad id.");
	}
	if (accepted.some((r) => r.id === raw.id)) throw bad("Saved role id appears twice.");
	return { id: raw.id, ...cleanFields(raw, [...BUILT_IN, ...accepted]) };
}

async function persist(list) {
	await writeJsonAtomic(STORE_PATH, {
		schemaVersion: SCHEMA_VERSION,
		roles: list.map((r) => ({ id: r.id, name: r.name, permissions: r.permissions, commandScope: r.commandScope })),
	});
}

// A new id that isn't taken. Random, so a role's id doesn't say anything about it, and checked, so it can't land on a built-in.
function freshId() {
	for (;;) {
		const id = "r-" + crypto.randomBytes(4).toString("hex");
		if (!find(id)) return id;
	}
}

// ---- loading ------------------------------------------------------------------------------------

export async function initRoleStore() {
	// Strict, like the account store: a file that can't be opened is an error, not "no roles", because the next save would
	// overwrite the real one.
	const stored = await readJson(STORE_PATH, null, { strict: true });
	const entries = stored && Array.isArray(stored.roles) ? stored.roles : [];

	const accepted = [];
	let dropped = 0;
	for (const raw of entries) {
		try {
			accepted.push(readCustomRole(raw, accepted));
		} catch {
			dropped++;
		}
	}
	custom = accepted;

	// A damaged file falls back to built-ins only, so the panel still starts. Warned about once, here, not on every read.
	const problems = [];
	if (stored === null && fs.existsSync(STORE_PATH)) problems.push("roles.json could not be read");
	else if (stored !== null && !Array.isArray(stored?.roles)) problems.push("roles.json is not in the expected shape");
	if (dropped > 0) problems.push(`${dropped} saved role(s) were invalid and skipped`);
	if (problems.length > 0) console.warn(`[roles] ${problems.join("; ")}. Only the valid roles are in use.`);

	return list();
}

// ---- reading ------------------------------------------------------------------------------------

/** Built-ins first (admin, moderator, guest), then the custom roles. */
export function list() {
	return everything().map(copy);
}

/** The role, or null for an unknown id. */
export function get(id) {
	const role = find(id);
	return role ? copy(role) : null;
}

/**
 * What a role may do: null for admin (everything), a Set of permission names for the rest. An unknown id gets an empty Set,
 * so anything that doesn't recognise the role is refused rather than let through.
 */
export function permissionsFor(id) {
	const role = find(id);
	if (!role) return new Set();
	if (role.id === "admin") return null;
	return new Set(role.permissions);
}

export function isKnownRole(id) {
	return find(id) !== null;
}

// ---- changing -----------------------------------------------------------------------------------

export async function create(input) {
	return enqueue(async () => {
		const role = { id: freshId(), ...cleanFields(input, everything()) };
		const next = [...custom, role];
		await persist(next);
		custom = next;
		return copy(role);
	});
}

export async function update(id, patch) {
	return enqueue(async () => {
		const current = find(id);
		if (!current) throw new RoleError(404, "no_role", "That role doesn't exist.");
		if (current.locked) throw new RoleError(409, "role_locked", "The built-in roles can't be changed.");
		if (!patch || typeof patch !== "object") throw bad("Nothing to change.");

		// Only the fields in the patch change; the rest keep what they had.
		const pick = (key) => (Object.hasOwn(patch, key) ? patch[key] : current[key]);
		const others = everything().filter((r) => r.id !== id);
		const updated = {
			id,
			...cleanFields({ name: pick("name"), permissions: pick("permissions"), commandScope: pick("commandScope") }, others),
		};
		const next = custom.map((r) => (r.id === id ? updated : r));
		await persist(next);
		custom = next;
		return copy(updated);
	});
}

/**
 * countUsersHolding(id) says how many users have this role. Only a clear 0 lets it go: anything else, including a missing
 * or non-number count, is treated as in use, so nobody is left holding a role that has been deleted.
 */
export async function remove(id, countUsersHolding) {
	return enqueue(async () => {
		const current = find(id);
		if (!current) throw new RoleError(404, "no_role", "That role doesn't exist.");
		if (current.locked) throw new RoleError(409, "role_locked", "The built-in roles can't be removed.");
		if (typeof countUsersHolding !== "function") throw new TypeError("remove() needs a function that counts the users holding the role.");
		if (countUsersHolding(id) !== 0) {
			throw new RoleError(409, "role_in_use", "Users still hold this role. Move them to another role first.");
		}
		const next = custom.filter((r) => r.id !== id);
		await persist(next);
		custom = next;
	});
}
