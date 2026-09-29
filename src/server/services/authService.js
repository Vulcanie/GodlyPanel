import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSecrets } from "../config/secretsStore.js";

// Still the fixed two-user model (admin/guest) the dashboard was built
// around. Real user accounts, cookie sessions and server-enforced roles are
// Stage 3; this stage only moves where the credentials are stored — from
// environment variables to the secrets file — so there's no .env left to
// hand-maintain. Hashes are read per call rather than captured at import,
// so changing a password takes effect without a restart.
const TOKEN_TTL = "30d";

function lookup(username) {
	const secrets = getSecrets();
	if (username === "admin") {
		return { role: "admin", passwordHash: secrets.adminPasswordHash };
	}
	if (username === "guest") {
		return { role: "guest", passwordHash: secrets.guestPasswordHash };
	}
	return null;
}

export async function verifyCredentials(username, password) {
	const user = lookup(username);
	if (!user?.passwordHash) return null;

	const ok = await bcrypt.compare(password, user.passwordHash);
	return ok ? user.role : null;
}

export async function setPassword(username, plainPassword) {
	const { patchSecrets } = await import("../config/secretsStore.js");
	const hash = await bcrypt.hash(plainPassword, 12);
	const key = username === "admin" ? "adminPasswordHash" : "guestPasswordHash";
	await patchSecrets({ [key]: hash });
	return true;
}

/** True when no admin password has been set yet — a fresh install. */
export function needsSetup() {
	return !getSecrets().adminPasswordHash;
}

export function issueToken(role) {
	return jwt.sign({ role }, getSecrets().jwtSecret, { expiresIn: TOKEN_TTL });
}

// Returns the decoded payload (e.g. { role: "admin" }) or null if the token is
// missing, expired, or doesn't verify.
export function verifyToken(token) {
	try {
		return jwt.verify(token, getSecrets().jwtSecret);
	} catch {
		return null;
	}
}
