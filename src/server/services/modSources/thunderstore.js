import { ModError, parseThunderstoreRef, installThunderstoreMod } from "../modService.js";

// Reads a package's metadata from Thunderstore's API. It never downloads or writes:
// installing stays in modService.js, which checks where each file comes from.

const TIMEOUT_MS = 20_000;
// The package name Thunderstore itself uses, so an odd name from the API can't reach
// a file name.
const FULL_NAME = /^[A-Za-z0-9_]+-[A-Za-z0-9_]+$/;

// A test points this at a stand-in server; the app's own settings can't.
const thunderstoreBase = () => process.env.GHP_THUNDERSTORE_API || "https://thunderstore.io";

// parseThunderstoreRef also accepts a full page address. A resolve ref must be a
// package name, so a URL is refused here.
function parsePackage(text) {
	if (typeof text !== "string" || text.includes("/")) {
		throw new ModError('Use a package name like "Owner-Name" (optionally "-1.2.3").', "bad_package");
	}
	return parseThunderstoreRef(text);
}

const packageRef = ({ owner, name, version }) => (version ? `${owner}-${name}-${version}` : `${owner}-${name}`);

async function fetchPackage(owner, name, fetchImpl) {
	const res = await fetchImpl(`${thunderstoreBase()}/api/experimental/package/${owner}/${name}/`, {
		headers: { "User-Agent": "GodlyPanel" },
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (res.status === 404) throw new ModError(`Thunderstore has no package ${owner}-${name}.`, "not_found", 404);
	if (!res.ok) throw new ModError(`Thunderstore answered ${res.status}.`, "thunderstore_failed", 502);
	return res.json().catch(() => {
		throw new ModError("Thunderstore sent a reply that isn't JSON.", "thunderstore_failed", 502);
	});
}

export const thunderstoreProvider = {
	id: "thunderstore",
	label: "Thunderstore",
	hosts: ["thunderstore.io"],

	async resolve(ref, ctx = {}) {
		const parsed = parsePackage(ref);
		const { owner, name, version } = parsed;
		const pkg = await fetchPackage(owner, name, ctx.fetchImpl ?? fetch);

		// A pinned version must be one the package actually has. When the API gives
		// no version list, the latest is the only one we can check against, so a
		// pinned version that isn't it is refused rather than silently swapped.
		const candidates = version && Array.isArray(pkg.versions) ? pkg.versions : [pkg.latest];
		const entry = version ? candidates.find((v) => v?.version_number === version) : pkg.latest;
		if (!entry || typeof entry.version_number !== "string" || typeof entry.download_url !== "string") {
			throw new ModError(`Thunderstore has no version ${version ?? "to install"} of ${owner}-${name}.`, "not_found", 404);
		}

		const pkgName = FULL_NAME.test(pkg.full_name ?? "") ? pkg.full_name : `${owner}-${name}`;
		const dependencies = (Array.isArray(entry.dependencies) ? entry.dependencies : []).map((dep) => ({
			source: "thunderstore",
			ref: packageRef(parsePackage(dep)),
		}));

		return {
			source: "thunderstore",
			ref: packageRef(parsed),
			name: pkgName,
			version: entry.version_number,
			side: "both",
			files: [{ url: entry.download_url, name: `${pkgName}.zip` }],
			dependencies,
		};
	},

	install: (server, ref) => installThunderstoreMod(server, ref),
};
