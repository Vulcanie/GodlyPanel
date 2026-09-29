import jwt from "jsonwebtoken";
import { getSecrets } from "../config/secretsStore.js";
import { getById } from "../data/userStore.js";

const COOKIE_NAME = "gp_session";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// A cookie rather than an Authorization header, because the live-update
// endpoint is an EventSource and the browser API gives no way to set headers
// on it. That single constraint is why the original panel left every GET
// unauthenticated. Same-origin now, so a cookie is sent automatically and
// every route — SSE included — can be behind real auth.
//
// Not marked Secure: this is plain HTTP on a LAN. That is a deliberate,
// documented limitation of v1, paired with refusing non-LAN connections.
function cookieOptions() {
	return {
		httpOnly: true,
		sameSite: "strict",
		path: "/",
		maxAge: TOKEN_TTL_SECONDS * 1000,
	};
}

/** One cookie, parsed by hand — not worth a dependency (or its CVE surface). */
function readSessionCookie(req) {
	const header = req.headers.cookie;
	if (!header) return null;
	for (const part of header.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		if (part.slice(0, eq).trim() === COOKIE_NAME) {
			// A malformed escape throws, and this runs on every request — one bad
			// cookie would otherwise turn every page, the login screen included,
			// into a 500 until the browser dropped it.
			try {
				return decodeURIComponent(part.slice(eq + 1).trim());
			} catch {
				return null;
			}
		}
	}
	return null;
}

export function issueSession(res, user) {
	const token = jwt.sign(
		{ sub: user.id, u: user.username, role: user.role, sv: user.sessionVersion },
		getSecrets().jwtSecret,
		{ expiresIn: TOKEN_TTL_SECONDS, algorithm: "HS256" },
	);
	res.cookie(COOKIE_NAME, token, cookieOptions());
	return token;
}

export function clearSession(res) {
	res.clearCookie(COOKIE_NAME, { path: "/" });
}

/**
 * Resolves the caller into req.user, or leaves it null. Never responds — route
 * guards decide what to do about it.
 *
 * The role is re-read from the store rather than trusted from the token, and
 * the token's sessionVersion must still match. That's what makes a demotion,
 * a disable, or a password change take effect immediately instead of whenever
 * the token happens to expire.
 */
export function attachUser(req, res, next) {
	req.user = null;
	const token = readSessionCookie(req);
	if (!token) return next();

	let payload;
	try {
		payload = jwt.verify(token, getSecrets().jwtSecret, { algorithms: ["HS256"] });
	} catch {
		return next();
	}

	const user = getById(payload.sub);
	if (!user || user.disabled || user.sessionVersion !== payload.sv) {
		clearSession(res);
		return next();
	}

	req.user = { id: user.id, username: user.username, role: user.role };
	next();
}

export function requireRole(...roles) {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ error: "Sign in required.", code: "unauthenticated" });
		}
		if (!roles.includes(req.user.role)) {
			return res
				.status(403)
				.json({ error: "You don't have access to that.", code: "forbidden" });
		}
		next();
	};
}

/**
 * First-run setup is restricted to the machine itself. Without this, on a
 * shared network the first person to reach the panel could claim the admin
 * account before the owner does.
 */
export function loopbackOnly(req, res, next) {
	const addr = normaliseIp(req.socket.remoteAddress);
	if (addr === "127.0.0.1" || addr === "::1") return next();
	return res.status(403).json({
		error: "Initial setup can only be completed on the computer running GodlyPanel.",
		code: "setup_local_only",
	});
}

/** ::ffff:192.168.1.5 -> 192.168.1.5, and strip any %scope suffix. */
export function normaliseIp(raw) {
	if (!raw) return "";
	let ip = String(raw).trim();
	const scope = ip.indexOf("%");
	if (scope !== -1) ip = ip.slice(0, scope);
	if (ip.toLowerCase().startsWith("::ffff:") && ip.includes(".")) {
		ip = ip.slice(7);
	}
	return ip;
}

export { COOKIE_NAME };
