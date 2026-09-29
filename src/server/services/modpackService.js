import { existsSync, readFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import { paths } from "../paths.js";
import { getSecrets } from "../config/secretsStore.js";

const UPLOADS_DIR = paths.uploadsDir;
const CF_API_BASE = "https://api.curseforge.com/v1";
const DOWNLOAD_CONCURRENCY = 5;
const RESOLVE_CHUNK_SIZE = 50;
const STALE_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

// Rejects the whole extraction if ANY entry would resolve outside
// targetDir (zip-slip) — checked up front, before anything is written to
// disk, rather than partially extracting and then discovering a bad entry.
function safeExtractAllTo(zip, targetDir) {
	const resolvedTarget = path.resolve(targetDir);
	for (const entry of zip.getEntries()) {
		const resolvedEntry = path.resolve(path.join(targetDir, entry.entryName));
		if (
			resolvedEntry !== resolvedTarget &&
			!resolvedEntry.startsWith(resolvedTarget + path.sep)
		) {
			throw new Error(`Unsafe zip entry path rejected: ${entry.entryName}`);
		}
	}
	zip.extractAllTo(targetDir, true);
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

	return {
		mcVersion: manifest.minecraft.version,
		modLoaderFamily: primaryLoader.id.slice(0, dashIdx).toLowerCase(),
		modLoaderVersion: primaryLoader.id.slice(dashIdx + 1),
		files: manifest.files || [],
		overridesFolder: manifest.overrides || "overrides",
		packName: manifest.name || null,
	};
}

export async function extractModpackZip(buffer) {
	const uploadId = `modpack-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
	const uploadDir = path.join(UPLOADS_DIR, uploadId);
	const extractDir = path.join(uploadDir, "extracted");

	await fs.mkdir(extractDir, { recursive: true });
	await fs.writeFile(path.join(uploadDir, "original.zip"), buffer);

	const zip = new AdmZip(buffer);
	safeExtractAllTo(zip, extractDir);

	const manifest = parseManifest(extractDir);
	const hasOverrides = existsSync(path.join(extractDir, manifest.overridesFolder));

	return { uploadId, manifest, hasOverrides };
}

// Re-parses the manifest straight off the saved upload rather than trusting
// anything the client echoed back in the create-server request — the
// server-side copy is the only source of truth for what actually gets built.
export function getUploadManifest(uploadId) {
	const extractDir = path.join(UPLOADS_DIR, uploadId, "extracted");
	if (!existsSync(extractDir)) {
		throw new Error(`Upload "${uploadId}" not found — it may have expired or already been used.`);
	}
	return parseManifest(extractDir);
}

export async function installOverrides(uploadId, manifest, destDir) {
	const overridesPath = path.join(UPLOADS_DIR, uploadId, "extracted", manifest.overridesFolder);
	if (!existsSync(overridesPath)) return;
	await fs.cp(overridesPath, destDir, { recursive: true });
}

export async function cleanupUpload(uploadId) {
	await fs.rm(path.join(UPLOADS_DIR, uploadId), { recursive: true, force: true }).catch(() => {});
}

export async function cleanupStaleUploads() {
	try {
		const entries = await fs.readdir(UPLOADS_DIR).catch(() => []);
		const now = Date.now();
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
function isClientOnly(gameVersions) {
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
		try {
			const res = await fetch(info.downloadUrl);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const arrayBuffer = await res.arrayBuffer();
			await fs.writeFile(path.join(destModsDir, info.fileName), Buffer.from(arrayBuffer));
			downloaded.push(info.fileName);
		} catch (e) {
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
