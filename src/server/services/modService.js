import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MOD_TEMPLATES } from "../data/modTemplates.js";
import { templateOfServer } from "./serverCreationService.js";
import { readManagedFile, writeManagedFile } from "../util/managedFiles.js";
import { assertWithinAllowedRoots } from "../util/safePath.js";
import { listZip, extractZip, unsafeEntries } from "../util/tarZip.js";
import { resolveSteamCmdFor } from "./steamCmdProvisioner.js";
import { logActivity } from "./activityLog.js";

// Mods: what is installed, adding more, turning them off, removing them. Each game
// takes mods differently (see modTemplates.js), so each has an adapter behind one
// set of calls. Everything here changes files the game reads at start, so the
// callers require the server to be stopped first.

export class ModError extends Error {
	constructor(message, code = "mod_error", status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

const MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._()+\-]{0,120}$/;

// A test points this at a stand-in; the app's own settings can't.
const thunderstoreBase = () => process.env.GHP_THUNDERSTORE_API || "https://thunderstore.io";

export const modConfigFor = (server) => MOD_TEMPLATES[templateOfServer(server)?.id] ?? null;

export function modSupport(server) {
	const spec = modConfigFor(server);
	if (!spec) return { supported: false };
	const { adapter, label, note, accepts = [] } = spec;
	return { supported: true, adapter, label, note, accepts, ...(spec.appId ? { appId: spec.appId } : {}), ...(spec.community ? { community: spec.community } : {}) };
}

function modsDirOf(server, spec) {
	const root = spec.dir.base === "install" ? server.installDir : server.workingDir || server.installDir;
	if (!root) throw new ModError("This server has no folder recorded, so mods can't be managed.", "no_folder");
	const dir = path.resolve(root, spec.dir.rel);
	assertWithinAllowedRoots(dir);
	return dir;
}

const exists = async (p) => fsp.stat(p).then((s) => s, () => null);

async function sizeOf(p) {
	const stat = await exists(p);
	if (!stat) return 0;
	if (stat.isFile()) return stat.size;
	let total = 0;
	for (const entry of await fsp.readdir(p, { withFileTypes: true }).catch(() => [])) {
		total += await sizeOf(path.join(p, entry.name));
	}
	return total;
}

const cleanName = (raw) => {
	const base = path.basename(String(raw ?? "").replaceAll("\\", "/"));
	if (!SAFE_NAME.test(base) || base.includes("..")) throw new ModError(`"${base}" isn't a file name the panel will use. Use letters, numbers, spaces and . _ - ( ) +`, "bad_name");
	return base;
};

async function moveInto(from, to) {
	await fsp.mkdir(path.dirname(to), { recursive: true });
	try {
		await fsp.rename(from, to);
	} catch {
		// Another drive: copy, then remove.
		await fsp.cp(from, to, { recursive: true });
		await fsp.rm(from, { recursive: true, force: true });
	}
}

/** Unpack an archive into a fresh scratch folder, after checking it can't write elsewhere. */
async function unpack(zipFile) {
	let names;
	try {
		names = await listZip(zipFile);
	} catch (err) {
		throw new ModError(`That file couldn't be opened as a zip: ${err.message}`, "bad_archive");
	}
	const unsafe = unsafeEntries(names);
	if (unsafe.length > 0) throw new ModError(`That archive holds paths outside its own folder (${unsafe[0]}), so it was refused.`, "unsafe_archive");
	if (names.length === 0) throw new ModError("That archive is empty.", "empty_archive");
	const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-mod-"));
	try {
		await extractZip(zipFile, scratch);
	} catch (err) {
		await fsp.rm(scratch, { recursive: true, force: true });
		throw new ModError(`That file couldn't be opened as a zip: ${err.message}`, "bad_archive");
	}
	return scratch;
}

// ---- folder adapter -----------------------------------------------------------

async function listFolder(dir) {
	let entries;
	try {
		entries = await fsp.readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}
	const mods = [];
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const disabled = entry.name.endsWith(".disabled");
		const stat = await exists(path.join(dir, entry.name));
		mods.push({
			id: entry.name,
			name: disabled ? entry.name.slice(0, -".disabled".length) : entry.name,
			enabled: !disabled,
			type: entry.isDirectory() ? "folder" : "file",
			sizeBytes: await sizeOf(path.join(dir, entry.name)),
			modified: stat?.mtime.toISOString() ?? null,
		});
	}
	return mods.sort((a, b) => a.name.localeCompare(b.name));
}

async function installIntoFolder(dir, originalName, file, accepts) {
	const name = cleanName(originalName);
	const ext = path.extname(name).toLowerCase();
	const isArchive = ext === ".zip";
	if (isArchive ? !accepts.includes("archive") : !accepts.includes(ext)) {
		throw new ModError(`This game takes ${accepts.map((a) => (a === "archive" ? ".zip archives" : a)).join(" or ")} files, not ${ext || "that"}.`, "wrong_type");
	}
	await fsp.mkdir(dir, { recursive: true });

	if (!isArchive) {
		const target = path.join(dir, name);
		if (await exists(target)) await fsp.rm(target, { force: true });
		await fsp.copyFile(file, target);
		return name;
	}

	const scratch = await unpack(file);
	try {
		const top = (await fsp.readdir(scratch)).filter((n) => !n.startsWith("."));
		const single = top.length === 1 && (await exists(path.join(scratch, top[0])))?.isDirectory();
		// A zip with one folder in it is that mod; anything else gets a folder named after the zip.
		const folderName = single ? top[0] : path.basename(name, ".zip");
		const target = path.join(dir, cleanName(folderName));
		if (await exists(target)) throw new ModError(`${folderName} is already installed. Remove it first to replace it.`, "already_installed", 409);
		await moveInto(single ? path.join(scratch, top[0]) : scratch, target);
		return folderName;
	} finally {
		await fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
	}
}

async function toggleFolderEntry(dir, id, enabled) {
	const name = cleanName(id.replace(/\.disabled$/, ""));
	const on = path.join(dir, name);
	const off = `${on}.disabled`;
	const from = enabled ? off : on;
	const to = enabled ? on : off;
	if (!(await exists(from))) {
		if (await exists(to)) return; // already in the state asked for
		throw new ModError("That mod isn't installed.", "not_found", 404);
	}
	if (await exists(to)) throw new ModError("A mod with that name is already in that state.", "conflict", 409);
	await fsp.rename(from, to);
}

async function removeFolderEntry(dir, id) {
	// An id is one name in the mods folder, never a path.
	const name = String(id);
	if (!name || name !== path.basename(name) || /[\\/]/.test(name) || name.includes("..") || name.startsWith(".")) throw new ModError("That isn't a mod.", "bad_name");
	const target = path.join(dir, name);
	if (!(await exists(target))) throw new ModError("That mod isn't installed.", "not_found", 404);
	await fsp.rm(target, { recursive: true, force: true });
}

// ---- Conan Exiles (Steam Workshop + modlist.txt) --------------------------------

const modlistPath = (dir) => path.join(dir, "modlist.txt");
const listedName = (line) => path.basename(line.trim().replace(/^\*/, "").replaceAll("\\", "/")).toLowerCase();

async function readModlist(dir) {
	try {
		return (await fsp.readFile(modlistPath(dir), "utf8")).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	} catch {
		return [];
	}
}

const writeModlist = async (dir, lines) => {
	await fsp.mkdir(dir, { recursive: true });
	await fsp.writeFile(modlistPath(dir), `${lines.join("\r\n")}${lines.length ? "\r\n" : ""}`, "utf8");
};

async function listWorkshop(dir) {
	const lines = await readModlist(dir);
	const enabled = new Set(lines.map(listedName));
	const paks = (await listFolder(dir)).filter((m) => m.type === "file" && /\.pak$/i.test(m.name));
	const mods = paks.map((m) => ({ ...m, enabled: enabled.has(m.name.toLowerCase()), missing: false }));
	for (const line of lines) {
		const name = listedName(line);
		if (!mods.some((m) => m.name.toLowerCase() === name)) mods.push({ id: path.basename(line.replace(/^\*/, "")), name: path.basename(line.replace(/^\*/, "")), enabled: true, type: "file", sizeBytes: 0, modified: null, missing: true });
	}
	return mods;
}

// Conan wants each line as *Name.pak; the asterisk is part of the format.
const modlistLine = (pakName) => `*${pakName}`;

const addToModlist = async (dir, pakName) => {
	const lines = await readModlist(dir);
	if (!lines.some((l) => listedName(l) === pakName.toLowerCase())) await writeModlist(dir, [...lines, modlistLine(pakName)]);
};

async function findFiles(root, pattern, depth = 6) {
	const found = [];
	for (const entry of await fsp.readdir(root, { withFileTypes: true }).catch(() => [])) {
		const full = path.join(root, entry.name);
		if (entry.isDirectory() && depth > 0) found.push(...(await findFiles(full, pattern, depth - 1)));
		else if (entry.isFile() && pattern.test(entry.name)) found.push(full);
	}
	return found;
}

function runSteamCmd(steamCmd, args, timeoutMs) {
	return new Promise((resolve, reject) => {
		execFile(steamCmd, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => {
			// SteamCMD's exit code isn't reliable (it can be non-zero after a self-update);
			// what it printed is what counts.
			resolve({ output: String(stdout ?? ""), error });
		});
	}).catch((err) => {
		throw new ModError(`SteamCMD couldn't run: ${err.message}`, "steamcmd_failed", 500);
	});
}

export async function installWorkshopItem(server, id) {
	const spec = modConfigFor(server);
	if (spec?.adapter !== "workshop") throw new ModError("This game doesn't take Steam Workshop mods.", "unsupported");
	if (!/^\d{3,12}$/.test(String(id))) throw new ModError("A Workshop item number is digits only, like 1234567890.", "bad_id");
	const steamCmd = resolveSteamCmdFor(server.steamCmdPath);
	if (!fs.existsSync(steamCmd)) throw new ModError("SteamCMD isn't installed yet. Download it from Settings first.", "no_steamcmd");

	const dir = modsDirOf(server, spec);
	const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-workshop-"));
	try {
		const { output } = await runSteamCmd(steamCmd, ["+force_install_dir", scratch, "+login", "anonymous", "+workshop_download_item", spec.appId, String(id), "+quit"], 30 * 60_000);
		if (!new RegExp(`Success\\. Downloaded item ${id}\\b`, "i").test(output)) {
			const why = output.split(/\r?\n/).reverse().find((l) => /error|fail|denied|timeout|no subscription/i.test(l)) ?? "SteamCMD didn't report a finished download.";
			throw new ModError(`Steam wouldn't download item ${id}: ${why.trim()}. Some Workshop items need a signed-in Steam account.`, "download_failed", 502);
		}
		const paks = await findFiles(scratch, /\.pak$/i);
		if (paks.length === 0) throw new ModError(`Item ${id} downloaded but holds no .pak file, so it isn't a mod this server can load.`, "no_pak");
		await fsp.mkdir(dir, { recursive: true });
		const added = [];
		for (const pak of paks) {
			const name = path.basename(pak);
			await fsp.copyFile(pak, path.join(dir, name));
			await addToModlist(dir, name);
			added.push(name);
		}
		logActivity({ type: "mods.installed", server: server.name, message: `Installed Workshop item ${id} on ${server.name} (${added.join(", ")}).` });
		return { installed: added };
	} finally {
		await fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
	}
}

// ---- Valheim (BepInEx + Thunderstore) ----------------------------------------------

const PACKAGE_REF = /^([A-Za-z0-9_]+)-([A-Za-z0-9_]+)(?:-(\d+\.\d+\.\d+))?$/;

export function parseThunderstoreRef(text) {
	const s = String(text ?? "").trim();
	const url = /thunderstore\.io\/c\/[^/]+\/p\/([A-Za-z0-9_]+)\/([A-Za-z0-9_]+)/i.exec(s);
	if (url) return { owner: url[1], name: url[2], version: null };
	const ref = PACKAGE_REF.exec(s);
	if (ref) return { owner: ref[1], name: ref[2], version: ref[3] ?? null };
	throw new ModError('Use a package name like "Owner-Name" (optionally "-1.2.3"), or its Thunderstore page address.', "bad_package");
}

const tsTrusted = (url) => {
	if (process.env.GHP_THUNDERSTORE_API) return true;
	try {
		const u = new URL(url);
		return u.protocol === "https:" && (u.hostname === "thunderstore.io" || u.hostname.endsWith(".thunderstore.io"));
	} catch {
		return false;
	}
};

async function tsPackage(owner, name) {
	const res = await fetch(`${thunderstoreBase()}/api/experimental/package/${owner}/${name}/`, { headers: { "User-Agent": "GodlyPanel" }, signal: AbortSignal.timeout(20_000) });
	if (res.status === 404) throw new ModError(`Thunderstore has no package ${owner}-${name}.`, "not_found", 404);
	if (!res.ok) throw new ModError(`Thunderstore answered ${res.status}.`, "thunderstore_failed", 502);
	return res.json();
}

async function tsDownload(url, dest) {
	if (!tsTrusted(url)) throw new ModError("That download isn't from Thunderstore, so it was refused.", "untrusted_download");
	const res = await fetch(url, { headers: { "User-Agent": "GodlyPanel" }, redirect: "follow", signal: AbortSignal.timeout(10 * 60_000) });
	if (!res.ok || !res.body) throw new ModError(`The download answered ${res.status}.`, "thunderstore_failed", 502);
	if (!tsTrusted(res.url || url)) throw new ModError("The download was redirected somewhere that isn't Thunderstore, so it was refused.", "untrusted_download");
	let received = 0;
	const limit = async function* (source) {
		for await (const chunk of source) {
			received += chunk.length;
			if (received > MAX_DOWNLOAD_BYTES) throw new ModError("That download is bigger than 500 MB, so it was stopped.", "too_big");
			yield chunk;
		}
	};
	await pipeline(Readable.fromWeb(res.body), limit, fs.createWriteStream(dest));
}

async function frameworkInstalled(server, spec) {
	const root = server.workingDir || server.installDir;
	return Boolean(await exists(path.join(root, "BepInEx", "core"))) || Boolean(await exists(path.join(root, "winhttp.dll")));
}

async function installFramework(server, spec) {
	const { owner, name } = spec.framework;
	const pkg = await tsPackage(owner, name);
	const scratchZip = path.join(os.tmpdir(), `gp-bepinex-${crypto.randomUUID()}.zip`);
	try {
		await tsDownload(pkg.latest.download_url, scratchZip);
		const scratch = await unpack(scratchZip);
		try {
			// The pack wraps everything in one folder; its contents belong next to the server.
			const top = await fsp.readdir(scratch);
			const inner = top.length === 1 && (await exists(path.join(scratch, top[0])))?.isDirectory() ? path.join(scratch, top[0]) : scratch;
			const root = server.workingDir || server.installDir;
			assertWithinAllowedRoots(root);
			for (const entry of await fsp.readdir(inner)) {
				if (/^(manifest\.json|icon\.png|README\.md|CHANGELOG\.md)$/i.test(entry)) continue;
				await fsp.cp(path.join(inner, entry), path.join(root, entry), { recursive: true, force: true });
			}
		} finally {
			await fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
		}
	} finally {
		await fsp.rm(scratchZip, { force: true }).catch(() => {});
	}
	return `${owner}-${name} ${pkg.latest.version_number}`;
}

async function installPackage(server, spec, dir, owner, name, version, seen, depth = 0) {
	const key = `${owner}-${name}`.toLowerCase();
	if (seen.has(key) || depth > 6) return [];
	seen.add(key);
	if (owner.toLowerCase() === spec.framework.owner.toLowerCase() && name.toLowerCase() === spec.framework.name.toLowerCase()) return [];
	if (/^bepinex/i.test(name) && owner.toLowerCase() === "bepinex") return [];

	const pkg = await tsPackage(owner, name);
	const v = version ? (pkg.versions ?? []).find((x) => x.version_number === version) ?? (pkg.latest.version_number === version ? pkg.latest : null) : pkg.latest;
	if (!v) throw new ModError(`${owner}-${name} has no version ${version}.`, "not_found", 404);

	const installed = [];
	for (const dep of v.dependencies ?? []) {
		const m = PACKAGE_REF.exec(dep);
		if (m) installed.push(...(await installPackage(server, spec, dir, m[1], m[2], m[3], seen, depth + 1)));
	}

	const zipFile = path.join(os.tmpdir(), `gp-ts-${crypto.randomUUID()}.zip`);
	try {
		await tsDownload(v.download_url, zipFile);
		const scratch = await unpack(zipFile);
		try {
			const target = path.join(dir, `${owner}-${name}`);
			await fsp.rm(target, { recursive: true, force: true });
			await moveInto(scratch, target);
		} catch (err) {
			await fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
			throw err;
		}
	} finally {
		await fsp.rm(zipFile, { force: true }).catch(() => {});
	}
	installed.push(`${owner}-${name} ${v.version_number}`);
	return installed;
}

export async function installThunderstoreMod(server, ref) {
	const spec = modConfigFor(server);
	if (spec?.adapter !== "thunderstore") throw new ModError("This game doesn't take Thunderstore mods.", "unsupported");
	const { owner, name, version } = parseThunderstoreRef(ref);
	const dir = modsDirOf(server, spec);
	const installed = [];
	if (!(await frameworkInstalled(server, spec))) installed.push(await installFramework(server, spec));
	await fsp.mkdir(dir, { recursive: true });
	installed.push(...(await installPackage(server, spec, dir, owner, name, version, new Set())));
	logActivity({ type: "mods.installed", server: server.name, message: `Installed ${installed.join(", ")} on ${server.name}.` });
	return { installed };
}

// ---- ARK (ids in the start script) ---------------------------------------------------

function scriptIds(text, flag) {
	const re = flag === "GameModIds" ? /\?GameModIds=([0-9,]*)/i : /(?:^|\s)-mods=([0-9,]*)/i;
	const m = re.exec(text);
	return m ? m[1].split(",").filter(Boolean) : [];
}

function withScriptIds(text, flag, ids) {
	const joined = ids.join(",");
	if (flag === "GameModIds") {
		let out = text;
		if (/\?GameModIds=[0-9,]*/i.test(out)) out = ids.length ? out.replace(/\?GameModIds=[0-9,]*/i, `?GameModIds=${joined}`) : out.replace(/\?GameModIds=[0-9,]*/i, "");
		else if (ids.length) out = out.replace(/(\?listen)/i, `$1?GameModIds=${joined}`);
		const managed = /\s-automanagedmods\b/i.test(out);
		if (ids.length && !managed) out = out.replace(/(ShooterGameServer\.exe\s+\S+)/i, "$1 -automanagedmods");
		if (!ids.length && managed) out = out.replace(/\s-automanagedmods\b/i, "");
		return out;
	}
	if (/(^|\s)-mods=[0-9,]*/i.test(text)) return ids.length ? text.replace(/(^|\s)-mods=[0-9,]*/i, `$1-mods=${joined}`) : text.replace(/\s-mods=[0-9,]*/i, "");
	return ids.length ? text.replace(/^(.*start .*?)(\r?)$/im, `$1 -mods=${joined}$2`) : text;
}

async function changeScriptIds(server, spec, change) {
	if (!server.startScriptPath) throw new ModError("This server has no start script recorded.", "no_script");
	const text = await readManagedFile(server.startScriptPath);
	const ids = change(scriptIds(text, spec.flag));
	await writeManagedFile(server.startScriptPath, withScriptIds(text, spec.flag, ids));
	return ids;
}

// ---- the one set of calls ---------------------------------------------------------------

export async function listMods(server) {
	const spec = modConfigFor(server);
	if (!spec) return { ...modSupport(server), mods: [] };
	if (spec.adapter === "script-ids") {
		const text = server.startScriptPath ? await readManagedFile(server.startScriptPath).catch(() => "") : "";
		return { ...modSupport(server), mods: scriptIds(text, spec.flag).map((id) => ({ id, name: id, enabled: true, type: "id" })) };
	}
	const dir = modsDirOf(server, spec);
	const mods = spec.adapter === "workshop" ? await listWorkshop(dir) : await listFolder(dir);
	return {
		...modSupport(server),
		directory: dir,
		...(spec.adapter === "thunderstore" ? { frameworkInstalled: await frameworkInstalled(server, spec) } : {}),
		mods,
	};
}

/** Add a mod from an uploaded file (already on disk at `file`). */
export async function installUpload(server, originalName, file) {
	const spec = modConfigFor(server);
	if (!spec || spec.adapter === "script-ids") throw new ModError("This game's mods aren't files you can upload.", "unsupported");
	const dir = modsDirOf(server, spec);
	const name = await installIntoFolder(dir, originalName, file, spec.accepts);
	if (spec.adapter === "workshop" && /\.pak$/i.test(name)) await addToModlist(dir, name);
	logActivity({ type: "mods.installed", server: server.name, message: `Installed ${name} on ${server.name}.` });
	return { installed: [name] };
}

export async function addScriptId(server, id) {
	const spec = modConfigFor(server);
	if (spec?.adapter !== "script-ids") throw new ModError("This game doesn't take mod numbers in its start script.", "unsupported");
	if (!/^\d{3,12}$/.test(String(id))) throw new ModError("A mod number is digits only.", "bad_id");
	const ids = await changeScriptIds(server, spec, (current) => (current.includes(String(id)) ? current : [...current, String(id)]));
	logActivity({ type: "mods.installed", server: server.name, message: `Added mod ${id} to ${server.name}.` });
	return { installed: [String(id)], ids };
}

export async function setModEnabled(server, id, enabled) {
	const spec = modConfigFor(server);
	if (!spec || spec.adapter === "script-ids") throw new ModError("Mods for this game are turned off by removing them.", "unsupported");
	const dir = modsDirOf(server, spec);
	if (spec.adapter === "workshop") {
		const lines = await readModlist(dir);
		const name = cleanName(id).toLowerCase();
		const others = lines.filter((l) => listedName(l) !== name);
		await writeModlist(dir, enabled ? [...others, modlistLine(cleanName(id))] : others);
		return;
	}
	await toggleFolderEntry(dir, id, enabled);
}

export async function removeMod(server, id) {
	const spec = modConfigFor(server);
	if (!spec) throw new ModError("This game has no mod support.", "unsupported");
	if (spec.adapter === "script-ids") {
		await changeScriptIds(server, spec, (current) => current.filter((x) => x !== String(id)));
	} else {
		const dir = modsDirOf(server, spec);
		if (spec.adapter === "workshop") {
			const name = cleanName(id).toLowerCase();
			await writeModlist(dir, (await readModlist(dir)).filter((l) => listedName(l) !== name));
			if (await exists(path.join(dir, cleanName(id)))) await fsp.rm(path.join(dir, cleanName(id)), { force: true });
		} else {
			await removeFolderEntry(dir, id);
		}
	}
	logActivity({ type: "mods.removed", server: server.name, message: `Removed ${id} from ${server.name}.` });
}
