import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { paths } from "../paths.js";

// The server list is user data, so it lives in the data dir rather than inside
// the (read-only, asar-packed) app directory. The original API could import it
// statically because it sat in the repo; here the location is only known at
// runtime, so we load it with a top-level await instead.
//
// This deliberately preserves the original module's exact semantics — the
// same mutable array instance is shared by every consumer, so the existing
// `SERVERS_TO_QUERY.push(entry)` in serverCreationService keeps working. That
// pattern (plus rewriting this file as JS source) is what Stage 2 replaces
// with a real serverStore; this shim is the seam that makes Stage 1 a pure
// structural move with no behavioural change.

const SEED = `// GodlyPanel server list. Managed by the app — edit with care.
export const SERVERS_TO_QUERY = [
];
`;

if (!fs.existsSync(paths.serversFile)) {
	fs.mkdirSync(paths.dataDir, { recursive: true });
	fs.writeFileSync(paths.serversFile, SEED, "utf8");
	console.log(`[servers] Created empty server list at ${paths.serversFile}`);
}

let loaded = [];
try {
	// Cache-bust so a reload after the user fixes a syntax error doesn't get
	// served the stale module from Node's ESM cache.
	const url = `${pathToFileURL(paths.serversFile).href}?t=${Date.now()}`;
	const mod = await import(url);
	loaded = mod.SERVERS_TO_QUERY ?? [];
	if (!Array.isArray(loaded)) {
		throw new Error("SERVERS_TO_QUERY is not an array");
	}
} catch (err) {
	console.error(
		`[servers] Failed to load ${paths.serversFile}: ${err.message}\n` +
			"[servers] Starting with an empty list. Fix the file and restart.",
	);
	loaded = [];
}

export const SERVERS_TO_QUERY = loaded;
