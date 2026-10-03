import { clientAddress } from "./auth.js";

// Nothing stopped a person on the network from guessing passwords as fast as
// bcrypt would let them. This is deliberately small: in-memory (a restart
// forgiving a lockout is fine on a LAN tool), keyed on both the address and the
// account so one machine can't hammer many usernames and many machines can't
// hammer one.
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Each sign-in page that faces a different audience makes its own limiter, so wrong guesses
 * from the internet are never counted against (and can't lock out) the same account at home.
 */
export function createLoginLimiter({ maxPerAccount = 8, maxPerAddress = 30 } = {}) {
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
		const ip = clientAddress(req);
		const account = String(req.body?.username ?? "").toLowerCase();
		return { ipKey: `ip:${ip}`, accountKey: `acct:${account}` };
	};

	return {
		/** Refuse before spending ~250ms of bcrypt on a request that's already over the limit. */
		loginGuard(req, res, next) {
			const { ipKey, accountKey } = keys(req);
			const wait = Math.max(retryAfterSeconds(ipKey, maxPerAddress), retryAfterSeconds(accountKey, maxPerAccount));
			if (wait > 0) {
				res.setHeader("Retry-After", String(wait));
				return res.status(429).json({
					error: `Too many failed sign-in attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`,
					code: "rate_limited",
				});
			}
			next();
		},
		recordLoginFailure(req) {
			const { ipKey, accountKey } = keys(req);
			bump(ipKey);
			bump(accountKey);
		},
		clearLoginFailures(req) {
			failures.delete(keys(req).accountKey);
		},
	};
}

const panelLimiter = createLoginLimiter();

export const loginGuard = panelLimiter.loginGuard;
export const recordLoginFailure = panelLimiter.recordLoginFailure;
export const clearLoginFailures = panelLimiter.clearLoginFailures;
