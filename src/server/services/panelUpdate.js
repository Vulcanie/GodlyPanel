import crypto from "node:crypto";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { getConfig } from "../config/configStore.js";
import { paths } from "../paths.js";
import { logActivity } from "./activityLog.js";
import { broadcastSseEvent } from "./sseHub.js";
import { readJson, writeJsonAtomic } from "../util/atomicJson.js";

// Is there a newer GodlyPanel? This asks GitHub's public releases list (nothing
// about you or your servers is sent), compares versions, and can download the new
// zip into the data folder and check it against the checksum in the release notes.
// It never installs anything: replacing the app is left to you, as unzipping is
// the install. No browser is needed to do any of it.

const STATE_FILE = path.join(paths.dataDir, "state", "panel-update.json");
const DOWNLOAD_DIR = path.join(paths.dataDir, "updates");
const ASSET_NAME = /^GodlyPanel-.+-win\.zip$/;
const TRUSTED_HOSTS = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com", "github-releases.githubusercontent.com"];

// A test points this at a stand-in; nothing in the app's own settings can.
const apiBase = () => process.env.GHP_UPDATE_API || "https://api.github.com";
const overridden = () => Boolean(process.env.GHP_UPDATE_API);

export function currentVersion() {
	if (process.env.GHP_APP_VERSION) return process.env.GHP_APP_VERSION;
	try {
		const here = path.dirname(fileURLToPath(import.meta.url));
		return JSON.parse(fs.readFileSync(path.join(here, "..", "..", "..", "package.json"), "utf8")).version;
	} catch {
		return "0.0.0";
	}
}

// ---- versions ---------------------------------------------------------------

/** Semver ordering, including pre-releases: 0.1.0-alpha.2 < 0.1.0-alpha.10 < 0.1.0. */
export function compareVersions(a, b) {
	const parse = (v) => {
		const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(v).trim());
		return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split(".") : null } : null;
	};
	const x = parse(a);
	const y = parse(b);
	if (!x || !y) return 0;
	for (let i = 0; i < 3; i += 1) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
	if (!x.pre && !y.pre) return 0;
	if (!x.pre) return 1; // a release is newer than its own pre-releases
	if (!y.pre) return -1;
	for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i += 1) {
		const p = x.pre[i];
		const q = y.pre[i];
		if (p === undefined) return -1;
		if (q === undefined) return 1;
		const pn = /^\d+$/.test(p);
		const qn = /^\d+$/.test(q);
		if (pn && qn) {
			if (Number(p) !== Number(q)) return Number(p) < Number(q) ? -1 : 1;
		} else if (pn !== qn) return pn ? -1 : 1;
		else if (p !== q) return p < q ? -1 : 1;
	}
	return 0;
}

// ---- asking GitHub ----------------------------------------------------------

/** The SHA-256 the release notes give for an asset, or null. */
export function checksumFromNotes(notes, assetName) {
	if (!notes) return null;
	const escaped = assetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const near = new RegExp(`${escaped}[\\s\\S]{0,200}?\\b([0-9a-fA-F]{64})\\b`).exec(notes);
	if (near) return near[1].toLowerCase();
	return null;
}

function describeRelease(release) {
	const asset = (release.assets ?? []).find((a) => ASSET_NAME.test(a.name));
	return {
		version: String(release.tag_name).replace(/^v/, ""),
		name: release.name || release.tag_name,
		prerelease: Boolean(release.prerelease),
		publishedAt: release.published_at ?? null,
		notes: release.body ?? "",
		pageUrl: release.html_url ?? null,
		asset: asset
			? { name: asset.name, size: asset.size, url: asset.browser_download_url, sha256: checksumFromNotes(release.body, asset.name) }
			: null,
	};
}

let state = { checkedAt: null, latest: null, error: null, notifiedVersion: null };

export async function initPanelUpdate() {
	state = { ...state, ...((await readJson(STATE_FILE, {})) ?? {}) };
}

export function updateStatus() {
	const current = currentVersion();
	const latest = state.latest;
	return {
		current,
		latest,
		available: Boolean(latest && compareVersions(latest.version, current) > 0),
		checkedAt: state.checkedAt,
		error: state.error,
		enabled: getConfig().updates.check,
		repo: getConfig().updates.repo,
	};
}

/** Ask GitHub now. Safe to call often; a failure is recorded, not thrown. */
export async function checkForPanelUpdate() {
	const { repo, includePrereleases } = getConfig().updates;
	try {
		const res = await fetch(`${apiBase()}/repos/${repo}/releases?per_page=15`, {
			headers: { Accept: "application/vnd.github+json", "User-Agent": "GodlyPanel" },
			signal: AbortSignal.timeout(15_000),
		});
		if (res.status === 404) throw new Error("GitHub doesn't know that repository (it may be private).");
		if (!res.ok) throw new Error(`GitHub answered ${res.status}.`);
		const releases = (await res.json()).filter((r) => !r.draft && (includePrereleases || !r.prerelease));
		const newest = releases
			.filter((r) => r.tag_name)
			.map(describeRelease)
			.sort((a, b) => compareVersions(b.version, a.version))[0];
		state = { ...state, checkedAt: new Date().toISOString(), latest: newest ?? null, error: null };
	} catch (err) {
		state = { ...state, checkedAt: new Date().toISOString(), error: err.message };
	}

	const status = updateStatus();
	if (status.available && state.notifiedVersion !== status.latest.version) {
		state.notifiedVersion = status.latest.version;
		logActivity({
			type: "panel.update_available",
			message: `GodlyPanel ${status.latest.version} is available (you have ${status.current}).`,
			data: { version: status.latest.version },
		});
	}
	await writeJsonAtomic(STATE_FILE, state).catch(() => {});
	return updateStatus();
}

// ---- downloading ------------------------------------------------------------

let downloading = null;

const trusted = (url) => {
	if (overridden()) return true;
	try {
		const u = new URL(url);
		return u.protocol === "https:" && TRUSTED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
	} catch {
		return false;
	}
};

export function downloadState() {
	return downloading ? { ...downloading } : null;
}

export async function downloadPanelUpdate() {
	if (downloading?.status === "downloading") throw Object.assign(new Error("A download is already running."), { status: 409 });
	const asset = state.latest?.asset;
	if (!asset) throw Object.assign(new Error("There is no update to download. Check for updates first."), { status: 400 });
	if (!ASSET_NAME.test(asset.name) || !trusted(asset.url)) {
		throw Object.assign(new Error("That download isn't from a place the panel trusts, so it was not fetched."), { status: 400 });
	}

	await fsp.mkdir(DOWNLOAD_DIR, { recursive: true });
	const file = path.join(DOWNLOAD_DIR, asset.name);
	const partial = `${file}.partial`;
	downloading = { status: "downloading", name: asset.name, received: 0, total: asset.size, file, verified: null, error: null };

	(async () => {
		try {
			const res = await fetch(asset.url, { headers: { "User-Agent": "GodlyPanel" }, redirect: "follow" });
			if (!res.ok || !res.body) throw new Error(`The download answered ${res.status}.`);
			if (!trusted(res.url || asset.url)) throw new Error("The download was redirected somewhere the panel doesn't trust.");
			const hash = crypto.createHash("sha256");
			let lastShown = 0;
			const counter = async function* (source) {
				for await (const chunk of source) {
					hash.update(chunk);
					downloading.received += chunk.length;
					if (downloading.received - lastShown > 2 * 1024 * 1024) {
						lastShown = downloading.received;
						broadcastSseEvent({ type: "panel_update_progress", received: downloading.received, total: downloading.total }, (c) => c.role === "admin");
					}
					yield chunk;
				}
			};
			await pipeline(Readable.fromWeb(res.body), counter, fs.createWriteStream(partial));
			const digest = hash.digest("hex");
			if (asset.sha256 && digest !== asset.sha256) {
				await fsp.rm(partial, { force: true });
				throw new Error(`The download doesn't match the checksum in the release notes (got ${digest.slice(0, 12)}…, expected ${asset.sha256.slice(0, 12)}…), so it was deleted.`);
			}
			await fsp.rename(partial, file);
			downloading = { ...downloading, status: "done", verified: Boolean(asset.sha256), sha256: digest };
			broadcastSseEvent({ type: "panel_update_progress", done: true }, (c) => c.role === "admin");
		} catch (err) {
			await fsp.rm(partial, { force: true }).catch(() => {});
			downloading = { ...downloading, status: "failed", error: err.message };
			broadcastSseEvent({ type: "panel_update_progress", failed: err.message }, (c) => c.role === "admin");
		}
	})();
	return downloadState();
}

export const downloadFolder = DOWNLOAD_DIR;
