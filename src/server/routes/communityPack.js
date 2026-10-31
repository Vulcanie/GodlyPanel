// The mod pack on the community address: a player opens a link with a secret token and gets the manifest, the zip, the list or the
// Modrinth pack. No
// sign-in. Mounted on the community listener only, never on the panel's own port.
//
// Every failure looks the same from outside (a plain 404), so a link can't be probed for which servers exist, which are shared, or
// which failed. The one exception is a real link whose pack is too big to send, which says so.
import express from "express";
import { get as getServer } from "../data/serverStore.js";
import { buildManifest, buildClientPack } from "../services/clientPack.js";
import { serverForToken } from "../services/packShare.js";

// A visitor may ask for at most this many pack requests a minute, so the link can't be used to keep the PC busy.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
// Building a zip reads and hashes every mod, so only a couple may run at once.
const MAX_BUILDS = 2;

const notFound = (res) => res.status(404).json({ error: "Not found." });

// A message that might carry the token or a folder on this PC is logged without them.
const redact = (text) => String(text ?? "").replace(/[A-Za-z]:\\[^\s'"]*|\/[^\s'"]+/g, "<path>");

function failed(res, err, token) {
	if (err?.code === "pack_too_big") return res.status(413).json({ error: "This pack is too big to download." });
	// A game without a mods folder, or a link that is off, is expected and says nothing. Anything else is logged, without the token.
	if (!(err && err.code && typeof err.status === "number")) {
		const message = redact(err?.message).split(String(token)).join("<token>");
		console.error("A mod pack request failed:", message);
	}
	if (!res.headersSent) notFound(res);
}

/** The server a token names, or null when the link is off, wrong, or the server is gone. */
async function serverFor(token) {
	const name = await serverForToken(token);
	return name === null ? null : (getServer(name) ?? null);
}

/** The community address's pack routes. GET only: anything else goes on to the listener's own answer. */
export function createPackRouter() {
	const router = express.Router();
	let builds = 0;
	const seen = new Map();

	router.use((req, res, next) => (req.method === "GET" ? next() : next("router")));

	// Every answer from here, the refusals included, is kept out of caches and search engines, and doesn't send the link on as a referrer.
	router.use((req, res, next) => {
		res.setHeader("Cache-Control", "no-store");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader("X-Robots-Tag", "noindex");
		next();
	});

	// The listener sets who is really asking, from Cloudflare's header; the count is per that address.
	router.use((req, res, next) => {
		const now = Date.now();
		const key = req.communityClientIp;
		const e = seen.get(key);
		if (!e || now - e.since > WINDOW_MS) seen.set(key, { count: 1, since: now });
		else if (++e.count > MAX_PER_WINDOW) return res.status(429).json({ error: "Slow down a little.", code: "rate_limited" });
		if (seen.size > 5000) for (const [k, v] of seen) if (now - v.since > WINDOW_MS) seen.delete(k);
		next();
	});

	router.get("/:token/manifest.json", async (req, res) => {
		const { token } = req.params;
		try {
			const server = await serverFor(token);
			if (!server) return notFound(res);
			res.json(await buildManifest(server));
		} catch (err) {
			failed(res, err, token);
		}
	});

	// The zip and the list are built into a temp folder, which is removed once the file has gone out, or the visitor has gone away.
	const sendPack = (format) => async (req, res) => {
		const { token } = req.params;
		let pack = null;
		try {
			const server = await serverFor(token);
			if (!server) return notFound(res);
			if (builds >= MAX_BUILDS) {
				res.setHeader("Retry-After", "5");
				return res.status(503).json({ error: "Busy. Try again in a moment." });
			}
			builds += 1;
			try {
				pack = await buildClientPack(server, { format });
			} finally {
				builds -= 1;
			}
			// A visitor who left while the pack was being built never gets a download, so its folder is removed now.
			if (res.destroyed) return pack.cleanup();
			res.once("close", () => pack.cleanup());
			res.download(pack.file, pack.name, (err) => {
				pack.cleanup();
				if (err && !res.headersSent) notFound(res);
			});
		} catch (err) {
			if (pack) pack.cleanup();
			failed(res, err, token);
		}
	};

	router.get("/:token/mod-pack.zip", sendPack("zip"));
	router.get("/:token/mod-list.txt", sendPack("list"));
	// The Modrinth pack is for a Minecraft modpack only. For any other game it is the same plain 404 as a wrong link.
	router.get("/:token/mod-pack.mrpack", sendPack("mrpack"));

	// Anything else under the pack address is the same plain 404 as a wrong link.
	router.use((req, res) => notFound(res));

	return router;
}
