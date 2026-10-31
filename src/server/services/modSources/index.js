import { parseThunderstoreRef } from "../modService.js";
import { workshopProvider } from "./workshop.js";
import { thunderstoreProvider } from "./thunderstore.js";

// Mod sources: one registry of places a mod can come from, and detectSource, which
// works out which one a pasted address or name belongs to. detectSource only reads
// text. It never fetches, so pasting a link can't reach the network by itself.

// Sources detectSource may name, including ones with no provider yet. The later
// providers register themselves against these ids.
export const KNOWN_SOURCES = ["workshop", "thunderstore", "modrinth", "curseforge", "github", "url"];

// A Map, not a plain object: a plain object would answer "constructor" or "__proto__"
// with something that isn't a provider.
const providers = new Map();

export function registerProvider(provider) {
	if (!provider || typeof provider.id !== "string" || provider.id === "" || typeof provider.resolve !== "function") {
		throw new TypeError("A mod source needs a non-empty id and a resolve function.");
	}
	if (providers.has(provider.id)) throw new Error(`Mod source ${provider.id} is already registered.`);
	providers.set(provider.id, provider);
	return provider;
}

export function getProvider(id) {
	if (typeof id !== "string") return null;
	return providers.get(id) ?? null;
}

export function listProviders() {
	return [...providers.values()];
}

registerProvider(workshopProvider);
registerProvider(thunderstoreProvider);

// Longer than this is not a mod address, and reading it further is wasted work.
const MAX_INPUT = 2048;
const WORKSHOP_ID = /^\d{3,12}$/;
const MODRINTH_TYPES = /^\/(mod|plugin|datapack|resourcepack|modpack|shader)\/([A-Za-z0-9_-]{1,64})(?:\/.*)?$/;
const CURSEFORGE_PATH = /^\/[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}\/([a-z0-9-]{1,64})(?:\/.*)?$/;
const GITHUB_PATH = /^\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})(?:\/releases(?:\/latest|\/tag\/([A-Za-z0-9._-]{1,100}))?)?\/?$/;
const THUNDERSTORE_PATH = /^\/c\/[A-Za-z0-9_-]{1,64}\/p\/([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)(?:\/.*)?$/;
const DIRECT_FILE = /\.(zip|jar|dll|pak|vpk)$/i;
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal"];

// Parse an address, but only one that is https, carries no username or password, and
// uses the default port. Anything else returns null, so the callers never see it.
function parseHttps(text) {
	let url;
	try {
		url = new URL(text);
	} catch {
		return null;
	}
	if (url.protocol !== "https:") return null;
	if (url.username !== "" || url.password !== "") return null;
	if (url.port !== "") return null;
	return url;
}

// A direct-download host we won't fetch from: this machine, the local network, or a
// raw IP. Someone could otherwise point the panel at a service that only the server
// can reach.
function unsafeHost(hostname) {
	const host = hostname.replace(/\.$/, "");
	if (host === "localhost" || LOCAL_SUFFIXES.some((s) => host.endsWith(s))) return true;
	if (host.startsWith("[")) return true; // an IPv6 literal, like [::1]
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true; // an IPv4 literal
	return false;
}

// Each rule compares the parsed hostname exactly, so a host that merely contains
// "thunderstore.io" somewhere can't match.
function fromUrl(url, text) {
	const host = url.hostname;
	const path = url.pathname;

	if ((host === "steamcommunity.com" || host === "www.steamcommunity.com") && /^\/(sharedfiles|workshop)\/filedetails\/?$/.test(path)) {
		const id = url.searchParams.get("id") ?? "";
		return WORKSHOP_ID.test(id) ? { source: "workshop", ref: id } : null;
	}

	if (host === "thunderstore.io") {
		const m = THUNDERSTORE_PATH.exec(path);
		return m ? { source: "thunderstore", ref: `${m[1]}-${m[2]}` } : null;
	}

	if (host === "modrinth.com") {
		const m = MODRINTH_TYPES.exec(path);
		return m ? { source: "modrinth", ref: m[2] } : null;
	}

	if (host === "curseforge.com" || host === "www.curseforge.com") {
		const m = CURSEFORGE_PATH.exec(path);
		return m ? { source: "curseforge", ref: m[1] } : null;
	}

	if (host === "github.com") {
		const m = GITHUB_PATH.exec(path);
		if (m) {
			const repo = `${m[1]}/${m[2]}`;
			return { source: "github", ref: m[3] ? `${repo}@${m[3]}` : repo };
		}
		// A pasted release asset (.../releases/download/v1/x.jar) is a direct file, so it falls through to the rule below.
	}

	// Any other https address is a direct file, but only when the path names a file
	// type a mod ships as. The query and fragment don't count toward the type.
	if (DIRECT_FILE.test(path) && !unsafeHost(host)) return { source: "url", ref: text };
	return null;
}

// Input is trimmed first. Returns { source, ref } or null. Never throws.
export function detectSource(input) {
	if (typeof input !== "string") return null;
	const text = input.trim();
	if (text === "" || text.length > MAX_INPUT) return null;
	// Control characters would survive into the ref but not the URL parser's view of
	// it, so a URL could hide one. Refuse them outright.
	if (/[\x00-\x1f\x7f]/.test(text)) return null;

	// A bare number is a Steam Workshop item id.
	if (WORKSHOP_ID.test(text)) return { source: "workshop", ref: text };

	const url = parseHttps(text);
	if (url) return fromUrl(url, text);

	// Not an https address, and a URL-shaped string is never a package name, so stop
	// here rather than offering it to the package-name parser.
	if (text.includes("/")) return null;

	// Owner-Name or Owner-Name-1.2.3. parseThunderstoreRef throws on anything else.
	try {
		const { owner, name, version } = parseThunderstoreRef(text);
		return { source: "thunderstore", ref: version ? `${owner}-${name}-${version}` : `${owner}-${name}` };
	} catch {
		return null;
	}
}
