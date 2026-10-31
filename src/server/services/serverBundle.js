import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig } from "../config/configStore.js";
import { all as allServers } from "../data/serverStore.js";
import { getOptions } from "../data/serverOptions.js";
import { FORMATS } from "../util/archiveFormats.js";
import { createArchive } from "../util/tarZip.js";
import { templateOfServer, slugify } from "./serverCreationService.js";
import { assertStorageHeadroom } from "./storageService.js";
import { planRemoval, MARKER_FILE } from "./serverRemoval.js";
import { describePorts } from "./serverPorts.js";
import { isFullyStopped } from "./serverState.js";
import { backupSpecsFor } from "./backupService.js";
import { modsFolderOf } from "./modService.js";
import { isAutoUpdateEnabled } from "./autoUpdateSettings.js";
import { listTasks } from "./scheduler.js";
import * as modLock from "./modLock.js";
import { currentVersion } from "./panelUpdate.js";
import { dirSize, withNeighbours, rewriteStrings } from "./cloneService.js";

// Exporting a server as one .gpserver file: the saves (or the whole install), the settings, mods and schedules, and a manifest that
// lets the same server be rebuilt on another PC. The file never holds a path of this PC (paths are written with tokens the importer
// fills in) and, unless asked, no password (a token stands in for it). The files on this PC are never changed.

export class BundleError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

export const BUNDLE_VERSION = 1;
export const BUNDLE_MANIFEST = ".godlypanel-bundle.json"; // name of the manifest inside the archive

// Files the panel writes for itself. They are never part of a bundle, wherever they turn up.
const CONTROL_NAMES = new Set([MARKER_FILE, BUNDLE_MANIFEST]);
const ROOT_TOKEN = "{{serverRoot}}";
// A key that holds a password, token or key. The name is what decides, so a new setting called like that is covered too.
const SECRET_KEY = /pass(word)?|secret|token|api.?key/i;
// A string that is a path on some drive, or a network path. Anything that still looks like one after the install folder is
// rebased is a path outside the server, so it is dropped rather than carried into another PC.
const MACHINE_PATH = /[A-Za-z]:[\\/]/;
const TEXT_LIMIT = 1024 * 1024;

const isMachinePath = (value) => typeof value === "string" && (MACHINE_PATH.test(value) || value.startsWith("\\\\"));
const normalizeDir = (p) => path.resolve(String(p)).replace(/[\\/]+$/, "").toLowerCase();
const joinRel = (base, rel) => [base, String(rel).replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")].filter(Boolean).join("/");

/** Where a path sits under the install folder, with forward slashes; "" for the folder itself; null when it is outside. */
function relOf(root, abs) {
	const rel = path.relative(root, abs);
	if (rel === "") return "";
	if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
	return rel.split(path.sep).join("/");
}

/** Every value in a record, deeply, with the name of the key it sits under (array items take their array's key). */
function mapDeep(value, fn, key = "") {
	if (Array.isArray(value)) return value.map((v) => mapDeep(v, fn, key));
	if (value && typeof value === "object") {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = mapDeep(v, fn, k);
		return out;
	}
	return fn(key, value);
}

/** Takes out every key (and array item) that still holds a path of another place, and names it. */
function dropMachinePaths(value, where, dropped) {
	if (Array.isArray(value)) {
		return value.flatMap((v, i) => {
			const here = `${where}[${i}]`;
			if (isMachinePath(v)) {
				dropped.fields.push(here);
				return [];
			}
			return [dropMachinePaths(v, here, dropped)];
		});
	}
	if (value && typeof value === "object") {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			const here = where ? `${where}.${k}` : k;
			if (isMachinePath(v)) dropped.fields.push(here);
			else out[k] = dropMachinePaths(v, here, dropped);
		}
		return out;
	}
	return value;
}

/** Control files (the marker, a stale manifest) found below a folder, by their path, so they can be left out of the archive. */
async function scanControlFiles(dirAbs, relBase, found) {
	for (const entry of await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => [])) {
		if (entry.isSymbolicLink()) continue;
		const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
		if (entry.isDirectory()) await scanControlFiles(path.join(dirAbs, entry.name), rel, found);
		// A file at the top of the install folder can't be an exclusion, because the top level is taken entry by entry.
		else if (CONTROL_NAMES.has(entry.name) && relBase) found.push(rel);
	}
}

/**
 * What the bundle holds, as folders (whole, or opened where a named file sits inside them), and files named by the record.
 * Nothing is read beyond listing names and sizes.
 */
async function planContents(server, include, root) {
	const dropped = { fields: [], files: [] };
	const folders = new Set();
	const named = new Map(); // archive path -> absolute path, for the files the record names
	const specExcludes = [];

	if (include === "all") {
		folders.add("");
	} else {
		const { specs } = await backupSpecsFor(server);
		for (const spec of specs) {
			if (!spec.exists) continue;
			const rel = relOf(root, path.resolve(spec.path));
			if (rel === null) {
				dropped.files.push(spec.leaf);
				continue;
			}
			if (spec.isDirectory) {
				folders.add(rel);
				for (const ex of spec.exclude ?? []) specExcludes.push(joinRel(rel, ex));
			} else {
				named.set(rel, path.resolve(spec.path));
			}
		}
		const mods = modsFolderOf(server);
		if (mods && (await fs.stat(mods).catch(() => null))?.isDirectory()) {
			const rel = relOf(root, path.resolve(mods));
			if (rel === null) dropped.files.push("mods folder");
			else folders.add(rel);
		}
	}

	// Files the record names, and small text files beside them (the start script's and game settings' neighbours). Only these get
	// their paths and passwords rewritten, so they are the only text the panel changes.
	const recordFiles = [server.startScriptPath, server.configPath, ...Object.values(server.configPaths ?? {})].filter(Boolean).map((p) => path.resolve(p));
	const inside = [];
	for (const file of recordFiles) {
		if (relOf(root, file) === null) dropped.files.push(path.basename(file));
		else inside.push(file);
	}
	for (const file of await withNeighbours(inside)) {
		const stat = await fs.stat(file).catch(() => null);
		const rel = relOf(root, file);
		if (!stat?.isFile() || rel === null || CONTROL_NAMES.has(path.basename(file))) continue;
		named.set(rel, file);
	}

	return { dropped, folders, named, specExcludes };
}

/** Folders that lie inside another folder in the list are taken with it, so each file is archived once. */
function topmostFolders(folders) {
	const list = [...folders].sort((a, b) => a.length - b.length);
	const kept = [];
	for (const rel of list) {
		const covered = kept.some((k) => k === "" || rel === k || rel.startsWith(`${k}/`));
		if (!covered) kept.push(rel);
	}
	return kept;
}

/** The manifest's copy of the record: no id or runtime fields, paths rebased, passwords replaced, machine paths dropped. */
function prepare(value, where, ctx) {
	const rebased = rewriteStrings(value, ctx.rootPairs);
	const hidden = mapDeep(rebased, (key, v) => {
		if (typeof v === "string" && v !== "" && SECRET_KEY.test(key)) {
			ctx.secrets.push({ key, value: v });
			ctx.secretFields.add(key);
			return ctx.keepSecrets ? v : `{{secret:${key}}}`;
		}
		return v;
	});
	return dropMachinePaths(hidden, where, ctx.dropped);
}

async function gatherSchedules(name) {
	const schedules = [];
	let omitted = 0;
	for (const task of listTasks()) {
		if (!task.servers.includes(name)) continue;
		// A schedule that also covers other servers isn't this server's to hand over.
		if (task.servers.length > 1) {
			omitted += 1;
			continue;
		}
		const { id: _id, createdAt: _created, lastRunAt: _ran, lastStatus: _status, lastMessage: _message, nextRunAt: _next, running: _running, servers: _servers, ...rest } = task;
		schedules.push({ ...rest, servers: ["{{serverName}}"] });
	}
	return { schedules, omitted };
}

export async function exportServer(server, { include = "saves", secrets = false, onProgress = () => {}, outDir } = {}) {
	if (include !== "saves" && include !== "all") throw new BundleError("include must be saves or all.", "bad_input");
	if (typeof secrets !== "boolean") throw new BundleError("secrets must be true or false.", "bad_input");

	const template = templateOfServer(server);
	if (!template) throw new BundleError("The panel doesn't know this game, so it can't be exported.", "unknown_game");
	// Checked before the removal rules, so a server sharing its folder with another is named as sharing it.
	const norm = normalizeDir(server.installDir ?? "");
	const shared = allServers().some((s) => s.name !== server.name && s.installDir && normalizeDir(s.installDir) === norm);
	if (template.sharedInstall || shared) {
		throw new BundleError("This game's servers share one install, so only a server in a folder of its own can be exported.", "shared_install");
	}
	const removal = planRemoval(server);
	if (!removal.canDeleteFiles || removal.mode !== "folder") {
		throw new BundleError("Only a server the panel created, in a folder of its own, can be exported. " + (removal.reason ?? ""), "not_exportable");
	}
	if (!(await isFullyStopped(server))) {
		throw new BundleError("Stop the server first, so its files are copied in one piece.", "server_running", 409);
	}
	// Saves are downloaded again on import, so the game has to be one the panel can download again.
	if (include === "saves" && !server.updateAppId) {
		throw new BundleError("This game can't be downloaded again, so export everything instead.", "saves_unsupported");
	}

	const root = path.resolve(server.installDir).replace(/[\\/]+$/, "");
	onProgress({ phase: "measuring" });
	const { dropped, folders, named, specExcludes } = await planContents(server, include, root);

	// Everything the record says gets the same treatment: the install folder becomes a token, the name is a token, passwords are
	// replaced (unless asked for), and any other path of this PC is dropped.
	const ctx = {
		keepSecrets: secrets,
		secrets: [],
		secretFields: new Set(),
		dropped,
		rootPairs: [
			[root, ROOT_TOKEN],
			[root.replaceAll("\\", "/"), ROOT_TOKEN],
		],
	};
	const { id: _id, createdAt: _created, source: _source, autoUpdate: _auto, ...rest } = server;
	const record = prepare(rest, "", ctx);
	record.name = "{{serverName}}";
	record.installDir = ROOT_TOKEN;
	const options = prepare(getOptions(server.name), "options", ctx);
	const { schedules, omitted } = await gatherSchedules(server.name);
	const ports = (await describePorts(server)).current;
	const autoUpdate = await isAutoUpdateEnabled(server);
	const modList = (await modLock.read(server.name)).mods;
	const textPairs = [...ctx.rootPairs, ...(secrets ? [] : ctx.secrets.map(({ key, value }) => [value, `{{secret:${key}}}`, { exact: true }]))];

	let ownOutDir = false;
	let outDirUsed = outDir ?? null;
	let stageRoot = null;
	let partial = null;
	try {
		if (!outDirUsed) {
			outDirUsed = await fs.mkdtemp(path.join(os.tmpdir(), "godlypanel-export-"));
			ownOutDir = true;
		}
		await fs.mkdir(outDirUsed, { recursive: true });

		// The folders archived whole, and the files named by the record. Their sizes give the room check.
		let bytes = 0;
		for (const rel of topmostFolders(folders)) bytes += await dirSize(rel ? path.join(root, ...rel.split("/")) : root);
		for (const abs of named.values()) bytes += (await fs.stat(abs).catch(() => ({ size: 0 }))).size;
		try {
			assertStorageHeadroom(bytes, outDirUsed);
		} catch (err) {
			throw new BundleError(err.message, err.code ?? "disk_full", 507);
		}

		// Text files the record names go to a staging folder with the rewritten text; they are the only copies that get into the archive.
		onProgress({ phase: "copying" });
		stageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "godlypanel-bundle-"));
		const stageFiles = path.join(stageRoot, "files");
		const staged = new Set();
		for (const [rel, abs] of named) {
			const stat = await fs.stat(abs);
			if (stat.size >= TEXT_LIMIT) continue;
			const buf = await fs.readFile(abs);
			if (buf.includes(0)) continue;
			const dest = path.join(stageFiles, ...rel.split("/"));
			await fs.mkdir(path.dirname(dest), { recursive: true });
			await fs.writeFile(dest, rewriteStrings(buf.toString("utf8"), textPairs), "utf8");
			staged.add(rel);
		}

		const manifest = {
			version: BUNDLE_VERSION,
			panelVersion: currentVersion(),
			sourceName: server.name,
			createdAt: new Date().toISOString(),
			game: template.id,
			include,
			secretsIncluded: secrets,
			server: record,
			ports,
			options,
			autoUpdate,
			schedules,
			modLock: modList,
			omitted: { schedules: omitted },
			dropped,
			secretFields: [...ctx.secretFields],
		};
		await fs.writeFile(path.join(stageRoot, BUNDLE_MANIFEST), JSON.stringify(manifest, null, 2), "utf8");

		// Entries: the folders (opened where a named file sits inside them, so that file's original is never archived), the named files,
		// and the manifest. Whole folders are one entry each, so the command line stays short however many files there are.
		const ancestors = new Set();
		for (const rel of named.keys()) {
			const parts = rel.split("/");
			for (let i = 1; i < parts.length; i += 1) ancestors.add(parts.slice(0, i).join("/"));
		}
		const entries = [];
		const addFolder = async (rel) => {
			if (rel !== "" && !ancestors.has(rel)) {
				entries.push({ dir: root, name: rel });
				return;
			}
			const dirAbs = rel ? path.join(root, ...rel.split("/")) : root;
			for (const child of await fs.readdir(dirAbs, { withFileTypes: true })) {
				if (child.isSymbolicLink()) continue;
				const childRel = rel ? `${rel}/${child.name}` : child.name;
				if (CONTROL_NAMES.has(child.name) || named.has(childRel)) continue;
				if (specExcludes.some((e) => childRel === e || childRel.startsWith(`${e}/`))) continue;
				if (child.isDirectory()) await addFolder(childRel);
				else if (child.isFile()) entries.push({ dir: root, name: childRel });
			}
		};
		for (const rel of topmostFolders(folders)) await addFolder(rel);
		for (const rel of named.keys()) entries.push(staged.has(rel) ? { dir: stageFiles, name: rel } : { dir: root, name: rel });
		entries.push({ dir: stageRoot, name: BUNDLE_MANIFEST });

		// Control files nested in folders that go in whole are excluded by path, and so are the spec's own excludes.
		const nested = [];
		for (const rel of topmostFolders(folders)) {
			if (rel === "") await scanControlFiles(root, "", nested);
			else await scanControlFiles(path.join(root, ...rel.split("/")), rel, nested);
		}
		const exclude = [...new Set([...specExcludes, ...nested])];

		const cfg = getConfig().backups;
		const format = Object.hasOwn(FORMATS, cfg.format) ? cfg.format : "zip";
		const level = ["fast", "balanced", "max"].includes(cfg.level) ? cfg.level : "balanced";
		const stamp = new Date();
		const fileName = `${slugify(server.name) || "server"}-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}.gpserver`;
		const file = path.join(outDirUsed, fileName);

		onProgress({ phase: "archiving" });
		partial = `${file}.partial`;
		await createArchive(partial, entries, { format, level, exclude });
		await fs.rename(partial, file);
		partial = null;

		const { size } = await fs.stat(file);
		onProgress({ phase: "done" });
		return { file, bytes: size, name: fileName };
	} catch (err) {
		if (partial) await fs.rm(partial, { force: true }).catch(() => {});
		if (ownOutDir) await fs.rm(outDirUsed, { recursive: true, force: true }).catch(() => {});
		if (err instanceof BundleError) throw err;
		throw new BundleError(err.message, "archive_failed", 500);
	} finally {
		if (stageRoot) await fs.rm(stageRoot, { recursive: true, force: true }).catch(() => {});
	}
}
