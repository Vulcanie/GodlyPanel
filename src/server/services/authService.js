import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Fixed two-user model (admin/guest) matching the dashboard's existing
// roles — not a general user system. Credentials live only as bcrypt
// hashes in .env, never in source or in the deployed frontend bundle.
const USERS = {
	admin: { role: "admin", passwordHash: process.env.ADMIN_PASSWORD_HASH },
	guest: { role: "guest", passwordHash: process.env.GUEST_PASSWORD_HASH },
};

const TOKEN_TTL = "30d";

export async function verifyCredentials(username, password) {
	const user = USERS[username];
	if (!user?.passwordHash) return null;

	const ok = await bcrypt.compare(password, user.passwordHash);
	return ok ? user.role : null;
}

export function issueToken(role) {
	return jwt.sign({ role }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Returns the decoded payload (e.g. { role: "admin" }) or null if the
// token is missing, expired, or doesn't verify against JWT_SECRET.
export function verifyToken(token) {
	try {
		return jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		return null;
	}
}
