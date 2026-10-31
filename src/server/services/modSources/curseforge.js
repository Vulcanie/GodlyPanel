import { ModError } from "../modService.js";
import { isClientOnly } from "../modpackService.js";
import { cfApiKey, cfGetJson } from "./curseforgeClient.js";

// Reads a CurseForge project and its files, and works out which file to download. It never downloads: the installer does that through
// the guarded fetch, which checks every address before it is requested. Every field in an answer is attacker-controlled, so each one is
// checked before it is used, and anything that doesn't read as expected is refused rather than guessed at.

// Minecraft. Other games pass their own id through the context.
const GAME_ID_DEFAULT = 432;
// A slug is lower-case words joined by dashes. A numeric id is looked up directly. Either can be followed by "@" and a file id.
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const NUMERIC = /^\d{1,9}$/;
const FILE_ID = /^\d{1,12}$/;
const SHA1 = /^[0-9a-f]{40}$/i;
// The numbers CurseForge uses for a file's release type (1 is release), a dependency's relation (3 is required) and a hash's algorithm (1 is SHA-1).
const RELEASE_TYPE_RELEASE = 1;
const RELATION_REQUIRED = 3;
const HASH_SHA1 = 1;
// The loader ids CurseForge filters files by. A loader this table doesn't name is not sent, so nothing is filtered by it.
const LOADER_TYPES = new Map([
	["forge", 1],
	["fabric", 4],
	["quilt", 5],
	["neoforge", 6],
]);
// Hosts the installer may download from for this provider, and the API answers come from.
const HOSTS = ["curseforge.com", "www.curseforge.com", "api.curseforge.com", "edge.forgecdn.net", "mediafilez.forgecdn.net"];

const badRef = () => new ModError("That isn't a CurseForge project.", "bad_ref");
const incomplete = (label) => new ModError(`CurseForge's answer for ${label} is incomplete.`, "curseforge_failed", 502);
const given = (value) => typeof value === "string" && value !== "";

// A ref is a slug or a numeric id, optionally followed by "@" and a file id: "jei", "238222", "jei@1234567". Checked before anything is requested.
function parseRef(ref) {
	if (typeof ref !== "string") throw badRef();
	const at = ref.indexOf("@");
	const project = at === -1 ? ref : ref.slice(0, at);
	const file = at === -1 ? null : ref.slice(at + 1);
	if (!NUMERIC.test(project) && !SLUG.test(project)) throw badRef();
	if (file !== null && !FILE_ID.test(file)) throw badRef();
	return { project, file: file === null ? null : Number(file) };
}

// The game id is sent in the search. Anything that isn't digits is replaced by Minecraft's, rather than sent as it came.
function gameIdOf(ctx) {
	const raw = String(ctx.curseforgeGameId ?? GAME_ID_DEFAULT);
	return NUMERIC.test(raw) ? raw : String(GAME_ID_DEFAULT);
}

// The project's id and name, from an answer that must have both. The name falls back to what was asked for when it isn't text.
function checkedProject(mod, label) {
	if (!mod || typeof mod !== "object" || !Number.isSafeInteger(mod.id) || mod.id <= 0) throw incomplete(label);
	return { id: mod.id, name: given(mod.name) ? mod.name : label };
}

// A slug is looked up through the search, and the one whose slug is exactly the one asked for is taken. A numeric id is looked up directly.
async function projectOf(project, ctx) {
	if (NUMERIC.test(project)) {
		const answer = await cfGetJson(`/mods/${project}`, ctx, `CurseForge has no project ${project}.`);
		return checkedProject(answer?.data, project);
	}
	const query = new URLSearchParams({ gameId: gameIdOf(ctx), slug: project });
	const answer = await cfGetJson(`/mods/search?${query}`, ctx, `CurseForge has no project ${project}.`);
	const found = Array.isArray(answer?.data) ? answer.data.find((m) => m && typeof m === "object" && m.slug === project) : undefined;
	if (!found) throw new ModError(`CurseForge has no project ${project}.`, "not_found", 404);
	return checkedProject(found, project);
}

// The files CurseForge lists for the project, narrowed by the game version and loader the server runs. A file with no id, no name, or
// marked unavailable is left out here, so nothing after this point can pick it.
const usable = (f) => f && typeof f === "object" && Number.isSafeInteger(f.id) && given(f.fileName) && f.isAvailable !== false;

async function filesOf(projectId, ctx) {
	const query = new URLSearchParams({ pageSize: "50" });
	if (given(ctx.gameVersion)) query.set("gameVersion", ctx.gameVersion);
	const loaderType = LOADER_TYPES.get(ctx.loader);
	if (loaderType !== undefined) query.set("modLoaderType", String(loaderType));
	const answer = await cfGetJson(`/mods/${projectId}/files?${query}`, ctx, `CurseForge has no files for project ${projectId}.`);
	if (!Array.isArray(answer?.data)) throw new ModError("CurseForge sent a file list this panel can't read.", "curseforge_failed", 502);
	return answer.data.filter(usable);
}

// The date a file was published, or -Infinity when it doesn't read as one, so such a file is never the newest.
const published = (f) => {
	const t = Date.parse(f.fileDate);
	return Number.isFinite(t) ? t : -Infinity;
};
const newest = (list) => list.reduce((best, f) => (published(f) > published(best) ? f : best));

// The file to install. A pinned file must be one the list holds; when it isn't, it is an error, never the latest in its place.
// Otherwise a release is preferred, then the newest file of any type.
function chooseFile(files, pinned, label) {
	if (pinned !== null) {
		const found = files.find((f) => f.id === pinned);
		if (!found) throw new ModError(`CurseForge has no file ${pinned} of ${label} that fits this server.`, "not_found", 404);
		return found;
	}
	if (files.length === 0) throw new ModError(`No file of ${label} fits this server.`, "no_matching_version", 404);
	const releases = files.filter((f) => f.releaseType === RELEASE_TYPE_RELEASE);
	return newest(releases.length > 0 ? releases : files);
}

// The SHA-1 the listing gives the file, lower-case, or null when it gives none that reads as one.
function sha1Of(file) {
	const hashes = Array.isArray(file.hashes) ? file.hashes : [];
	const entry = hashes.find((h) => h && typeof h === "object" && h.algo === HASH_SHA1 && typeof h.value === "string" && SHA1.test(h.value));
	return entry ? entry.value.toLowerCase() : null;
}

export const curseforgeProvider = {
	id: "curseforge",
	label: "CurseForge",
	hosts: HOSTS,

	// Without a key nothing can be asked for, so the caller is told to add one before any request is made.
	get needs() {
		return cfApiKey() ? undefined : "apiKey";
	},

	async resolve(ref, ctx = {}) {
		const { project: asked, file: pinned } = parseRef(ref);
		if (!cfApiKey(ctx)) throw new ModError("Add a CurseForge key in Settings to install from CurseForge.", "needs_api_key", 400);

		const project = await projectOf(asked, ctx);
		const files = await filesOf(project.id, ctx);
		const chosen = chooseFile(files, pinned, project.name);

		// A file whose author doesn't allow downloads from outside CurseForge has no address. The next file isn't taken in its place.
		const url = chosen.downloadUrl;
		if (url === null || url === undefined || url === "") {
			throw new ModError(
				`The author of ${project.name} doesn't allow downloads from outside CurseForge. Get it from https://www.curseforge.com/projects/${project.id} and upload it instead.`,
				"third_party_blocked",
				409,
			);
		}
		if (typeof url !== "string") throw incomplete(project.name);

		const file = {
			url,
			name: chosen.fileName,
			size: Number.isSafeInteger(chosen.fileLength) && chosen.fileLength >= 0 ? chosen.fileLength : null,
		};
		const sha1 = sha1Of(chosen);
		if (sha1) file.sha1 = sha1;

		// The side comes from the file's own tags. Only a file tagged Client and not Server is client-only.
		const side = isClientOnly(Array.isArray(chosen.gameVersions) ? chosen.gameVersions : []) ? "client" : "both";

		// Only the required dependencies are installed. A dependency is named by its numeric id, and one that doesn't look like one is dropped.
		const dependencies = (Array.isArray(chosen.dependencies) ? chosen.dependencies : [])
			.filter((d) => d && typeof d === "object" && d.relationType === RELATION_REQUIRED && Number.isSafeInteger(d.modId) && d.modId > 0 && d.modId <= 999_999_999)
			.map((d) => ({ source: "curseforge", ref: String(d.modId) }));

		return {
			source: "curseforge",
			ref: pinned === null ? asked : `${asked}@${pinned}`,
			name: project.name,
			version: given(chosen.displayName) ? chosen.displayName : chosen.fileName,
			side,
			files: [file],
			dependencies,
		};
	},
};
