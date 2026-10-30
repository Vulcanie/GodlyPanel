import express from "express";
import { list, get, create, update, remove, permissionsFor, RoleError } from "../data/roleStore.js";
import { PERMISSIONS, PERMISSION_GROUPS } from "../data/permissionCatalog.js";
import { countWithRole } from "../data/userStore.js";
import { requirePermission } from "../middleware/permissions.js";
import { logActivity } from "../services/activityLog.js";

// Making and changing roles. Every route needs roles.manage, which the admin role has and a custom role may be given.
// Assigning a role to an account is a different thing and stays admin only (see routes/users.js).

const router = express.Router();

// The scope a role gets when nothing is said about it: no restriction on commands.
const NO_SCOPE = { mode: "all", patterns: [] };

// A non-admin may only hand out what it holds itself. Admin's null means everything, so it passes every check.
function actorHolds(actor, permissions) {
	const held = permissionsFor(actor.role);
	return held === null || permissions.every((p) => held.has(p));
}

function refuseEscalation() {
	return new RoleError(403, "role_escalation", "You can't give a role permissions you don't have yourself.");
}

// Same meaning as the role store's own check: two scopes are the same when their mode and patterns are. Anything that is not
// an object counts as different, so a non-admin can't slip a malformed scope past the check.
function sameScope(sent, current) {
	if (!sent || typeof sent !== "object" || Array.isArray(sent)) return false;
	if (sent.mode !== current.mode || !Array.isArray(sent.patterns) || sent.patterns.length !== current.patterns.length) return false;
	return sent.patterns.every((p, i) => p === current.patterns[i]);
}

// Only an admin may move a role's command scope away from where it is. For a new role, "where it is" is no restriction.
function scopeChangeAllowed(actor, sent, current) {
	if (sent === undefined) return true;
	if (permissionsFor(actor.role) === null) return true;
	return sameScope(sent, current);
}

// Maps the store's and this file's errors onto the same reply shape the other routes use.
function sendError(res, e) {
	if (e instanceof RoleError) return res.status(e.status).json({ error: e.message, code: e.code });
	res.status(400).json({ error: e.message });
}

router.get("/", requirePermission("roles.manage"), (req, res) => {
	const roles = list().map((role) => ({ ...role, users: countWithRole(role.id) }));
	res.json({ roles, permissions: PERMISSIONS, groups: PERMISSION_GROUPS });
});

router.post("/", requirePermission("roles.manage"), async (req, res) => {
	const body = req.body && typeof req.body === "object" ? req.body : {};
	try {
		// A new role's permissions must all be ones the actor holds. A list that isn't a list is left for the store to refuse.
		if (Array.isArray(body.permissions) && !actorHolds(req.user, body.permissions)) throw refuseEscalation();
		if (!scopeChangeAllowed(req.user, body.commandScope, NO_SCOPE)) throw refuseEscalation();

		const role = await create({ name: body.name, permissions: body.permissions, commandScope: body.commandScope });
		logActivity({ type: "role.created", message: `${req.user.username} created the role "${role.name}".` });
		res.json(role);
	} catch (e) {
		sendError(res, e);
	}
});

router.put("/:id", requirePermission("roles.manage"), async (req, res) => {
	const body = req.body && typeof req.body === "object" ? req.body : {};
	try {
		// Only the three editable fields are passed on, so nothing else in the body can reach the store.
		const patch = {};
		for (const key of ["name", "permissions", "commandScope"]) if (Object.hasOwn(body, key)) patch[key] = body[key];

		const current = get(req.params.id);
		if (!current) throw new RoleError(404, "no_role", "That role doesn't exist.");
		// To change a role you must hold all of it as it is now, and all of what it will become.
		if (!actorHolds(req.user, current.permissions)) throw refuseEscalation();
		if (Array.isArray(patch.permissions) && !actorHolds(req.user, patch.permissions)) throw refuseEscalation();
		if (!scopeChangeAllowed(req.user, patch.commandScope, current.commandScope)) throw refuseEscalation();

		const role = await update(current.id, patch);
		logActivity({ type: "role.updated", message: `${req.user.username} changed the role "${role.name}".` });
		res.json(role);
	} catch (e) {
		sendError(res, e);
	}
});

router.delete("/:id", requirePermission("roles.manage"), async (req, res) => {
	try {
		const current = get(req.params.id);
		if (!current) throw new RoleError(404, "no_role", "That role doesn't exist.");
		// Removing a role takes away what it gives, so the actor must hold all of it.
		if (!actorHolds(req.user, current.permissions)) throw refuseEscalation();

		await remove(current.id, countWithRole);
		logActivity({ type: "role.deleted", message: `${req.user.username} deleted the role "${current.name}".` });
		res.json({ success: true });
	} catch (e) {
		sendError(res, e);
	}
});

export default router;
