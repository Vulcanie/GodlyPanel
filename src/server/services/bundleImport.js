import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig } from "../config/configStore.js";
import { all as allServers, get as getServer, add as addServer, remove as removeFromStore } from "../data/serverStore.js";
import { getTemplate } from "../data/gameTemplates.js";
import { OPTION_DEFAULTS, setOptions, forgetOptions } from "../data/serverOptions.js";
import { forgetIntent } from "../data/serverIntent.js";
import { templateOfServer, suggestParams, validateNewServer, portOwners, describeOwners, slugify } from "./serverCreationService.js";
import { assertStorageHeadroom as realAssertStorageHeadroom } from "./storageService.js";
import { inspectFolder } from "./folderCheck.js";
import { writeMarker } from "./serverRemoval.js";
import { applyPorts, describePorts } from "./serverPorts.js";
import { isSteamCmdInstalled as realIsSteamCmdInstalled } from "./steamCmdProvisioner.js";
import { updateServer as realUpdateServer } from "./updateService.js";
import { setAutoUpdateEnabled, forgetAutoUpdateSetting } from "./autoUpdateSettings.js";
import { addTask as realAddTask, removeTask } from "./scheduler.js";
import { validateTask } from "./schedule.js";
import * as modLock from "./modLock.js";
import { logActivity } from "./activityLog.js";
import { currentVersion } from "./panelUpdate.js";
import { withNeighbours, rewriteStrings, randomPassword } from "./cloneService.js";
import { BundleError, BUNDLE_VERSION, BUNDLE_MANIFEST } from "./serverBundle.js";
import { listArchiveDetailed, extractArchive, unsafeEntries } from "../util/tarZip.js";

// Importing a .gpserver bundle. The file came from someone else, so it is treated as hostile: every name in it is checked before
// anything is extracted, the manifest is checked before anything is trusted, and the server is rebuilt in a new folder that the
// import creates itself. Any failure takes back everything the import made, and never touches a folder that was there before.

// The most the file may hold. Read by the checks, and a test lowers the entry cap to try the refusal.
export const IMPORT_LIMITS = { manifestBytes: 1024 * 1024, entries: 200000 };

const MAX_STRING = 4096;
const TOKEN = /\{\{(serverRoot|serverName|secret:[^{}]+)\}\}/g;
// A path of a drive letter, as it sits in a value: not the tail of a word, so a web address is left alone.
const DRIVE_PATH = /(?<![A-Za-z])[A-Za-z]:[\\/][^\s"';,|<>]*/g;
const DOT_SEGMENT = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const RESERVED_NAME = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInside = (child, parent) => {
	const c = path.resolve(child).toLowerCase();
	const p = path.resolve(parent).toLowerCase().replace(/[\\/]+$/, "");
	return c === p || c.startsWith(p + path.sep);
};
const listOf = (items) => {
	const shown = items.slice(0, 20).map((s) => String(s).slice(0, 80)).join(", ");
	return items.length > 20 ? `${shown} and ${items.length - 20} more` : shown;
};
const majorMinor = (v) => String(v).replace(/^v/i, "").split(".").slice(0, 2).join(".");

/** A value that, once the folder is rebased, still leaves the folder: a path outside it, a network path, a `..` step, or a token. */
function leavesFolder(text, dest) {
	if (text.includes("{{")) return true;
	if (text.startsWith("\\\\") || text.startsWith("//") || DOT_SEGMENT.test(text)) return true;
	for (const token of text.match(DRIVE_PATH) ?? []) if (!isInside(token, dest)) return true;
	return false;
}

/** Whether any string inside a value makes it leave the folder. */
function anyStringLeaves(value, dest) {
	if (typeof value === "string") return leavesFolder(value, dest);
	if (Array.isArray(value)) return value.some((v) => anyStringLeaves(v, dest));
	if (isPlain(value)) return Object.values(value).some((v) => anyStringLeaves(v, dest));
	return false;
}

/** A value with every string passed through fn. Keys are kept as written, except one that would set the prototype. */
function mapStrings(value, fn) {
	if (typeof value === "string") return fn(value);
	if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
	if (isPlain(value)) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([k]) => k !== "__proto__")
				.map(([k, v]) => [k, mapStrings(v, fn)]),
		);
	}
	return value;
}

// A name in the archive that Windows can't hold, or that would be read as something other than a plain name.
function unsafeName(name) {
	const norm = name.replaceAll("\\", "/").replace(/\/+$/, "");
	if (/[:<>"|?*\u0000-\u001f]/.test(norm)) return true;
	return norm.split("/").some((seg) => /[. ]$/.test(seg) || RESERVED_NAME.test(seg.split(".")[0]));
}

const unsafeBundle = (why = "The bundle holds a file name that isn't safe, so it was refused.") => new BundleError(why, "unsafe_bundle");

/** Makes the checks on the file itself, before any of its content is trusted. Returns the manifest and the expanded size. */
async function readBundle(file) {
	const abs = path.resolve(String(file ?? ""));
	if (!String(file ?? "").trim() || !abs.toLowerCase().endsWith(".gpserver")) throw new BundleError("Choose a .gpserver file.", "bad_file");
	const stat = await fs.stat(abs).catch(() => null);
	if (!stat?.isFile()) throw new BundleError("Choose a .gpserver file.", "bad_file");

	let entries;
	try {
		entries = await listArchiveDetailed(abs);
	} catch {
		throw new BundleError("This file isn't a GodlyPanel bundle: it can't be read as an archive.", "not_a_bundle");
	}
	if (entries.length > IMPORT_LIMITS.entries) {
		throw new BundleError(`The bundle holds more than ${IMPORT_LIMITS.entries} entries, so it was refused.`, "too_many_entries");
	}
	if (entries.some((e) => e.type === "other")) {
		throw new BundleError("The bundle holds a link or special file, so it was refused.", "unsafe_bundle");
	}
	const unsafe = unsafeEntries(entries.map((e) => e.name));
	if (unsafe.length) throw unsafeBundle(`The bundle holds an entry outside its folder ("${unsafe[0].slice(0, 80)}"), so it was refused.`);

	const seen = new Set();
	for (const { name } of entries) {
		if (unsafeName(name)) throw unsafeBundle(`The bundle holds a name that isn't safe ("${name.slice(0, 80)}"), so it was refused.`);
		// Two names that differ only by case, or by the slash used, would land on one file on Windows.
		const key = name.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
		if (seen.has(key)) throw unsafeBundle(`The bundle holds two entries with the same name ("${name.slice(0, 80)}"), so it was refused.`);
		seen.add(key);
	}

	const manifestEntries = entries.filter((e) => e.name === BUNDLE_MANIFEST || e.name.startsWith(`${BUNDLE_MANIFEST}/`));
	const manifestEntry = manifestEntries[0];
	if (manifestEntries.length !== 1 || manifestEntry.name !== BUNDLE_MANIFEST || manifestEntry.type !== "file") {
		throw new BundleError("This file has no manifest, so it isn't a GodlyPanel bundle.", "not_a_bundle");
	}
	if (manifestEntry.size > IMPORT_LIMITS.manifestBytes) {
		throw new BundleError("The bundle's manifest is too large, so the bundle was refused.", "bad_manifest");
	}

	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "godlypanel-import-"));
	let manifest;
	try {
		await extractArchive(abs, tmpDir, [BUNDLE_MANIFEST]);
		manifest = JSON.parse(await fs.readFile(path.join(tmpDir, BUNDLE_MANIFEST), "utf8"));
	} catch {
		throw new BundleError("This file isn't a GodlyPanel bundle: its manifest can't be read.", "not_a_bundle");
	} finally {
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
	}
	try {
		validateManifest(manifest);
	} catch (err) {
		// A manifest nested too deeply to check is refused as bad, not allowed to fail the panel.
		if (err instanceof BundleError) throw err;
		throw new BundleError("The bundle's manifest isn't valid.", "bad_manifest");
	}

	const bytes = entries.reduce((sum, e) => sum + e.size, 0);
	return { abs, manifest, bytes };
}

/** What the manifest must look like before any of it is used. A newer bundle is refused with its own message. */
function validateManifest(m) {
	const bad = (why) => new BundleError(`The bundle's manifest isn't valid: ${why}.`, "bad_manifest");
	if (!isPlain(m)) throw bad("it is not an object");
	if (!Number.isInteger(m.version) || m.version < 1) throw bad("there is no version");
	if (m.version > BUNDLE_VERSION) {
		throw new BundleError("This bundle was made by a newer GodlyPanel. Update the panel and try again.", "newer_bundle");
	}
	const tooLong = (v) => (typeof v === "string" ? v.length > MAX_STRING : v !== null && typeof v === "object" && Object.values(v).some(tooLong));
	if (tooLong(m)) throw bad("a value is too long");
	if (typeof m.game !== "string") throw bad("there is no game");
	if (!getTemplate(m.game)) {
		throw new BundleError(`This bundle is for ${String(m.game).slice(0, 80)}, which this panel doesn't have. Update the panel and try again.`, "unknown_game");
	}
	if (m.include !== "saves" && m.include !== "all") throw bad("the include is not saves or all");
	if (!isPlain(m.server)) throw bad("there is no server record");
	if (templateOfServer({ type: m.server.type, updateAppId: m.server.updateAppId })?.id !== m.game) {
		throw bad("the game and the server record disagree");
	}
	if (!isPlain(m.ports) || !Object.values(m.ports).every((v) => Number.isInteger(v) && v >= 1 && v <= 65535)) throw bad("the ports are not numbers");
	if (m.options !== undefined && !isPlain(m.options)) throw bad("the options are not an object");
	if (!Array.isArray(m.schedules) || m.schedules.length > 50 || !m.schedules.every(isPlain)) throw bad("the schedules are not a list");
	if (!Array.isArray(m.modLock) || m.modLock.length > 5000) throw bad("the mod list is not a list");
	if (!Array.isArray(m.secretFields) || !m.secretFields.every((s) => typeof s === "string")) throw bad("the password list is not a list");
}

// The name is taken when a server has it, in any letter case, as planClone checks it.
const takenByServer = (name) => allServers().some((s) => s.name.toLowerCase() === name.trim().toLowerCase());
// A name the panel can't use at all: the object-prototype names, which validateNewServer refuses.
const nameIsTaken = (name) => takenByServer(name) || name.trim() in Object.prototype;

function freeName(base) {
	if (!nameIsTaken(base)) return base;
	for (let n = 2; ; n += 1) {
		const candidate = `${base} (${n})`;
		if (!nameIsTaken(candidate)) return candidate;
	}
}

/**
 * The ports for a server made from the bundle: the bundle's own where they are free, else the next free ones the panel would
 * suggest. Each change is listed with who holds the port. The whole set is checked the way a new server's is, and if that check
 * fails the suggested set is used for the whole server.
 */
async function choosePorts(template, wanted, name) {
	const suggested = await suggestParams(template.id);
	const owners = await portOwners();
	const panelPort = Number(process.env.GHP_PORT) || getConfig().http.port;
	const reserved = new Set(getConfig().portAllocation.reservedPorts);
	const isFree = (port) => Number.isInteger(port) && port >= 1024 && port <= 65535 && port !== panelPort && !reserved.has(port) && !owners.has(port);

	const picked = {};
	for (const def of template.ports) {
		const value = wanted?.[def.key];
		const taken = Object.values(picked).includes(value);
		picked[def.key] = Number.isInteger(value) && isFree(value) && !taken ? value : suggested.ports[def.key];
	}
	try {
		await validateNewServer(template, name, picked, null);
	} catch {
		for (const def of template.ports) picked[def.key] = suggested.ports[def.key];
	}

	const portConflicts = [];
	for (const def of template.ports) {
		const value = wanted?.[def.key];
		if (!Number.isInteger(value) || value === picked[def.key]) continue;
		let owner = "another program on this PC";
		if (owners.has(value)) owner = describeOwners(owners.get(value));
		else if (value === panelPort) owner = "GodlyPanel itself";
		else if (reserved.has(value)) owner = "a port reserved in Settings";
		portConflicts.push({ key: def.key, port: value, owner });
	}
	return { ports: picked, portConflicts };
}

/** The notes that come with any bundle, shown before the import and kept with its result. */
function warningsFor(m) {
	const warnings = [];
	const secretFields = m.secretFields ?? [];
	if (m.secretsIncluded !== true && secretFields.length) warnings.push(`New passwords will be made for: ${listOf(secretFields)}.`);
	const dropped = m.dropped?.fields;
	if (Array.isArray(dropped) && dropped.length) warnings.push(`Some settings pointed outside the server folder and were not carried: ${listOf(dropped)}.`);
	const omitted = Number(m.omitted?.schedules) || 0;
	if (omitted > 0) warnings.push(`${omitted} schedule(s) that also covered other servers were not carried.`);
	const theirs = typeof m.panelVersion === "string" ? m.panelVersion : "";
	const ours = currentVersion();
	if (theirs && majorMinor(theirs) !== majorMinor(ours)) {
		warnings.push(`This bundle was made by GodlyPanel ${theirs}; this panel is ${ours}. Check the settings after the import.`);
	}
	return warnings;
}

const sourceNameOf = (m) => (typeof m.sourceName === "string" && m.sourceName.trim() ? m.sourceName.trim().slice(0, 100) : "Imported server");

/** Previews a bundle: what it holds, the name and ports it would get, and what to know first. Nothing is extracted but the manifest. */
export async function planImport(file) {
	const { manifest, bytes } = await readBundle(file);
	const template = getTemplate(manifest.game);
	const sourceName = sourceNameOf(manifest);
	const name = freeName(sourceName);
	const { ports, portConflicts } = await choosePorts(template, manifest.ports, name);
	return {
		game: template.id,
		gameName: template.displayName,
		include: manifest.include,
		sourceName,
		name,
		nameTaken: nameIsTaken(sourceName),
		ports,
		portConflicts,
		needsGameDownload: manifest.include === "saves",
		bytes,
		secretsIncluded: manifest.secretsIncluded === true,
		createdAt: typeof manifest.createdAt === "string" ? manifest.createdAt : null,
		panelVersion: typeof manifest.panelVersion === "string" ? manifest.panelVersion : null,
		warnings: warningsFor(manifest),
	};
}

// A folder must hold no links once extracted: a link in a bundle is refused, and this checks the folder as it now is.
async function assertNoLinks(dir) {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		const stat = await fs.lstat(full);
		if (stat.isSymbolicLink()) throw unsafeBundle("The bundle holds a link, so it was refused.");
		if (stat.isDirectory()) await assertNoLinks(full);
		else if (!stat.isFile()) throw unsafeBundle("The bundle holds a special file, so it was refused.");
	}
}

// The options the bundle carries, limited to the ones the panel knows, with autoStart off (a server doesn't start on its own
// just because it came in a bundle). Folders for backups must be inside the new folder; any that aren't are dropped with a note.
function cleanOptions(raw, dest, fillText, warnings) {
	const out = {};
	if (!isPlain(raw)) raw = {};
	const scalar = (v) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
	for (const key of Object.keys(OPTION_DEFAULTS)) {
		if (key === "backup" || raw[key] === undefined || !scalar(raw[key])) continue;
		out[key] = raw[key];
	}
	out.autoStart = false;

	const backupIn = isPlain(raw.backup) ? raw.backup : {};
	const backup = {};
	for (const key of Object.keys(OPTION_DEFAULTS.backup)) {
		if (key === "paths" || backupIn[key] === undefined || !scalar(backupIn[key])) continue;
		backup[key] = backupIn[key];
	}
	if (Array.isArray(backupIn.paths)) {
		const kept = [];
		let dropped = false;
		for (const item of backupIn.paths) {
			const p = isPlain(item) && typeof item.path === "string" ? fillText(item.path) : null;
			// A backup folder is read in full, so it must be a full path inside the new folder (a path with no drive letter, such as
			// \Users\x, would pass the check above and still point at another folder on the drive).
			if (p === null || leavesFolder(p, dest) || !isInside(p, dest)) {
				dropped = true;
				continue;
			}
			const label = typeof item.label === "string" ? item.label.slice(0, 200) : undefined;
			kept.push({ path: p, ...(label ? { label } : {}) });
		}
		if (dropped) warnings.push("A backup folder that was outside the new server folder was not carried.");
		backup.paths = kept.length ? kept : null;
	}
	out.backup = backup;
	return out;
}

/**
 * Imports a bundle as a new server, in a new folder under `parentDir` (or the panel's servers folder). Returns the server, whether
 * the game is being downloaded in the background, and the warnings. `deps` lets a test stand in for the parts that touch the
 * disk outside the folder, SteamCMD, or the scheduler.
 */
export async function importServer(file, { name: rawName, ports: wantedPorts, parentDir: rawParent, onProgress = () => {} } = {}, deps = {}) {
	const seam = {
		updateServer: realUpdateServer,
		isSteamCmdInstalled: realIsSteamCmdInstalled,
		assertStorageHeadroom: realAssertStorageHeadroom,
		addTask: realAddTask,
		...deps,
	};

	onProgress({ phase: "checking" });
	const { abs, manifest, bytes } = await readBundle(file);
	const template = getTemplate(manifest.game);
	if (template.sharedInstall) {
		throw new BundleError("This game's servers share one install, so only a server in a folder of its own can be imported.", "shared_install");
	}

	const name = String(rawName ?? "").trim();
	if (!name) throw new BundleError("Give the new server a name.", "no_name");
	if (takenByServer(name)) throw new BundleError(`A server named "${name}" already exists.`, "name_taken", 409);

	const suggested = await choosePorts(template, manifest.ports, name);
	const ports = {};
	for (const def of template.ports) {
		ports[def.key] = Number.isInteger(wantedPorts?.[def.key]) ? wantedPorts[def.key] : suggested.ports[def.key];
	}
	try {
		await validateNewServer(template, name, ports, null);
	} catch (err) {
		throw new BundleError(err.message, "bad_ports");
	}

	const parentGiven = typeof rawParent === "string" && rawParent.trim() !== "";
	if (parentGiven) {
		const check = inspectFolder(rawParent.trim());
		if (!check.ok) throw new BundleError(check.errors[0], "bad_folder");
	}
	const parent = path.resolve(parentGiven ? rawParent.trim() : getConfig().paths.serversRoot);
	const slug = slugify(name);
	if (!slug) throw new BundleError("Choose a name with a letter or a number in it.", "bad_name");
	const dest = path.join(parent, slug);
	const relative = path.relative(parent, dest);
	if (!relative || relative.includes(path.sep) || relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new BundleError("Choose a name with a letter or a number in it.", "bad_name");
	}
	if (await fs.stat(dest).then(() => true, () => false)) throw new BundleError(`The folder ${dest} already exists.`, "folder_exists");

	try {
		seam.assertStorageHeadroom(bytes, dest);
	} catch (err) {
		throw new BundleError(err.message, err.code ?? "disk_full", 507);
	}

	// Everything the import makes is recorded here as it is made, newest first, so a failure can take it all back.
	const undo = [];
	const remember = (fn) => undo.unshift(fn);
	const warnings = [];
	try {
		// A parent folder the import had to create goes too, but only while it is empty (rmdir never takes a folder with things in it).
		if (!(await fs.stat(parent).then(() => true, () => false))) {
			await fs.mkdir(parent, { recursive: true });
			remember(() => fs.rmdir(parent).catch(() => {}));
		}
		try {
			await fs.mkdir(dest);
		} catch (err) {
			if (err.code === "EEXIST") throw new BundleError(`The folder ${dest} already exists.`, "folder_exists");
			throw err;
		}
		remember(() => fs.rm(dest, { recursive: true, force: true }));

		onProgress({ phase: "extracting" });
		await extractArchive(abs, dest);
		await fs.rm(path.join(dest, BUNDLE_MANIFEST), { force: true });
		await assertNoLinks(dest);

		// The record is rebuilt from the manifest, never taken as it is: the folder and name are this import's, the passwords are new
		// (unless the bundle carries them), and every string must stay inside the new folder.
		const generated = new Map();
		const newPassword = (field) => {
			if (!generated.has(field)) generated.set(field, randomPassword());
			return generated.get(field);
		};
		const fillText = (text) =>
			text.replace(TOKEN, (whole, key) => {
				if (key === "serverRoot") return dest;
				if (key === "serverName") return name;
				if (key.startsWith("secret:")) return newPassword(key.slice("secret:".length));
				return whole;
			});

		// The bundle's own id, source, name and folder are dropped; the import sets those itself. steamCmdPath is this PC's, as a
		// fresh server of the game gets it, so it is set after the check that the bundle's strings stay in the folder.
		const { id: _id, createdAt: _created, source: _source, autoUpdate: _auto, steamCmdPath: _steam, name: _name, installDir: _dir, ...rest } = manifest.server;
		const filled = mapStrings(rest, fillText);
		if (anyStringLeaves(filled, dest)) throw unsafeBundle("The settings point outside the new folder, so the bundle was refused.");
		const entry = {
			...filled,
			name,
			installDir: dest,
			source: "created",
			autoUpdate: false,
			steamCmdPath: getConfig().paths.steamCmdPath,
		};
		for (const def of template.ports) {
			if (!Number.isInteger(entry[def.key]) && manifest.ports?.[def.key] !== undefined) entry[def.key] = manifest.ports[def.key];
		}

		// The files the record names (and the small text files beside them) get their tokens filled, and the old name in the start
		// script's window title. Each named file must be inside the new folder, or the import is refused.
		const named = [entry.startScriptPath, entry.configPath, ...Object.values(isPlain(entry.configPaths) ? entry.configPaths : {})].filter(
			(p) => typeof p === "string" && p !== "",
		);
		for (const file of named) {
			if (!isInside(file, dest)) throw unsafeBundle("A settings file points outside the new folder, so the bundle was refused.");
		}
		const sourceName = typeof manifest.sourceName === "string" ? manifest.sourceName.trim() : "";
		const sourcePairs = sourceName ? [[`"${sourceName}"`, `"${name}"`]] : [];
		for (const file of await withNeighbours(named.map((p) => path.resolve(p)))) {
			const text = await fs.readFile(file, "utf8").catch(() => null);
			if (text === null) continue;
			const next = rewriteStrings(fillText(text), sourcePairs);
			if (next !== text) await fs.writeFile(file, next, "utf8");
		}

		onProgress({ phase: "registering" });
		await writeMarker(dest, entry);
		const record = await addServer(entry);
		remember(() => removeFromStore(name));

		// Ports: the files and record hold the bundle's; any that differ from the chosen ones are changed everywhere, as a port change
		// does. The port set is checked again there, so a clash found now rolls the import back.
		const have = (await describePorts(record)).current;
		const changes = {};
		for (const def of template.ports) {
			const want = ports[def.key];
			if (have[def.key] !== undefined && have[def.key] !== want) changes[def.key] = want;
		}
		if (Object.keys(changes).length) {
			const result = await applyPorts(getServer(name), changes);
			warnings.push(...(result.warnings ?? []));
		}

		remember(() => forgetOptions(name));
		await setOptions(name, cleanOptions(manifest.options, dest, fillText, warnings));

		remember(() => forgetAutoUpdateSetting(name));
		await setAutoUpdateEnabled(name, manifest.autoUpdate === true);

		// The mod list: a stored entry that the lock refuses is skipped, anything else is a real failure and rolls back.
		const lockFile = modLock.lockFileOf(name);
		const lockBefore = await fs.readFile(lockFile).catch(() => null);
		remember(async () => {
			if (lockBefore === null) await fs.rm(lockFile, { force: true });
			else await fs.writeFile(lockFile, lockBefore);
		});
		let skippedMods = 0;
		for (const mod of manifest.modLock) {
			try {
				await modLock.add(name, mod);
			} catch (err) {
				if (!(err instanceof TypeError)) throw err;
				skippedMods += 1;
			}
		}
		if (skippedMods) warnings.push(`${skippedMods} mod(s) in the bundle's mod list were not valid, so they were skipped.`);

		// The schedules: one that the panel's own rules refuse is skipped; a failure to save one rolls back.
		let skippedTasks = 0;
		for (const task of manifest.schedules) {
			const { id: _i, createdAt: _c, lastRunAt: _l, lastStatus: _s, lastMessage: _m, nextRunAt: _n, running: _r, servers: _sv, ...rest } = task;
			const input = { ...rest, servers: [name] };
			try {
				validateTask(input, [name]);
			} catch {
				skippedTasks += 1;
				continue;
			}
			const made = await seam.addTask(input);
			remember(() => removeTask(made.id));
		}
		if (skippedTasks) warnings.push(`${skippedTasks} schedule(s) could not be set up on the new server, so they were skipped.`);

		// The game itself: a saves bundle has none, so it is downloaded in the background, if SteamCMD is here to do it.
		let installing = false;
		if (manifest.include === "saves") {
			if (seam.isSteamCmdInstalled()) {
				installing = true;
				const starting = (async () => seam.updateServer(getServer(name), { proceedWithoutBackup: true }))();
				starting.catch((err) =>
					logActivity({ type: "server.import_install_failed", server: name, level: "error", message: `Downloading the game for ${name} failed: ${err.message}` }),
				);
			} else {
				warnings.push("SteamCMD isn't installed yet. Download it from Settings, then update the server to fetch the game.");
			}
		}

		if (generated.size) warnings.push(`New passwords were made for: ${[...generated.keys()].join(", ")}.`);
		logActivity({ type: "server.imported", server: name, message: `Imported ${name} (${template.displayName}).`, data: { game: template.id } });
		onProgress({ phase: "done" });
		return { server: getServer(name), installing, warnings: [...warningsFor(manifest), ...warnings] };
	} catch (err) {
		for (const fn of undo) await Promise.resolve().then(fn).catch(() => {});
		forgetIntent(name);
		if (err instanceof BundleError) throw err;
		throw new BundleError(err.message, "import_failed", 500);
	}
}
