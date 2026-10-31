import AdmZip from "adm-zip";
import crypto from "node:crypto";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ModError, modConfigFor, modInstallContext, modSupport, modsFolderOf } from "./modService.js";
import { templateOfServer } from "./serverCreationService.js";
import * as modLock from "./modLock.js";
import { modrinthProvider } from "./modSources/modrinth.js";
import { loopbackTestMode } from "./modSources/netGuard.js";

// The mods a player needs to join, made from the lock: only what the panel recorded, and only the mods the game's players use
// (server-only mods never leave the server). A file that changed, went missing or was turned off is left out and named, not shipped.
// A CurseForge mod is named, not copied, since its terms don't let the panel hand the file on. A pack is built in the temp folder and
// removed once it has been sent.

const PACK_MAX_BYTES = 200 * 1024 * 1024;
const DISABLED = ".disabled";
const FORMATS = new Set(["zip", "list", "mrpack"]);
// Games whose mods are picked by id from a store or a list, so a player gets a list to follow rather than files to copy.
const LIST_ADAPTERS = new Set(["workshop", "thunderstore", "script-ids"]);
const WORKSHOP_ID = /^[0-9]+$/;
// A Modrinth pack names a mod's download only on Modrinth's own CDN, so a hostile answer can't point a launcher anywhere else.
const MODRINTH_CDN = "cdn.modrinth.com";
// Each Modrinth lookup is one request, so a pack with many mods asks for no more than this many. The rest go into the pack.
const MRPACK_MAX_LOOKUPS = 100;

const unsupported = () => new ModError("This game's mods can't be shared.", "unsupported");
const mrpackUnsupported = () => new ModError("This game's mods can't be packed as a Modrinth pack.", "unsupported", 400);
const hashOf = (algo, bytes) => crypto.createHash(algo).update(bytes).digest("hex");
const kindOf = (p) =>
	fsp.lstat(p).then(
		(s) => (s.isSymbolicLink() ? "link" : s.isFile() ? "file" : s.isDirectory() ? "dir" : "other"),
		() => null,
	);

/**
 * Where one recorded file is, checked without reading it. It must be a plain file under the mods folder, reached through plain folders
 * only, and not turned off. Returns { abs, size } or { problem } with "missing" or "changed".
 */
async function locate(modsDir, rel) {
	const parts = rel.split("/");
	if (!parts.every(modLock.isSafeName)) return { problem: "missing" };
	const abs = path.resolve(modsDir, ...parts);
	if (!abs.startsWith(modsDir + path.sep)) return { problem: "missing" };
	// A mod turned off is renamed with ".disabled", so the server has turned it off: a player should not get it.
	if ((await kindOf(path.join(modsDir, `${parts[0]}${DISABLED}`))) !== null) return { problem: "missing" };
	// Every folder on the way must be a real folder. A link could lead out of the mods folder, so it is never followed.
	let here = modsDir;
	for (const part of parts.slice(0, -1)) {
		here = path.join(here, part);
		const kind = await kindOf(here);
		if (kind === null) return { problem: "missing" };
		if (kind !== "dir") return { problem: "changed" };
	}
	const kind = await kindOf(abs);
	if (kind === null) return { problem: "missing" };
	if (kind !== "file") return { problem: "changed" };
	const stat = await fsp.lstat(abs);
	return { abs, size: stat.size };
}

/**
 * Looks at every mod in the lock, without reading any mod's bytes: which ones are server-only (left out altogether), which are
 * references, and where each recorded file is. Throws unsupported when the game has no mods folder.
 */
async function gather(server) {
	const modsDir = modsFolderOf(server);
	if (!modsDir) throw unsupported();
	const { mods } = await modLock.read(server.name);
	const rows = [];
	for (const entry of mods) {
		if (entry.side === "server") continue;
		const row = {
			name: entry.names[0] ?? entry.ref,
			source: entry.source,
			ref: entry.ref,
			version: entry.version,
			side: entry.side,
			reference: entry.source === "curseforge",
			problem: null,
			located: [],
			files: [],
		};
		rows.push(row);
		if (row.reference) continue;
		for (const f of entry.files) {
			const found = await locate(modsDir, f.path);
			if (found.problem) {
				row.problem = row.problem === "missing" || found.problem === "missing" ? "missing" : found.problem;
				continue;
			}
			row.located.push({ path: f.path, sha256: f.sha256, abs: found.abs, size: found.size });
		}
	}
	return rows;
}

/**
 * Hashes each located file as it is now and marks a mod changed when a hash differs or a file has gone. When `keep` is true the bytes
 * are read and kept on each file, so a pack holds exactly the bytes that were hashed.
 */
async function verify(rows, keep) {
	for (const row of rows) {
		if (row.reference || row.problem) continue;
		for (const f of row.located) {
			let sha256;
			let bytes = null;
			try {
				if (keep) {
					bytes = await fsp.readFile(f.abs);
					sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
				} else {
					sha256 = await modLock.hashFile(f.abs);
				}
			} catch {
				row.problem = "missing";
				break;
			}
			if (sha256 !== f.sha256) {
				row.problem = "changed";
				break;
			}
			f.bytes = bytes;
		}
		if (!row.problem) row.files = row.located.map((f) => ({ path: f.path, sha256: f.sha256 }));
	}
	return rows;
}

const gameOf = (server) => templateOfServer(server)?.id ?? "unknown";

// The manifest from verified rows: the mods that are in the pack, and the ones that are named as left out.
async function manifestOf(server, rows) {
	const context = await modInstallContext(server);
	return {
		game: gameOf(server),
		gameVersion: context.gameVersion ?? null,
		loader: context.loader ?? null,
		generatedAt: new Date().toISOString(),
		mods: rows
			.filter((r) => !r.problem)
			.map((r) => ({ name: r.name, source: r.source, ref: r.ref, version: r.version, side: r.side, files: r.files, reference: r.reference })),
		omitted: rows.filter((r) => r.problem).map((r) => ({ name: r.name, reason: r.problem })),
	};
}

/** What a player's client should have: the mods the panel recorded, with each file's hash. Works while the server runs. */
export async function buildManifest(server) {
	const rows = await verify(await gather(server), false);
	return manifestOf(server, rows);
}

/** "list" for a game whose mods are picked by id, or a Steam Workshop-style store, otherwise "zip". */
export function defaultFormat(server) {
	return LIST_ADAPTERS.has(modConfigFor(server)?.adapter) ? "list" : "zip";
}

/** Whether a server's mods can be packed as a Modrinth pack: only a Minecraft modpack has the game version and loader it needs. */
export function supportsMrpack(server) {
	return templateOfServer(server)?.id === "minecraft-modpack";
}

/** Whether the pack can be made right now: a Minecraft modpack whose game version is known, which is what the builder asks for. */
export async function canMakeMrpack(server) {
	if (!supportsMrpack(server)) return false;
	const context = await modInstallContext(server);
	return typeof context.gameVersion === "string" && context.gameVersion !== "";
}

/**
 * The download address a located file can be listed under, or null when it can't be. Modrinth's answer must name exactly one file, with
 * the same name, size and sha512 as the verified bytes, and its address must be Modrinth's own CDN over https. A launcher downloads the
 * file from that address, so anything else is not listed and goes into the pack.
 */
function listingOf(resolved, f) {
	const files = resolved?.files;
	if (!Array.isArray(files) || files.length !== 1 || !files[0] || typeof files[0] !== "object") return null;
	const file = files[0];
	if (file.name !== path.posix.basename(f.path) || file.size !== f.bytes.length) return null;
	if (file.sha512 !== hashOf("sha512", f.bytes)) return null;
	if (typeof file.url !== "string") return null;
	let url;
	try {
		url = new URL(file.url);
	} catch {
		return null;
	}
	if (url.username !== "" || url.password !== "") return null;
	const cdn = url.protocol === "https:" && url.hostname === MODRINTH_CDN && url.port === "";
	// A stand-in on this machine answers over plain http, but only under the same test hook the download guard reads.
	const loopback = loopbackTestMode() && url.protocol === "http:" && url.hostname === "127.0.0.1";
	return cdn || loopback ? url.href : null;
}

/**
 * Asks Modrinth which file a mod's pinned version is. A failure of any kind gives null, so the mod is not listed: a failed lookup never
 * fails the pack. The version is pinned so the listed file is the one the panel recorded, not whatever is newest on Modrinth.
 */
async function modrinthFileFor(row, context, fetchImpl) {
	if (typeof row.version !== "string" || row.version === "") return null;
	const slug = row.ref.split("@")[0];
	try {
		return await modrinthProvider.resolve(`${slug}@${row.version}`, { loader: context.loader, gameVersion: context.gameVersion, fetchImpl });
	} catch {
		return null;
	}
}

/**
 * The Modrinth pack as a zip: modrinth.index.json names the mods a launcher downloads from Modrinth, and every other mod is in
 * overrides/mods/ as the zip format has it. Only Minecraft's version is named as a dependency, since the loader's is not known here.
 */
async function mrpackZip(server, rows, context, fetchImpl) {
	const zip = new AdmZip();
	const files = [];
	let lookups = 0;
	for (const row of rows) {
		if (row.reference || row.problem) continue;
		for (const f of row.located) {
			// Only a Modrinth mod with one file can be listed, since a mod with several files has no single download to name.
			let url = null;
			if (row.source === "modrinth" && row.located.length === 1 && lookups < MRPACK_MAX_LOOKUPS) {
				lookups += 1;
				url = listingOf(await modrinthFileFor(row, context, fetchImpl), f);
			}
			if (url === null) {
				zip.addFile(`overrides/mods/${f.path}`, f.bytes);
				continue;
			}
			files.push({
				path: `mods/${f.path}`,
				hashes: { sha1: hashOf("sha1", f.bytes), sha512: hashOf("sha512", f.bytes) },
				env: row.side === "client" ? { client: "required", server: "unsupported" } : { client: "required", server: "required" },
				downloads: [url],
				fileSize: f.bytes.length,
			});
		}
	}
	const index = {
		formatVersion: 1,
		game: "minecraft",
		versionId: new Date().toISOString(),
		name: server.name,
		summary: `Mods for ${server.name}`,
		files,
		dependencies: { minecraft: context.gameVersion },
	};
	zip.addFile("modrinth.index.json", Buffer.from(`${JSON.stringify(index, null, 2)}\n`, "utf8"));
	return zip;
}

// The README: what the pack is, where the files go, and any mod the player has to get by hand.
function readmeOf(server, manifest) {
	const note = modSupport(server).note;
	const where = typeof note === "string" ? `Put the files in the mods folder of your game, as the game's note says: ${note}` : "Put the files in the mods folder of your game.";
	const lines = [
		`This pack holds the mods the server runs, so your game matches it. ${where}`,
	];
	const byHand = manifest.mods.filter((m) => m.reference);
	if (byHand.length > 0) {
		lines.push("", "These must be added by hand from their own site:");
		for (const m of byHand) lines.push(`${m.name} (${m.source}:${m.ref})`);
	}
	return `${lines.join("\n")}\n`;
}

// The list: a header, then one line per mod. A Steam Workshop mod with a numeric id also gets its page's address.
function listOf(manifest) {
	const lines = [`Mods the server runs (made ${manifest.generatedAt}):`];
	for (const m of manifest.mods) {
		const version = m.version ? `  ${m.version}` : "";
		const page = m.source === "workshop" && WORKSHOP_ID.test(m.ref) ? `  https://steamcommunity.com/sharedfiles/filedetails/?id=${m.ref}` : "";
		lines.push(`${m.name}  (${m.source}:${m.ref}${version})${page}`);
	}
	return `${lines.join("\n")}\n`;
}

/**
 * The pack a player takes: "zip" holds the manifest, a README and the mods' files; "list" is a plain text list of the mods. The file
 * lives in a fresh temp folder; `cleanup()` removes that folder and never throws. "mrpack" is a Modrinth pack, for a Minecraft modpack server
 * only. `fetchImpl` is for tests: it stands in for fetch when Modrinth is asked about a mod. Throws a ModError for a bad format, a game
 * without a mods folder, a game that can't make this pack, or a pack over 200 MB (checked from file sizes before any file is read).
 */
export async function buildClientPack(server, { format, fetchImpl } = {}) {
	if (!FORMATS.has(format)) throw new ModError("Unknown pack format.", "bad_format", 400);
	let context = null;
	if (format === "mrpack") {
		if (!supportsMrpack(server)) throw mrpackUnsupported();
		context = await modInstallContext(server);
		if (typeof context.gameVersion !== "string" || context.gameVersion === "") throw mrpackUnsupported();
	}

	// The size is worked out from file sizes alone, so a pack that is too big is refused before any file is read or any folder made.
	// A Modrinth pack is judged as if every file went into it, since a mod can only be listed once its bytes have been checked.
	const rows = await gather(server);
	if (format !== "list") {
		const total = rows.filter((r) => !r.reference && !r.problem).reduce((sum, r) => sum + r.located.reduce((s, f) => s + f.size, 0), 0);
		if (total > PACK_MAX_BYTES) throw new ModError("This pack is too big to build. Use the list instead.", "pack_too_big", 413);
	}

	const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ghp-pack-"));
	const cleanup = () => fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
	try {
		await verify(rows, format !== "list");
		if (format === "mrpack") {
			const zip = await mrpackZip(server, rows, context, fetchImpl);
			const file = path.join(dir, "mod-pack.mrpack");
			zip.writeZip(file);
			return { file, name: "mod-pack.mrpack", cleanup };
		}
		const manifest = await manifestOf(server, rows);

		if (format === "list") {
			const file = path.join(dir, "mod-list.txt");
			await fsp.writeFile(file, listOf(manifest), "utf8");
			return { file, name: "mod-list.txt", cleanup };
		}

		const zip = new AdmZip();
		zip.addFile("manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
		zip.addFile("README.txt", Buffer.from(readmeOf(server, manifest), "utf8"));
		for (const row of rows) {
			if (row.reference || row.problem) continue;
			for (const f of row.located) zip.addFile(`mods/${f.path}`, f.bytes);
		}
		const file = path.join(dir, "mod-pack.zip");
		zip.writeZip(file);
		return { file, name: "mod-pack.zip", cleanup };
	} catch (err) {
		await cleanup();
		throw err;
	}
}
