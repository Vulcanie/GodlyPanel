// Refuses requests that change something (POST, PUT, PATCH, DELETE) when a browser says they were started by a
// page from somewhere else. The session cookie is SameSite=Strict, which stops other websites, but "same site"
// ignores the port: a page served by another program on this same PC (a game server's web map, say) counts as
// the same site and its requests would carry the cookie. Browsers label every request with where it came from,
// in a header a page's scripts cannot change, so this uses that.
//
// Requests that aren't from a browser (scripts, the Discord bot, tests) have neither header and are unaffected;
// they have to present a session cookie or a login anyway.

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originMatchesHost(origin, host) {
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}

/** Extra origins to accept, for the developer flow where the interface is served from another port. */
const allowed = () =>
	String(process.env.GHP_ALLOW_ORIGINS ?? "")
		.split(",")
		.map((o) => o.trim())
		.filter(Boolean);

export function sameOriginOnly(req, res, next) {
	if (!UNSAFE.has(req.method)) return next();

	const site = req.headers["sec-fetch-site"];
	const origin = req.headers.origin;
	let ok = true;
	if (site !== undefined) {
		// "none" is the person typing or pasting the address; "same-origin" is the panel's own page.
		ok = site === "same-origin" || site === "none";
	} else if (origin !== undefined) {
		// An older browser: fall back to comparing the page's address with this one's.
		ok = originMatchesHost(origin, req.headers.host);
	}
	if (!ok && origin !== undefined && allowed().includes(origin)) ok = true;
	if (ok) return next();

	res.setHeader("Cache-Control", "no-store");
	return res.status(403).json({
		error: "That request came from a different website or page than the panel, so it was refused. Use the panel's own page.",
		code: "cross_origin",
	});
}
