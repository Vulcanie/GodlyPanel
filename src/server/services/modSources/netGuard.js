import dns from "node:dns";
import net from "node:net";

// The guard every mod download and provider call goes through. A mod's address, and the address of
// everything it redirects to, comes from someone else, so each hop is checked before anything is
// requested from it: the scheme, no username or password, the default port, a host the provider named,
// and a name that resolves only to public addresses. A refused hop is never requested.

const REFUSAL = "That address isn't one the panel will download from.";
const LOOPBACK_HOST = "127.0.0.1";
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

// The one place the loopback test hook is read. Only the test suites set it, like the other GHP_* overrides, and it only
// lets a stand-in on this machine answer; every other check still applies.
export function loopbackTestMode() {
	return process.env.GHP_MODSOURCE_ALLOW_LOOPBACK === "1";
}

function privateV4([a, b]) {
	if (a === 0 || a === 10 || a === 127) return true; // 0/8, 10/8, 127/8
	if (a === 100 && (b & 0xc0) === 64) return true; // 100.64/10: second octet 64 to 127
	if (a === 169 && b === 254) return true; // link-local
	if (a === 172 && (b & 0xf0) === 16) return true; // 172.16/12: second octet 16 to 31
	if (a === 192 && b === 168) return true; // home and office networks
	return a >= 224; // multicast, reserved, and the broadcast address
}

// The eight 16-bit groups of an IPv6 address, or null when it can't be read. A zone id (fe80::1%eth0) is refused
// as unclear rather than parsed.
function ipv6Groups(text) {
	if (text.includes("%")) return null;
	let s = text;
	// A dotted tail (::ffff:10.0.0.5) is written as two hex groups, so the rest of the code only sees one form.
	const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
	if (tail) {
		if (!net.isIPv4(tail[1])) return null;
		const [a, b, c, d] = tail[1].split(".").map(Number);
		s = `${s.slice(0, tail.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
	}
	const halves = s.split("::");
	if (halves.length > 2) return null;
	const head = halves[0] === "" ? [] : halves[0].split(":");
	const rest = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : [];
	let groups = head;
	if (halves.length === 2) {
		const fill = 8 - head.length - rest.length;
		if (fill < 1) return null; // "::" stands for at least one group
		groups = [...head, ...Array(fill).fill("0"), ...rest];
	}
	if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return null;
	return groups.map((g) => Number.parseInt(g, 16));
}

function privateV6(g) {
	// ::/96 is the unspecified address, the loopback ::1, and the old IPv4-compatible forms. None of them is
	// a public address, so the whole range is refused rather than judging each form.
	if (g.slice(0, 6).every((x) => x === 0)) return true;
	// An IPv4 address written in IPv6 form (::ffff:a.b.c.d) is judged by the IPv4 address it carries.
	if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) {
		return privateV4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
	}
	if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7, unique local
	if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10, link-local
	if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8, multicast
	return false;
}

/**
 * True when an address is one the panel must not download from: this machine, the local network, link-local,
 * multicast or reserved. Anything it can't read is treated as private, so a junk answer fails closed.
 * @param {string} ip
 * @returns {boolean}
 */
export function isPrivateAddress(ip) {
	if (typeof ip !== "string") return true;
	if (net.isIPv4(ip)) return privateV4(ip.split(".").map(Number));
	if (ip.includes(":")) {
		const groups = ipv6Groups(ip);
		return groups === null ? true : privateV6(groups);
	}
	return true;
}

/**
 * A fetch that only goes where the provider named, and only to public addresses. The returned function has the
 * fetch(url, init) signature, so it can stand in for fetch anywhere a download or a provider call is made.
 *
 * @param {object} options
 * @param {string[]} options.hosts  the host names the provider's files and answers may come from
 * @param {boolean} [options.allowHttp]  allow plain http as well as https
 * @param {(host: string, options: object) => Promise<Array<{address: string}>>} [options.resolve]  looks up a name (dns.promises.lookup)
 * @param {number} [options.maxHops]  how many redirects are followed before the request is refused
 * @param {typeof fetch} [options.fetchImpl]  the fetch that makes the request once the address is cleared
 */
export function guardedFetch({ hosts, allowHttp = false, resolve = dns.promises.lookup, maxHops = 3, fetchImpl = fetch } = {}) {
	const loopback = loopbackTestMode();
	const allowed = new Set([...(hosts ?? []), ...(loopback ? [LOOPBACK_HOST] : [])].map((h) => String(h).toLowerCase()));
	const httpOk = allowHttp || loopback;

	// Every check on one address. Throws the same refusal for each, so a caller can't tell which rule stopped it.
	async function checkTarget(text) {
		let url;
		try {
			url = new URL(text);
		} catch {
			throw new Error(REFUSAL);
		}
		if (url.protocol !== "https:" && !(httpOk && url.protocol === "http:")) throw new Error(REFUSAL);
		if (url.username !== "" || url.password !== "") throw new Error(REFUSAL);
		if (!loopback && url.port !== "") throw new Error(REFUSAL);
		const host = url.hostname.toLowerCase();
		if (!allowed.has(host)) throw new Error(REFUSAL);
		if (loopback) return url;

		// A literal address is checked directly; a name is checked against every address it resolves to, so one
		// private answer among public ones still refuses it.
		const literal = host.replace(/^\[|\]$/g, "");
		if (net.isIP(literal)) {
			if (isPrivateAddress(literal)) throw new Error(REFUSAL);
			return url;
		}
		let answers;
		try {
			answers = await resolve(host, { all: true });
		} catch {
			throw new Error(REFUSAL);
		}
		if (!Array.isArray(answers) || answers.length === 0) throw new Error(REFUSAL);
		for (const answer of answers) {
			const ip = answer && typeof answer === "object" ? answer.address : answer;
			if (typeof ip !== "string" || isPrivateAddress(ip)) throw new Error(REFUSAL);
		}
		return url;
	}

	return async function guarded(target, init = {}) {
		let current = target;
		for (let hop = 0; ; hop += 1) {
			const url = await checkTarget(current);
			// Redirects are always followed here, one hop at a time, so each new address is checked before it is requested.
			// Whatever the caller asked for is overridden.
			const res = await fetchImpl(url.href, { ...init, redirect: "manual" });
			const location = res.headers.get("location");
			if (!REDIRECTS.has(res.status) || !location) return res;
			await res.body?.cancel().catch(() => {});
			if (hop >= maxHops) throw new Error("Too many redirects.");
			let next;
			try {
				next = new URL(location, url).href;
			} catch {
				throw new Error(REFUSAL);
			}
			current = next;
		}
	};
}
