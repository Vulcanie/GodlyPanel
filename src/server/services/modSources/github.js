import { ModError } from "../modService.js";
import { getSecrets } from "../../config/secretsStore.js";
import { guardedFetch } from "./netGuard.js";
import { readCapped, TIMEOUT_MS } from "./http.js";

// Reads a GitHub release and works out which of its files to download. It never downloads: the installer does that through the guarded
// fetch. The one exception is a release's ".sha256" file, which is read here for its checksum, through the same guard.
//
// The token, when one is set, goes to GitHub's API and nowhere else. A download never carries it, so it can't reach a host that isn't GitHub's.

const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const TAG = /^[A-Za-z0-9._+-]{1,100}$/;
const SUFFIX = /^\.[a-z0-9]{1,10}$/;
const SHA256_DIGEST = /^sha256:([0-9a-f]{64})$/i;
const SHA256_TEXT = /^([0-9a-f]{64})\b/i;
// A checksum file is one line. Anything bigger is not one, so it is not read on.
const CHECKSUM_MAX_BYTES = 4096;
// Files a release ships beside the mod that aren't the mod itself.
const NOT_THE_MOD = ["-sources.jar", "-javadoc.jar", "-dev.jar"];
// The file types a mod ships as when the template names none.
const DEFAULT_ACCEPTS = [".jar", ".zip"];
const HOSTS = ["github.com", "api.github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"];

// A test points this at a stand-in server; the app's own settings can't.
const apiBase = () => process.env.GHP_GITHUB_API || "https://api.github.com";

const badRef = () => new ModError("That isn't a GitHub release.", "bad_ref");
const given = (value) => typeof value === "string" && value !== "";
const badAnswer = () => new ModError("GitHub sent a release this panel can't read.", "github_failed", 502);
const tooBig = () => new ModError("GitHub's answer is bigger than the panel reads, so it was refused.", "github_failed", 502);

// A ref is "owner/repo" or "owner/repo@tag". Each part is checked before anything is requested. "." and ".." are never a repo or tag, since
// the URL would then name a different path.
function parseRef(ref) {
	if (typeof ref !== "string") throw badRef();
	const at = ref.indexOf("@");
	const repoPart = at === -1 ? ref : ref.slice(0, at);
	const tag = at === -1 ? null : ref.slice(at + 1);
	const parts = repoPart.split("/");
	if (parts.length !== 2) throw badRef();
	const [owner, repo] = parts;
	if (!OWNER.test(owner) || !REPO.test(repo) || repo === "." || repo === "..") throw badRef();
	if (tag !== null && (!TAG.test(tag) || tag === "." || tag === "..")) throw badRef();
	return { owner, repo, tag };
}

// The token from the context, or the stored one. Empty when none is set, so no header is sent.
function tokenOf(ctx) {
	const token = ctx.secrets?.githubToken ?? getSecrets().githubToken;
	return typeof token === "string" && token !== "" ? token : "";
}

// A GET to GitHub's API. It never follows a redirect, so the token can't be sent to another host.
async function apiJson(url, ctx, notFound) {
	const token = tokenOf(ctx);
	const headers = { Accept: "application/vnd.github+json", "User-Agent": "GodlyPanel" };
	if (token) headers.Authorization = `Bearer ${token}`;
	const fetchImpl = ctx.fetchImpl ?? fetch;
	let res;
	try {
		res = await fetchImpl(url, { headers, redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch {
		// With redirect "error", a redirect makes the request fail rather than being followed. Either way the answer isn't used.
		throw new ModError("GitHub couldn't be reached, or it sent a redirect the panel won't follow.", "github_failed", 502);
	}
	if (res.status === 404) throw new ModError(notFound, "not_found", 404);
	if (!res.ok) throw new ModError(`GitHub answered ${res.status}.`, "github_failed", 502);
	const text = await readCapped(res, { tooBig });
	try {
		return JSON.parse(text);
	} catch {
		throw new ModError("GitHub sent a reply that isn't JSON.", "github_failed", 502);
	}
}

// The release the ref names. The latest release is taken as it is only when no tag is pinned, and a draft or prerelease is never the
// one installed unless its tag was asked for.
async function releaseFor(ref, ctx) {
	const { owner, repo, tag } = parseRef(ref);
	const base = `${apiBase()}/repos/${owner}/${repo}/releases`;
	const url = tag === null ? `${base}/latest` : `${base}/tags/${encodeURIComponent(tag)}`;
	const answer = await apiJson(url, ctx, tag === null ? `GitHub has no release of ${owner}/${repo}.` : `GitHub has no release of ${owner}/${repo} tagged ${tag}.`);
	if (!answer || typeof answer !== "object" || !given(answer.tag_name) || !Array.isArray(answer.assets)) throw badAnswer();
	if (tag === null && (answer.draft === true || answer.prerelease === true)) {
		throw new ModError(`The latest release of ${owner}/${repo} is a draft or prerelease. Pin its tag to install it.`, "no_matching_version", 404);
	}
	return { owner, repo, tag, release: answer };
}

// The file types the template accepts. "archive" means .zip. Only a plain extension is kept, so an odd entry can't match everything.
function suffixesOf(accepts) {
	const list = Array.isArray(accepts) && accepts.length > 0 ? accepts : DEFAULT_ACCEPTS;
	return list.map((a) => (a === "archive" ? ".zip" : a)).filter((a) => typeof a === "string" && SUFFIX.test(a)).map((a) => a.toLowerCase());
}

const sizeOf = (asset) => (Number.isSafeInteger(asset.size) && asset.size >= 0 ? asset.size : null);

// The release's files that could be the mod: an accepted type, not a sources, javadoc or dev jar, and a usable download address. When the
// context names one file, only that file is kept.
function matchingAssets(release, ctx) {
	const suffixes = suffixesOf(ctx.accepts);
	return release.assets.filter((a) => {
		if (!a || typeof a !== "object" || !given(a.name) || typeof a.browser_download_url !== "string") return false;
		const name = a.name.toLowerCase();
		if (NOT_THE_MOD.some((s) => name.endsWith(s))) return false;
		if (!suffixes.some((s) => name.endsWith(s))) return false;
		return given(ctx.assetName) ? a.name === ctx.assetName : true;
	});
}

// The SHA-256 of a file, from its digest in the listing or from a ".sha256" file beside it. Null when neither gives one that reads as one.
async function checksumOf(asset, release, ctx) {
	const digest = typeof asset.digest === "string" ? SHA256_DIGEST.exec(asset.digest) : null;
	if (digest) return digest[1].toLowerCase();

	const siblingName = `${asset.name}.sha256`;
	const sibling = release.assets.find((a) => a && typeof a === "object" && a.name === siblingName);
	if (!sibling || typeof sibling.browser_download_url !== "string") return null;
	if (!Number.isSafeInteger(sibling.size) || sibling.size > CHECKSUM_MAX_BYTES) return null;

	// Read through the guard, so a redirect to another host is refused. The guard is what makes that download safe, not the token rule.
	const fetchGuarded = guardedFetch({ hosts: HOSTS, fetchImpl: ctx.fetchImpl ?? fetch });
	const res = await fetchGuarded(sibling.browser_download_url, { headers: { "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) return null;
	let text;
	try {
		text = await readCapped(res, { max: CHECKSUM_MAX_BYTES, tooBig });
	} catch {
		// A checksum file that is too big or cut off isn't one. The file is then listed as unverified, not refused.
		return null;
	}
	const match = SHA256_TEXT.exec(text);
	return match ? match[1].toLowerCase() : null;
}

// The one file to install. Several that fit need the caller to name one, and none is an error.
function chooseAsset(release, ctx) {
	const found = matchingAssets(release, ctx);
	if (found.length === 0) throw new ModError("This release has no file this game can use.", "no_matching_asset", 404);
	if (found.length > 1) {
		throw new ModError("This release has several files that fit. Choose one.", "choose_asset", 409, { assets: found.slice(0, 25).map((a) => a.name) });
	}
	return found[0];
}

export const githubProvider = {
	id: "github",
	label: "GitHub releases",
	hosts: HOSTS,

	async resolve(ref, ctx = {}) {
		const { owner, repo, tag, release } = await releaseFor(ref, ctx);
		const asset = chooseAsset(release, ctx);
		const sha256 = await checksumOf(asset, release, ctx);

		const file = { url: asset.browser_download_url, name: asset.name, size: sizeOf(asset) };
		if (sha256) file.sha256 = sha256;

		return {
			source: "github",
			ref: tag === null ? `${owner}/${repo}` : `${owner}/${repo}@${tag}`,
			name: `${owner}/${repo}`,
			version: release.tag_name,
			side: "both",
			files: [file],
			dependencies: [],
		};
	},

	// The files of a release that fit, for a person to choose from. Naming no file here is never an error.
	async assets(ref, ctx = {}) {
		const { release } = await releaseFor(ref, ctx);
		return matchingAssets(release, ctx).map((a) => ({ name: a.name, size: sizeOf(a) }));
	},
};
