import { ModError } from "../modService.js";

// Reads a project and its versions from Modrinth's API, and works out which file to download. It never downloads: the installer
// does that through the guarded fetch, which checks every address in this answer before it is requested.

const TIMEOUT_MS = 20_000;
// A project's answer is a few kilobytes. Anything this big is not one, so it is not read on.
const MAX_ANSWER_BYTES = 5 * 1024 * 1024;
const SLUG = /^[A-Za-z0-9_-]{1,64}$/;
const SHA512 = /^[0-9a-f]{128}$/i;

// A test points this at a stand-in server; the app's own settings can't.
const apiBase = () => process.env.GHP_MODRINTH_API || "https://api.modrinth.com/v2";

const badRef = () => new ModError("That isn't a Modrinth project.", "bad_ref");
const incomplete = (slug) => new ModError(`Modrinth's answer for ${slug} is incomplete.`, "bad_answer");
const tooBig = () => new ModError("Modrinth's answer is bigger than the panel reads, so it was refused.", "modrinth_failed", 502);
// A filter the caller didn't set is left out, rather than sent as an empty value.
const given = (value) => typeof value === "string" && value !== "";

// Reads the body but stops at the cap, so a server that sends more than it declared still can't fill memory.
async function readCapped(res) {
	if (Number(res.headers.get("content-length")) > MAX_ANSWER_BYTES) throw tooBig();
	const chunks = [];
	let total = 0;
	for await (const chunk of res.body ?? []) {
		total += chunk.length;
		if (total > MAX_ANSWER_BYTES) throw tooBig();
		chunks.push(chunk);
	}
	return Buffer.concat(chunks).toString("utf8");
}

async function getJson(url, fetchImpl, notFound) {
	const res = await fetchImpl(url, { headers: { "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (res.status === 404) throw new ModError(notFound, "not_found", 404);
	if (!res.ok) throw new ModError(`Modrinth answered ${res.status}.`, "modrinth_failed", 502);
	const text = await readCapped(res);
	try {
		return JSON.parse(text);
	} catch {
		throw new ModError("Modrinth sent a reply that isn't JSON.", "modrinth_failed", 502);
	}
}

// A ref is a slug, or a slug and a version number: "sodium" or "sodium@0.5.8". Both are checked before anything is requested.
function parseRef(ref) {
	if (typeof ref !== "string") throw badRef();
	const at = ref.indexOf("@");
	const slug = at === -1 ? ref : ref.slice(0, at);
	const version = at === -1 ? null : ref.slice(at + 1);
	if (!SLUG.test(slug)) throw badRef();
	if (version !== null && (version === "" || version.length > 100)) throw badRef();
	return { slug, version };
}

// The date a version was published, or -Infinity when it doesn't read as one, so such a version is never the newest.
const published = (v) => {
	const t = Date.parse(v.date_published);
	return Number.isFinite(t) ? t : -Infinity;
};
const newest = (list) => list.reduce((best, v) => (published(v) > published(best) ? v : best));

// Picks the version to install. A pinned version must be one this server can run; when it isn't there, it is an error, never
// the latest in its place. Otherwise the newest release is preferred, then the newest of any type.
function chooseVersion(list, { slug, version, loader, gameVersion }) {
	// The API is asked to filter too. Checking again here means a version for another loader or game version is never picked,
	// whatever the answer says.
	const fits = (v) => (!given(loader) || !Array.isArray(v.loaders) || v.loaders.includes(loader)) && (!given(gameVersion) || !Array.isArray(v.game_versions) || v.game_versions.includes(gameVersion));
	const candidates = list.filter((v) => v && typeof v === "object" && typeof v.version_number === "string" && Array.isArray(v.files) && fits(v));
	if (version !== null) {
		const pinned = candidates.find((v) => v.version_number === version);
		if (!pinned) throw new ModError(`Modrinth has no version ${version} of ${slug} that fits this server.`, "not_found", 404);
		return pinned;
	}
	if (candidates.length === 0) throw new ModError(`No version of ${slug} fits this server.`, "no_matching_version", 404);
	const releases = candidates.filter((v) => v.version_type === "release");
	return newest(releases.length > 0 ? releases : candidates);
}

// One file per mod: the primary one when Modrinth marks one, else the first. Every field the installer needs must be there.
function fileOf(version, slug) {
	const file = version.files.find((f) => f && f.primary === true) ?? version.files[0];
	if (!file || typeof file !== "object" || typeof file.url !== "string" || typeof file.filename !== "string") throw incomplete(slug);
	const sha = file.hashes?.sha512;
	if (typeof sha !== "string" || !SHA512.test(sha)) throw incomplete(slug);
	return {
		url: file.url,
		name: file.filename,
		size: Number.isSafeInteger(file.size) && file.size >= 0 ? file.size : null,
		sha512: sha.toLowerCase(),
	};
}

export const modrinthProvider = {
	id: "modrinth",
	label: "Modrinth",
	hosts: ["modrinth.com", "api.modrinth.com", "cdn.modrinth.com"],

	async resolve(ref, ctx = {}) {
		const { slug, version } = parseRef(ref);
		const fetchImpl = ctx.fetchImpl ?? fetch;
		const base = apiBase();

		const project = await getJson(`${base}/project/${slug}`, fetchImpl, `Modrinth has no project ${slug}.`);
		if (!project || typeof project !== "object" || typeof project.title !== "string") throw incomplete(slug);

		const params = new URLSearchParams();
		if (given(ctx.loader)) params.set("loaders", JSON.stringify([ctx.loader]));
		if (given(ctx.gameVersion)) params.set("game_versions", JSON.stringify([ctx.gameVersion]));
		const list = await getJson(`${base}/project/${slug}/version?${params}`, fetchImpl, `Modrinth has no project ${slug}.`);
		if (!Array.isArray(list)) throw incomplete(slug);

		const chosen = chooseVersion(list, { slug, version, loader: ctx.loader, gameVersion: ctx.gameVersion });
		// Only the required dependencies are installed. A dependency is named by its slug or id, and one that doesn't look like
		// either is dropped rather than looked up.
		const dependencies = (Array.isArray(chosen.dependencies) ? chosen.dependencies : [])
			.filter((d) => d && d.dependency_type === "required" && typeof d.project_id === "string" && SLUG.test(d.project_id))
			.map((d) => ({ source: "modrinth", ref: d.project_id }));

		// "server_side unsupported" means the mod can't run on a server, so it is for the client, and the other way round.
		const side = project.server_side === "unsupported" ? "client" : project.client_side === "unsupported" ? "server" : "both";

		return {
			source: "modrinth",
			ref: version === null ? slug : `${slug}@${version}`,
			name: project.title,
			version: chosen.version_number,
			side,
			files: [fileOf(chosen, slug)],
			dependencies,
		};
	},

	async search(query, ctx = {}) {
		const text = typeof query === "string" ? query.trim() : "";
		if (text.length < 1 || text.length > 100) throw new ModError("Type 1 to 100 characters to search for.", "bad_query");
		const facets = [["project_type:mod"]];
		if (given(ctx.loader)) facets.push([`categories:${ctx.loader}`]);
		if (given(ctx.gameVersion)) facets.push([`versions:${ctx.gameVersion}`]);
		const params = new URLSearchParams({ query: text, limit: "10", facets: JSON.stringify(facets) });
		const answer = await getJson(`${apiBase()}/search?${params}`, ctx.fetchImpl ?? fetch, "Modrinth has no search results.");
		const hits = Array.isArray(answer?.hits) ? answer.hits : [];
		return hits
			.filter((h) => h && typeof h.slug === "string" && SLUG.test(h.slug))
			.slice(0, 10)
			.map((h) => ({
				source: "modrinth",
				ref: h.slug,
				name: typeof h.title === "string" ? h.title : h.slug,
				description: typeof h.description === "string" ? h.description.slice(0, 200) : "",
			}));
	},
};
