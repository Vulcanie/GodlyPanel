import { normaliseIp } from "./auth.js";

// Nothing stopped a person on the network from guessing passwords as fast as
// bcrypt would let them. This is deliberately small: in-memory (a restart
// forgiving a lockout is fine on a LAN tool), keyed on both the address and the
// account so one machine can't hammer many usernames and many machines can't
// hammer one.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_ACCOUNT = 8;
const MAX_PER_ADDRESS = 30;

const failures = new Map(); // key -> { count, since }

function bump(key) {
	const now = Date.now();
	const entry = failures.get(key);
	if (!entry || now - entry.since > WINDOW_MS) {
		failures.set(key, { count: 1, since: now });
	} else {
		entry.count += 1;
	}
	// Bounded: an attacker cycling usernames shouldn't grow this without limit.
	if (failures.size > 2000) {
		for (const [k, v] of failures) if (now - v.since > WINDOW_MS) failures.delete(k);
	}
}

function retryAfterSeconds(key, max) {
	const entry = failures.get(key);
	if (!entry || entry.count < max) return 0;
	const remaining = WINDOW_MS - (Date.now() - entry.since);
	return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

const keys = (req) => {
	const ip = normaliseIp(req.socket.remoteAddress);
	const account = String(req.body?.username ?? "").toLowerCase();
	return { ipKey: `ip:${ip}`, accountKey: `acct:${account}` };
};

/** Refuse before spending ~250ms of bcrypt on a request that's already over the limit. */
export function loginGuard(req, res, next) {
	const { ipKey, accountKey } = keys(req);
	const wait = Math.max(
		retryAfterSeconds(ipKey, MAX_PER_ADDRESS),
		retryAfterSeconds(accountKey, MAX_PER_ACCOUNT),
	);
	if (wait > 0) {
		res.setHeader("Retry-After", String(wait));
		return res.status(429).json({
			error: `Too many failed sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
			code: "rate_limited",
		});
	}
	next();
}

export function recordLoginFailure(req) {
	const { ipKey, accountKey } = keys(req);
	bump(ipKey);
	bump(accountKey);
}

export function clearLoginFailures(req) {
	failures.delete(keys(req).accountKey);
}
