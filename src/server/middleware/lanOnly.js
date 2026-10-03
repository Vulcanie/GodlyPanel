import os from "node:os";
import { normaliseIp } from "./auth.js";

// v1 refuses anything that isn't a local network address. No tunnel, no
// port-forward helper — if the panel somehow becomes reachable from the
// internet, it should stop answering rather than quietly serve up server
// configs.
//
// We bind 0.0.0.0 and filter, rather than binding one adapter: binding a
// specific address breaks on DHCP renewal, VPN adapters and adapter
// reordering, and fails silently when the machine's IP changes.

const V4_RANGES = [
	{ cidr: "127.0.0.0/8", label: "loopback" },
	{ cidr: "10.0.0.0/8", label: "private" },
	{ cidr: "172.16.0.0/12", label: "private" },
	{ cidr: "192.168.0.0/16", label: "private" },
];
const CGNAT_RANGE = { cidr: "100.64.0.0/10", label: "cgnat" };
const LINK_LOCAL_V4 = { cidr: "169.254.0.0/16", label: "link-local" };

function ipv4ToInt(ip) {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;
	let value = 0;
	for (const part of parts) {
		const n = Number(part);
		if (!Number.isInteger(n) || n < 0 || n > 255) return null;
		value = (value << 8) + n;
	}
	return value >>> 0;
}

function inCidr(ip, cidr) {
	const [base, bitsRaw] = cidr.split("/");
	const bits = Number(bitsRaw);
	const ipInt = ipv4ToInt(ip);
	const baseInt = ipv4ToInt(base);
	if (ipInt === null || baseInt === null) return false;
	if (bits === 0) return true;
	const mask = (0xffffffff << (32 - bits)) >>> 0;
	return (ipInt & mask) === (baseInt & mask);
}

function isPrivateV6(ip) {
	const lower = ip.toLowerCase();
	if (lower === "::1") return true;
	// fc00::/7 — unique local addresses.
	if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
	return false;
}

function isLinkLocalV6(ip) {
	return /^fe[89ab][0-9a-f]:/i.test(ip);
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Say no, in words. A person who opens the panel's address in a browser from somewhere it won't answer gets
 * a page that says what happened and what to do; the app and scripts (which ask for JSON, or hit /api) still
 * get the JSON they expect.
 */
function refuse(req, res, status, { error, code, title, steps, extra = {} }) {
	res.setHeader("Cache-Control", "no-store");
	const wantsPage = !req.path.startsWith("/api") && String(req.headers.accept ?? "").includes("text/html");
	if (!wantsPage) return res.status(status).json({ error, code, ...extra });
	const list = steps.map((step) => `<li>${step}</li>`).join("");
	res.status(status).type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GodlyPanel: ${escapeHtml(title)}</title>
<style>
body{font:16px/1.5 system-ui,Segoe UI,sans-serif;background:#10141a;color:#e6e9ee;margin:0;padding:24px}
main{max-width:34rem;margin:8vh auto 0;background:#1a2029;border:1px solid #2a3340;border-radius:10px;padding:28px}
h1{font-size:1.3rem;margin:0 0 .6rem}p{margin:.5rem 0}ul{padding-left:1.2rem}li{margin:.4rem 0}
small{color:#98a2b0}
@media (prefers-color-scheme:light){body{background:#f3f5f8;color:#1b2430}main{background:#fff;border-color:#d8dee6}small{color:#5b6573}}
</style></head><body><main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(error)}</p>
<ul>${list}</ul>
<p><small>Reference: ${escapeHtml(code)}${extra.clientIp ? ` · your address as seen by the panel: ${escapeHtml(extra.clientIp)}` : ""}</small></p>
</main></body></html>`);
}

/**
 * @param {() => object} getConfig  read live so toggles apply without a restart
 */
export function createLanOnly(getConfig) {
	const loggedAt = new Map();

	return function lanOnly(req, res, next) {
		const { network } = getConfig();

		// Never trust forwarding headers: nothing legitimate sits in front of
		// this, and honouring them would let a caller spoof a LAN address.
		delete req.headers["x-forwarded-for"];
		delete req.headers["x-real-ip"];
		delete req.headers["x-forwarded-host"];

		// The socket's peer address, not req.ip — req.ip is trust-proxy aware
		// and therefore influenced by headers we just removed.
		const ip = normaliseIp(req.socket.remoteAddress);

		// A tunnel runs on this PC, so its visitors would look like this PC itself. Cloudflare marks what
		// it forwards, so anything carrying its marks is refused here: people outside reach the separate
		// community view, never the panel.
		if (req.headers["cf-connecting-ip"] || req.headers["cf-ray"]) {
			return refuse(req, res, 403, {
				error: "This panel can't be opened through a tunnel. Use the community view's address instead.",
				code: "tunnel_refused",
				title: "Not available through a tunnel",
				steps: [
					"This is the panel itself, which stays on the owner's own network. The public address is a separate, smaller page.",
					"If you are a guest, use the community view's address you were given.",
					"If you run this PC and see this by mistake, point your tunnel at the community view's port (shown in Settings → Community view), not at the panel.",
				],
			});
		}

		if (isAllowed(ip, network)) {
			if (isExpectedHost(req.headers.host, network)) return next();
			return refuse(req, res, 400, {
				error: "Open GodlyPanel using this computer's IP address or name.",
				code: "bad_host",
				title: "Open it by this PC's address",
				steps: [
					"GodlyPanel only answers when it is opened by the address of the PC it runs on (for example http://192.168.1.20:8765), not by some other web name pointed at it. This protects it from a trick that makes a website you visit talk to your panel.",
					"Use the address shown in the GodlyPanel window on that PC, or this PC's name on your network.",
					"If you set up your own name for it on purpose, the owner can add it in Settings, under 'Additional allowed names'.",
				],
			});
		}

		const now = Date.now();
		const last = loggedAt.get(ip) ?? 0;
		if (now - last > 60 * 60 * 1000) {
			loggedAt.set(ip, now);
			console.warn(`[lan-only] Refused a connection from ${ip} (not a local address).`);
		}

		return refuse(req, res, 403, {
			error: "GodlyPanel only accepts connections from the local network it runs on, and you are connecting from somewhere else.",
			code: "lan_only",
			title: "This panel is private",
			steps: [
				"If you are a guest or a friend: ask the owner for the community address (a separate public page where you can see the servers), and sign in there.",
				"If you are an administrator or moderator away from home: sign in at the community address if the owner has allowed staff sign-in there, or connect through the owner's VPN (such as Tailscale) and open the panel by its VPN address.",
				"If you are the owner and you are at home: make sure this device is on the same network as the PC running GodlyPanel (not a guest Wi-Fi, and not mobile data).",
			],
			extra: { clientIp: ip },
		});
	};
}

const OWN_NAME = os.hostname().toLowerCase();

// This PC's own names on a mesh VPN (Tailscale's "MagicDNS" name, such as pc.tail1234.ts.net),
// reported by the Tailscale service once it has asked Tailscale. Only this PC's own name is
// added, never a pattern, so a name someone else controls is still refused.
let ownMeshNames = [];
export const setOwnMeshNames = (names) => {
	ownMeshNames = names.map((n) => String(n).toLowerCase());
};

/**
 * True for an IP literal, localhost, this machine's own name, or a name the
 * owner has listed. Anything else is a DNS name someone else controls.
 */
export function isExpectedHost(hostHeader, network = {}) {
	if (!hostHeader) return false;
	// Strip the port, keeping the brackets on an IPv6 literal.
	const host = String(hostHeader).toLowerCase().replace(/:\d+$/, "");
	if (host.startsWith("[")) return true;
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
	if (host === "localhost" || host === OWN_NAME || host === `${OWN_NAME}.local` || ownMeshNames.includes(host)) return true;
	return (network.extraAllowedHosts ?? []).some((h) => String(h).toLowerCase() === host);
}

export function isAllowed(ip, network = {}) {
	if (!ip) return false;

	if (ip.includes(".")) {
		if (V4_RANGES.some((r) => inCidr(ip, r.cidr))) return true;
		// Tailscale/ZeroTier hand out CGNAT addresses, and a mesh network is a
		// perfectly reasonable way to reach your own panel.
		if (network.allowCgnat !== false && inCidr(ip, CGNAT_RANGE.cidr)) return true;
		if (network.allowLinkLocal !== false && inCidr(ip, LINK_LOCAL_V4.cidr)) return true;
		return matchesExtra(ip, network.extraAllowedCidrs);
	}

	if (isPrivateV6(ip)) return true;
	if (network.allowLinkLocal !== false && isLinkLocalV6(ip)) return true;
	// Everything else over IPv6 is refused, including globally routable
	// addresses — the realistic accidental-exposure path on an ISP that gives
	// every device a public v6 address.
	return false;
}

function matchesExtra(ip, extra) {
	if (!Array.isArray(extra)) return false;
	return extra.some((cidr) => {
		try {
			return cidr.includes("/") ? inCidr(ip, cidr) : ip === cidr;
		} catch {
			return false;
		}
	});
}

/** The addresses other people on the network can actually use. */
export function localAddresses(port) {
	const urls = [];
	for (const list of Object.values(os.networkInterfaces())) {
		for (const iface of list ?? []) {
			if (iface.family !== "IPv4" || iface.internal) continue;
			urls.push(`http://${iface.address}:${port}`);
		}
	}
	return urls;
}
