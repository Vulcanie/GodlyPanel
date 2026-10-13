import { existsSync, readFileSync, createWriteStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import AdmZip from "adm-zip";
import { paths } from "../paths.js";
import { getSecrets } from "../config/secretsStore.js";

const UPLOADS_DIR = paths.uploadsDir;
// The environment variable exists so tests can point this at a stand-in; nothing else sets it.
const CF_API_BASE = process.env.GHP_CURSEFORGE_API || "https://api.curseforge.com/v1";
const CF_API_OVERRIDDEN = Boolean(process.env.GHP_CURSEFORGE_API);
// One mod file never needs more than this, and a download that runs on past it is not a mod.
const MAX_MOD_BYTES = 1024 * 1024 * 1024;
const MOD_DOWNLOAD_TIMEOUT_MS = 10 * 60_000;
// A zip is expanded into the uploads folder, so one that claims to hold far more than a modpack ever does (a "zip bomb": a few
// megabytes that unpack to terabytes) is refused before anything is written.
const MAX_UNPACKED_BYTES = 8 * 1024 * 1024 * 1024;
const MAX_ENTRIES = 50_000;

// The ids this module hands out. Anything else coming back from a request (it arrives in the body of "create server") is not
// one of ours, and must not be joined onto the uploads folder: "..\.." would point at, and cleanup would delete, the folder above it.
const UPLOAD_ID = /^modpack-\d+-[0-9a-f]{8}$/;
function uploadDirOf(uploadId) {
	if (!UPLOAD_ID.test(String(uploadId))) throw new Error("That modpack upload isn't valid. Upload the zip again.");
	return path.join(UPLOADS_DIR, String(uploadId));
}

/** One plain file name, as a mod's file is called on disk: never a path. */
export const isPlainFileName = (name) => typeof name === "string" && name.length > 0 && name.length <= 200 && name !== "." && name !== ".." && !/[\\/:*?"<>|\u0000-\u001f]/.test(name);
const DOWNLOAD_CONCURRENCY = 5;
const RESOLVE_CHUNK_SIZE = 50;
const STALE_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

// Rejects the whole extraction if ANY entry would resolve outside
// targetDir (zip-slip) — checked up front, before anything is written to
// disk, rather than partially extracting and then discovering a bad entry.
export function assertSafeEntries(zip, targetDir) {
	const resolvedTarget = path.resolve(targetDir);
	const entries = zip.getEntries();
	if (entries.length > MAX_ENTRIES) throw new Error(`That zip holds ${entries.length} files, far more than a modpack does, so it was refused.`);
	// The sizes are the ones the zip's own directory declares, which a forged zip can understate: this stops the ordinary bomb,
	// not a determined one (an administrator uploads these, so that is the case worth covering).
	const declared = entries.reduce((sum, e) => sum + (e.header?.size ?? 0), 0);
	if (declared > MAX_UNPACKED_BYTES) throw new Error("That zip would unpack to far more than a modpack ever does, so it was refused.");
	for (const entry of entries) {
		const resolvedEntry = path.resolve(path.join(targetDir, entry.entryName));
		if (
			resolvedEntry !== resolvedTarget &&
			!resolvedEntry.startsWith(resolvedTarget + path.sep)
		) {
			throw new Error(`Unsafe zip entry path rejected: ${entry.entryName}`);
		}
	}
}

// CurseForge's manifest.json format: { minecraft: { version, modLoaders:
// [{id: "neoforge-26.1.2.109", primary: true}] }, files: [{projectID,
// fileID}], overrides: "overrides" }. modLoaders[].id is "<family>-<version>"
// — split on the FIRST "-" since versions themselves can contain dashes.
function parseManifest(extractDir) {
	const manifestPath = path.join(extractDir, "manifest.json");
	if (!existsSync(manifestPath)) {
		throw new Error("manifest.json not found at the root of the zip — is this a CurseForge modpack export?");
	}
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

	const loaders = manifest.minecraft?.modLoaders || [];
	const primaryLoader = loaders.find((l) => l.primary) || loaders[0];
	if (!primaryLoader?.id) {
		throw new Error("No modloader found in manifest.json's minecraft.modLoaders.");
	}
	const dashIdx = primaryLoader.id.indexOf("-");
	if (dashIdx === -1) {
		throw new Error(`Unrecognized modloader id format: "${primaryLoader.id}"`);
	}

	// Named by the zip's own manifest, so it has to be a folder name and nothing that could point out of the pack.
	const overrides = manifest.overrides || "overrides";
	if (!isPlainFileName(overrides)) throw new Error("The modpack's manifest names an overrides folder the panel won't use.");

	return {
		mcVersion: manifest.minecraft.version,
		modLoaderFamily: primaryLoader.id.slice(0, dashIdx).toLowerCase(),
		modLoaderVersion: primaryLoader.id.slice(dashIdx + 1),
		files: manifest.files || [],
		overridesFolder: overrides,
		packName: manifest.name || null,
	};
}

/**
 * @param {Buffer|string} source  the zip's bytes, or the path of a file holding it (an upload is kept on disk while it arrives,
 *   not held whole in memory: a modpack can be several hundred megabytes)
 */
export async function extractModpackZip(source) {
	const uploadId = `modpack-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
	const uploadDir = path.join(UPLOADS_DIR, uploadId);
	const extractDir = path.join(uploadDir, "extracted");

	// Looked at before anything is written: a file that isn't a zip, or one that would write outside its folder or unpack to
	// something absurd, leaves nothing behind.
	const zip = new AdmZip(source);
	assertSafeEntries(zip, extractDir);

	try {
		await fs.mkdir(extractDir, { recursive: true });
		if (Buffer.isBuffer(source)) await fs.writeFile(path.join(uploadDir, "original.zip"), source);
		else await fs.copyFile(source, path.join(uploadDir, "original.zip"));
		zip.extractAllTo(extractDir, true);

		const manifest = parseManifest(extractDir);
		const hasOverrides = existsSync(path.join(extractDir, manifest.overridesFolder));
		return { uploadId, manifest, hasOverrides };
	} catch (err) {
		// A zip that isn't a modpack export would otherwise sit in the uploads folder until the daily sweep.
		await cleanupUpload(uploadId);
		throw err;
	}
}

// Re-parses the manifest straight off the saved upload rather than trusting
// anything the client echoed back in the create-server request — the
// server-side copy is the only source of truth for what actually gets built.
export function getUploadManifest(uploadId) {
	const extractDir = path.join(uploadDirOf(uploadId), "extracted");
	if (!existsSync(extractDir)) {
		throw new Error(`Upload "${uploadId}" not found — it may have expired or already been used.`);
	}
	return parseManifest(extractDir);
}

export async function installOverrides(uploadId, manifest, destDir) {
	// The overrides folder's name comes from the zip's manifest: a plain folder name inside the extracted pack, never a path out of it.
	if (!isPlainFileName(manifest.overridesFolder)) throw new Error("The modpack names an overrides folder the panel won't use.");
	const overridesPath = path.join(uploadDirOf(uploadId), "extracted", manifest.overridesFolder);
	if (!existsSync(overridesPath)) return;
	await fs.cp(overridesPath, destDir, { recursive: true });
}

export async function cleanupUpload(uploadId) {
	if (!UPLOAD_ID.test(String(uploadId))) return;
	await fs.rm(path.join(UPLOADS_DIR, String(uploadId)), { recursive: true, force: true }).catch(() => {});
}

export async function cleanupStaleUploads() {
	try {
		const entries = await fs.readdir(UPLOADS_DIR).catch(() => []);
		const now = Date.now();
		// An upload that was cut off partway (the browser closed, the connection dropped) leaves its file here.
		const incoming = path.join(UPLOADS_DIR, "incoming");
		for (const name of await fs.readdir(incoming).catch(() => [])) {
			const stat = await fs.stat(path.join(incoming, name)).catch(() => null);
			if (stat && now - stat.mtimeMs > 60 * 60 * 1000) await fs.rm(path.join(incoming, name), { force: true }).catch(() => {});
		}
		for (const entry of entries) {
			const zipPath = path.join(UPLOADS_DIR, entry, "original.zip");
			try {
				const stat = await fs.stat(zipPath);
				if (now - stat.mtimeMs > STALE_UPLOAD_TTL_MS) {
					await fs.rm(path.join(UPLOADS_DIR, entry), { recursive: true, force: true });
				}
			} catch {
				// No original.zip (partial/already-cleaned upload) — leave it
				// for now rather than guessing whether it's safe to remove.
			}
		}
	} catch (e) {
		console.error("[modpack-cleanup] Failed to sweep stale uploads:", e.message);
	}
}

// Resolves manifest.files ({projectID, fileID}) to real download URLs via
// CurseForge's Core API batch endpoint, then downloads them into
// destModsDir with a small concurrency cap (packs can have 100+ mods).
// Mods CF can't resolve (author disabled third-party distribution — common
// and real) are collected into `failed` rather than aborting the whole job.
// CurseForge tags each file with which environments it runs on (visible as
// "Client"/"Server" chips on the mod's own page) via the same gameVersions
// array already returned by the /mods/files resolution call — no extra
// requests needed. A file explicitly tagged "Client" with no "Server" tag
// is client-only and would just be dead weight on a dedicated server.
// Untagged files (neither tag present) are kept rather than guessed at —
// better to include something unnecessary than silently drop something
// the server actually needs.
export function isClientOnly(gameVersions) {
	const tags = gameVersions || [];
	return tags.includes("Client") && !tags.includes("Server");
}

export async function resolveAndDownloadMods(manifest, destModsDir, { onProgress } = {}) {
	const downloaded = [];
	const failed = [];
	const skippedClientOnly = [];
	if (manifest.files.length === 0) return { downloaded, failed, skippedClientOnly };

	// Only required once we actually have something to resolve — a pack with
	// no CF-listed files (everything covered by overrides) shouldn't need a
	// key it'll never use.
	const apiKey = getSecrets().curseForgeApiKey;
	if (!apiKey) {
		throw new Error(
			"No CurseForge API key set. Add one in Settings (free, from console.curseforge.com) to install modpacks.",
		);
	}

	await fs.mkdir(destModsDir, { recursive: true });

	const resolved = new Map();
	const fileIds = manifest.files.map((f) => f.fileID);
	for (let i = 0; i < fileIds.length; i += RESOLVE_CHUNK_SIZE) {
		const chunk = fileIds.slice(i, i + RESOLVE_CHUNK_SIZE);
		const res = await fetch(`${CF_API_BASE}/mods/files`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"x-api-key": apiKey,
			},
			body: JSON.stringify({ fileIds: chunk }),
		});
		if (!res.ok) {
			throw new Error(`CurseForge API error resolving mod files: HTTP ${res.status}`);
		}
		const { data } = await res.json();
		for (const file of data) {
			resolved.set(file.id, {
				fileName: file.fileName,
				downloadUrl: file.downloadUrl,
				gameVersions: file.gameVersions,
			});
		}
	}

	const queue = manifest.files.slice();
	let index = 0;
	let active = 0;

	const downloadOne = async (modFile) => {
		const info = resolved.get(modFile.fileID);
		if (!info || !info.downloadUrl) {
			failed.push({
				projectID: modFile.projectID,
				fileID: modFile.fileID,
				reason: info
					? "No download URL — author disabled third-party distribution for this mod."
					: "CurseForge did not return this file.",
			});
			return;
		}
		if (isClientOnly(info.gameVersions)) {
			skippedClientOnly.push({
				projectID: modFile.projectID,
				fileID: modFile.fileID,
				fileName: info.fileName,
			});
			return;
		}
		// The names and addresses come from CurseForge's answer. A file name is only ever a file name, and a download is over https
		// (a test's stand-in is the one exception), so a wrong answer can't write outside the mods folder or fetch over plain http.
		if (!isPlainFileName(info.fileName)) {
			failed.push({ projectID: modFile.projectID, fileID: modFile.fileID, reason: "CurseForge gave this file a name the panel won't use." });
			return;
		}
		const partial = path.join(destModsDir, `${info.fileName}.partial`);
		try {
			const url = new URL(info.downloadUrl);
			if (url.protocol !== "https:" && !CF_API_OVERRIDDEN) throw new Error("the download address isn't https");
			const res = await fetch(url, { signal: AbortSignal.timeout(MOD_DOWNLOAD_TIMEOUT_MS) });
			if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
			// To disk as it arrives (not held in memory whole) and stopped if it runs past what a mod can be.
			let received = 0;
			const limit = async function* (source) {
				for await (const chunk of source) {
					received += chunk.length;
					if (received > MAX_MOD_BYTES) throw new Error("the file is larger than a mod can be");
					yield chunk;
				}
			};
			await pipeline(Readable.fromWeb(res.body), limit, createWriteStream(partial));
			await fs.rename(partial, path.join(destModsDir, info.fileName));
			downloaded.push(info.fileName);
		} catch (e) {
			await fs.rm(partial, { force: true }).catch(() => {});
			failed.push({ projectID: modFile.projectID, fileID: modFile.fileID, reason: e.message });
		}
	};

	await new Promise((resolvePromise) => {
		const pump = () => {
			if (index >= queue.length && active === 0) {
				resolvePromise();
				return;
			}
			while (active < DOWNLOAD_CONCURRENCY && index < queue.length) {
				const modFile = queue[index++];
				active++;
				downloadOne(modFile).finally(() => {
					active--;
					onProgress?.(downloaded.length + failed.length + skippedClientOnly.length, queue.length);
					pump();
				});
			}
		};
		pump();
	});

	return { downloaded, failed, skippedClientOnly };
}
