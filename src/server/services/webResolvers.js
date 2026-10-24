// Working out what to download, for the makers that publish no GitHub release (a template's `webInstall.resolve`). Each function
// returns a resolver: `async ({ fetchImpl }) => { url, bytes, sha1, sha256, version, javaMajor }`. The address it hands back is checked
// again against the template's host list before anything is fetched (services/webInstall.js), so a resolver cannot send the panel
// elsewhere.

const LOOKUP_TIMEOUT_MS = 15_000;
const MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const MC_VERSION = /^[0-9]+(\.[0-9]+){1,2}$/;
const TERRARIA_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/;

async function getJson(fetchImpl, url, what) {
	const res = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
	if (!res.ok) throw new Error(`${what} answered ${res.status}.`);
	return res.json();
}

/**
 * Minecraft Java's server jar for one release version, from Mojang's version manifest: the manifest names the version's own listing,
 * which gives the jar's address, size and SHA-1. Only a release version is accepted (never a snapshot).
 * @param {string} version  such as "1.21.11"
 */
export function mojangServerJar(version) {
	if (!MC_VERSION.test(String(version))) throw new Error(`"${version}" is not a Minecraft version number.`);
	return async ({ fetchImpl = fetch } = {}) => {
		const manifest = await getJson(fetchImpl, MANIFEST_URL, "Mojang's version list");
		const entry = (manifest.versions ?? []).find((v) => v.id === version && v.type === "release");
		if (!entry) throw new Error(`Mojang's version list has no release ${version}.`);
		const detail = await getJson(fetchImpl, entry.url, `Mojang's listing for ${version}`);
		const server = detail?.downloads?.server;
		if (!server?.url) throw new Error(`Mojang's listing for ${version} has no server download.`);
		return {
			url: server.url,
			bytes: server.size,
			sha1: server.sha1 ?? null,
			version,
			javaMajor: Number.isInteger(detail.javaVersion?.majorVersion) ? detail.javaVersion.majorVersion : null,
		};
	};
}
mojangServerJar.hosts = ["piston-meta.mojang.com", "piston-data.mojang.com", "launchermeta.mojang.com"];

/**
 * Terraria's dedicated server zip for one version, from terraria.org. The address follows a fixed pattern (1.4.5.8 -> 1458); the size
 * is read from a HEAD request. terraria.org publishes no checksum, so none is returned.
 * @param {string} version  such as "1.4.5.8"
 */
export function terrariaServerZip(version) {
	if (!TERRARIA_VERSION.test(String(version))) throw new Error(`"${version}" is not a Terraria version number (four numbers, such as 1.4.5.8).`);
	const url = `https://terraria.org/api/download/pc-dedicated-server/terraria-server-${version.replaceAll(".", "")}.zip`;
	return async ({ fetchImpl = fetch } = {}) => {
		const res = await fetchImpl(url, { method: "HEAD", headers: { "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) });
		if (!res.ok) throw new Error(`terraria.org answered ${res.status} for the ${version} server.`);
		const bytes = Number(res.headers.get("content-length"));
		if (!Number.isSafeInteger(bytes) || bytes <= 0) throw new Error(`terraria.org gave no size for the ${version} server.`);
		return { url, bytes, sha1: null, sha256: null, version };
	};
}
terrariaServerZip.hosts = ["terraria.org"];
