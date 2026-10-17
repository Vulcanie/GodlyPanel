import { promises as fsp } from "node:fs";
import path from "node:path";
import { downloadVerified } from "../util/downloadVerified.js";
import { listZip, extractZip, unsafeEntries } from "../util/tarZip.js";

// Installing a game server from a GitHub release zip instead of through SteamCMD (a template's `zipInstall`, see the top of
// data/gameTemplates.js). tModLoader needs this: its Steam app wants a real Steam login, and the same files are attached to its
// GitHub releases.
//
// Nothing here runs unless the person creating the server has said yes to it (acceptZipDownload, asked for by the create form). The
// rules, none of which a template can relax:
//   - the release is looked up on GitHub's API (api.github.com), for the latest release of the repo the template names;
//   - the file is picked by its exact name;
//   - GitHub has to publish a SHA-256 for that file (the `digest` of the asset); a release without one is not installed, and a
//     download that does not match it is deleted;
//   - the file is fetched over https from github.com or GitHub's own download hosts only, wherever a redirect leads, with a size
//     cap and a time limit;
//   - it is unpacked into the server's folder only after every name in it has been checked: nothing may land outside that folder.

/** The hosts a release file may come from (and be redirected to). Exact names: a look-alike or a sub-domain is not one of them. */
export const ZIP_DOWNLOAD_HOSTS = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"];
const API_BASE = "https://api.github.com";
const REPO_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ASSET_NAME = /^[A-Za-z0-9_.+-][A-Za-z0-9 _.+-]*$/;
const SHA256 = /^[0-9a-f]{64}$/;
/** Largest file the panel will fetch for a template that does not set its own cap. */
export const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024;
const LOOKUP_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 20 * 60_000;

/**
 * Stand-ins for the network and the unpacker, for tests. Set a property to replace it for every install; an install can also be
 * handed its own (they win). Nothing in the app's settings can reach this.
 * @type {{ fetchImpl?: typeof fetch, archive?: { list: Function, extract: Function }, scratchDir?: string }}
 */
export const zipDeps = {};

const realArchive = { list: listZip, extract: extractZip };

/** A reason the install is refused, as opposed to a network problem. Tells a caller the release itself is the trouble. */
export class ZipInstallRefused extends Error {
	constructor(message) {
		super(message);
		this.name = "ZipInstallRefused";
		this.refusal = true;
	}
}

/** True for an https address on one of the hosts a release file may come from. */
export function isAllowedDownloadUrl(url) {
	try {
		const u = new URL(url);
		return u.protocol === "https:" && !u.username && !u.password && (u.port === "" || u.port === "443") && ZIP_DOWNLOAD_HOSTS.includes(u.hostname.toLowerCase());
	} catch {
		return false;
	}
}

/** The template's `zipInstall`, checked: where to look and what to take. Throws on a malformed one (a mistake in the template). */
export function checkSpec(spec) {
	if (!spec || typeof spec !== "object") throw new Error("This template has no zipInstall.");
	if (!REPO_NAME.test(String(spec.repo ?? ""))) throw new Error(`zipInstall.repo must be "<owner>/<name>", not "${spec.repo}".`);
	if (!ASSET_NAME.test(String(spec.asset ?? "")) || spec.asset.includes("..")) throw new Error(`zipInstall.asset must be a plain file name, not "${spec.asset}".`);
	return {
		repo: spec.repo,
		asset: spec.asset,
		maxBytes: Number.isSafeInteger(spec.maxBytes) && spec.maxBytes > 0 ? spec.maxBytes : DEFAULT_MAX_BYTES,
		expect: Array.isArray(spec.expect) ? spec.expect.map(String) : [],
	};
}

/** The asset of a release with exactly this name, or null. No prefix, no pattern, no case folding: one file is meant. */
export function pickAsset(release, assetName) {
	const assets = Array.isArray(release?.assets) ? release.assets : [];
	return assets.find((a) => a && a.name === assetName) ?? null;
}

/** The SHA-256 (lower-case hex) in the `digest` GitHub gives an asset ("sha256:<hex>"), or null when there is none it can use. */
export function sha256FromDigest(digest) {
	const m = /^sha256:([0-9a-fA-F]{64})$/.exec(String(digest ?? ""));
	return m ? m[1].toLowerCase() : null;
}

const mb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export const describeSize = mb;

/**
 * What the latest release of the template's repo offers for the template's file, and whether the panel may install it.
 * @returns {Promise<{ repo: string, asset: string, tag: string, size: number, sha256: string, url: string }>}
 * @throws {ZipInstallRefused} when the release has no such file, no usable checksum, a file over the cap, or an address that isn't GitHub's
 */
export async function resolveRelease(rawSpec, options = {}) {
	const spec = checkSpec(rawSpec);
	const { fetchImpl = zipDeps.fetchImpl ?? fetch } = options;
	const res = await fetchImpl(`${API_BASE}/repos/${spec.repo}/releases/latest`, {
		headers: { Accept: "application/vnd.github+json", "User-Agent": "GodlyPanel" },
		signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
	});
	if (res.status === 404) throw new Error(`GitHub doesn't know a release of ${spec.repo}.`);
	if (!res.ok) throw new Error(`GitHub answered ${res.status} when asked for the latest release of ${spec.repo}.`);
	const release = await res.json();
	if (!release || typeof release !== "object" || !release.tag_name) throw new Error(`GitHub's answer for ${spec.repo} had no release in it.`);
	if (release.draft || release.prerelease) throw new ZipInstallRefused(`The latest release of ${spec.repo} (${release.tag_name}) is marked as a draft or pre-release, so it was not used.`);

	const asset = pickAsset(release, spec.asset);
	if (!asset) throw new ZipInstallRefused(`The latest release of ${spec.repo} (${release.tag_name}) has no file named ${spec.asset}, so nothing was installed.`);

	const sha256 = sha256FromDigest(asset.digest);
	if (!sha256) {
		throw new ZipInstallRefused(`GitHub publishes no SHA-256 checksum for ${spec.asset} in ${release.tag_name}, so the panel can't check the download and won't install it.`);
	}
	if (!Number.isSafeInteger(asset.size) || asset.size <= 0) throw new ZipInstallRefused(`GitHub gave no usable size for ${spec.asset}, so it was not downloaded.`);
	if (asset.size > spec.maxBytes) {
		throw new ZipInstallRefused(`${spec.asset} is ${mb(asset.size)}, more than the ${mb(spec.maxBytes)} the panel allows for this download, so it was not downloaded.`);
	}
	if (!isAllowedDownloadUrl(asset.browser_download_url)) {
		throw new ZipInstallRefused(`${spec.asset} is offered at an address that is not GitHub's (${String(asset.browser_download_url).slice(0, 80)}), so it was not downloaded.`);
	}
	return { repo: spec.repo, asset: spec.asset, tag: String(release.tag_name), size: asset.size, sha256, url: asset.browser_download_url };
}

async function findLinks(dir) {
	for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isSymbolicLink()) return full;
		if (entry.isDirectory()) {
			const found = await findLinks(full);
			if (found) return found;
		}
	}
	return null;
}

const exists = (file) => fsp.access(file).then(() => true, () => false);

/**
 * Download the template's file from its repo's latest GitHub release and unpack it into `installDir`.
 * @param {object} rawSpec  the template's zipInstall: { repo, asset, maxBytes?, expect? }
 * @param {string} installDir
 * @param {object} [options]
 * @param {(msg: string) => void} [options.log]
 * @param {(stage: "downloading"|"installing") => void} [options.onStage]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {{ list: (file: string) => Promise<string[]>, extract: (file: string, dir: string) => Promise<void> }} [options.archive]
 * @param {string} [options.scratchDir]  where the zip is kept while it is checked (removed afterwards)
 * @returns {Promise<{ tag: string, size: number, sha256: string }>}
 */
export async function installZipRelease(rawSpec, installDir, options = {}) {
	const spec = checkSpec(rawSpec);
	const { log = () => {}, onStage = () => {}, fetchImpl = zipDeps.fetchImpl ?? fetch, archive = zipDeps.archive ?? realArchive } = options;
	const scratchDir = options.scratchDir ?? zipDeps.scratchDir ?? path.join(installDir, ".godlypanel-download");

	log(`Asking GitHub for the latest release of ${spec.repo} ...`);
	const release = await resolveRelease(spec, { fetchImpl });
	log(`Found ${release.tag}: ${release.asset}, ${mb(release.size)}. GitHub publishes SHA-256 ${release.sha256.slice(0, 12)}... for it.`);

	await fsp.mkdir(installDir, { recursive: true });
	await fsp.mkdir(scratchDir, { recursive: true });
	const zip = path.join(scratchDir, "download.zip");
	try {
		onStage("downloading");
		log(`Downloading ${release.url} (https, GitHub hosts only) ...`);
		let nextMark = 10;
		await downloadVerified({
			url: release.url,
			dest: zip,
			sha256: release.sha256,
			size: release.size,
			isTrusted: isAllowedDownloadUrl,
			checksumSource: "GitHub release",
			timeoutMs: DOWNLOAD_TIMEOUT_MS,
			fetchImpl,
			onProgress: (received) => {
				const percent = Math.floor((received / release.size) * 100);
				if (percent >= nextMark) {
					log(`  ${Math.min(percent, 100)}% (${mb(received)} of ${mb(release.size)})`);
					nextMark = Math.floor(percent / 10) * 10 + 10;
				}
			},
		});
		log("Download finished and its SHA-256 matches the one GitHub publishes.");

		onStage("installing");
		log("Checking the names inside the archive ...");
		const names = await archive.list(zip);
		if (names.length === 0) throw new ZipInstallRefused("The download is an empty archive, so nothing was installed.");
		const unsafe = unsafeEntries(names);
		if (unsafe.length > 0) {
			throw new ZipInstallRefused(`The download holds a path outside its own folder (${unsafe[0].slice(0, 80)}), so nothing was unpacked.`);
		}

		log(`Unpacking ${names.length} entries into ${installDir} ...`);
		await archive.extract(zip, installDir);

		const link = await findLinks(installDir);
		if (link) throw new ZipInstallRefused(`The download contained a link (${path.basename(link)}), which a server download never should, so the install was stopped.`);
		for (const file of spec.expect) {
			if (!(await exists(path.join(installDir, ...file.split(/[\\/]/))))) {
				throw new ZipInstallRefused(`${release.asset} did not contain ${file}, so this is not the server that was expected.`);
			}
		}
		log(`Installed ${release.tag} of ${spec.repo}.`);
		return { tag: release.tag, size: release.size, sha256: release.sha256 };
	} finally {
		await fsp.rm(scratchDir, { recursive: true, force: true }).catch(() => {});
	}
}
