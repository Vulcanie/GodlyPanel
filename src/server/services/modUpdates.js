import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ModError, modInstallContext, modsFolderOf, removeMod, setModEnabled } from "./modService.js";
import * as modLock from "./modLock.js";
import { getProvider } from "./modSources/index.js";
import { installFromSource } from "./modSources/installer.js";
import { recordInstalled } from "./modRecord.js";

// Checking the mods in the lock for newer versions, and updating one of them. A check only asks the source what is newest; nothing is
// downloaded or written. An update is an explicit call for one lock entry. It stages the old mod's files outside the game folders,
// removes them, installs the new version, and puts the staged files back if anything fails. So a failed update leaves the old mod as it was.

const MAX_CHECKED = 50;
const CHECK_AT_ONCE = 3;
const DISABLED = ".disabled";

const manualUpdate = () => new ModError("This mod can't be updated from the panel. Update it by hand.", "manual_update", 409);

// A source whose entries are never checked here: a direct link has nothing to ask, and a Workshop item is updated by SteamCMD.
const isManual = (entry) => entry.source === "url" || entry.source === "workshop";

// The entry's ref with any "@pin" taken off, so the source is asked for its newest version rather than the pinned one.
function unpinnedRef(entry) {
	const at = entry.ref.indexOf("@");
	return at === -1 ? entry.ref : entry.ref.slice(0, at);
}

/**
 * The newest version a source has for an entry, as the provider's resolve reports it. Null for a source that can't be asked, or whose
 * answer needs a choice a person has to make (choose_asset). Anything else a resolve throws goes up unchanged.
 */
async function latestOf(entry, ctx) {
	if (isManual(entry)) return null;
	const provider = getProvider(entry.source);
	if (typeof provider?.resolve !== "function") return null;
	try {
		const resolved = await provider.resolve(unpinnedRef(entry), ctx);
		if (typeof resolved?.version !== "string" || resolved.version === "") {
			throw new ModError("Couldn't check this mod.", "check_failed", 502);
		}
		return resolved;
	} catch (err) {
		if (err instanceof ModError && err.code === "choose_asset") return null;
		throw err;
	}
}

// What a check shows of one failure. Only a ModError's own code and message are passed on: anything else may carry a path or a stack.
const errorOf = (err) => (err instanceof ModError ? { code: err.code, message: err.message } : { code: "check_failed", message: "Couldn't check this mod." });

// Runs fn over items, with at most `limit` running at once. Results keep the order of the items.
async function mapLimited(items, limit, fn) {
	const out = new Array(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const i = next;
			next += 1;
			out[i] = await fn(items[i]);
		}
	});
	await Promise.all(workers);
	return out;
}

async function checkOne(entry, ctx) {
	const row = {
		id: entry.id,
		name: entry.names[0] ?? entry.ref,
		source: entry.source,
		ref: entry.ref,
		current: entry.version,
		dependency: entry.dependencyOf.length > 0,
	};
	try {
		const resolved = await latestOf(entry, ctx);
		if (!resolved) return { ...row, latest: null, status: "manual" };
		return { ...row, latest: resolved.version, status: resolved.version === entry.version ? "current" : "update" };
	} catch (err) {
		return { ...row, latest: null, status: "error", error: errorOf(err) };
	}
}

/**
 * What each mod in the lock could be updated to. One row per entry (at most 50), with its status: "update", "current", "manual" (it
 * can't be asked, or the source needs a choice), or "error" with a code and message. Nothing is downloaded and nothing is written.
 */
export async function checkUpdates(server) {
	const { mods } = await modLock.read(server.name);
	const ctx = await modInstallContext(server);
	return mapLimited(mods.slice(0, MAX_CHECKED), CHECK_AT_ONCE, (entry) => checkOne(entry, ctx));
}

// Whether a path exists at all, a file or a folder. A name that is a link to nothing counts as there, since the copy would fail on it.
const present = (p) => fsp.lstat(p).then(() => true, () => false);

// Removes a name and its turned-off form from the folder. Only ever called with names that passed isSafeName.
async function forgetFiles(dir, names) {
	for (const name of names) {
		await fsp.rm(path.join(dir, name), { recursive: true, force: true }).catch(() => {});
		await fsp.rm(path.join(dir, `${name}${DISABLED}`), { recursive: true, force: true }).catch(() => {});
	}
}

/**
 * Updates one mod in the lock to the newest version its source has. Refused for a direct link, a mod already on its newest version, or
 * a lock record that doesn't hold safe names. If the new version can't be installed, the old files go back as they were and the lock
 * is unchanged.
 */
export async function applyUpdate(server, id) {
	const { mods: before } = await modLock.read(server.name);
	const entry = before.find((m) => m.id === id);
	if (!entry) throw new ModError("That mod isn't in the lock, so it can't be updated.", "not_found", 404);

	const ctx = await modInstallContext(server);
	const resolved = await latestOf(entry, ctx);
	if (!resolved) throw manualUpdate();
	if (resolved.version === entry.version) throw new ModError("This mod is already up to date.", "up_to_date", 409);

	// The names in the record are the only paths this update will touch, so each one has to be a plain name before anything is joined to the folder.
	if (!entry.names.every(modLock.isSafeName)) {
		throw new ModError("The mod lock's record of this mod is damaged, so it wasn't updated.", "lock_damaged", 409);
	}
	const dir = modsFolderOf(server);
	if (!dir) throw new ModError("This game's mods can't be updated from the panel.", "unsupported");

	// The old mod's files on disk, under the name each one has now (a turned-off mod has ".disabled" added).
	const oldNames = [];
	for (const name of entry.names) {
		for (const form of [name, `${name}${DISABLED}`]) {
			if (await present(path.join(dir, form))) oldNames.push(form);
		}
	}
	const wasOff = oldNames.some((n) => n.endsWith(DISABLED));
	const ref = unpinnedRef(entry);
	const stage = await fsp.mkdtemp(path.join(os.tmpdir(), "ghp-modupd-"));
	// Set once the old files start to come out of the folder. Before that, nothing on disk has changed, so there is nothing to put back.
	let started = false;
	let result = null;
	try {
		for (const name of oldNames) {
			await fsp.cp(path.join(dir, name), path.join(stage, name), { recursive: true, verbatimSymlinks: true });
		}
		started = true;
		for (const name of oldNames) await removeMod(server, name);

		result = await installFromSource(server, entry.source, ref, { ...ctx, skipInstalled: true });
		await recordInstalled(server, dir, result);
		// The mod's own files are the last entry of the install: its dependencies come before it.
		if (wasOff) {
			for (const name of result.mods[result.mods.length - 1].installed) await setModEnabled(server, name, false);
		}
		return {
			updated: { id: entry.id, from: entry.version, to: resolved.version },
			installed: result.installed,
			unverified: result.unverified,
			skipped: result.skipped,
		};
	} catch (err) {
		if (started) {
			// Take out what the new install left, then put the staged files back under the names they had.
			for (const name of result?.installed ?? []) {
				if (modLock.isSafeName(name)) await forgetFiles(dir, [name]);
			}
			await forgetFiles(dir, oldNames);
			for (const name of oldNames) {
				await fsp.cp(path.join(stage, name), path.join(dir, name), { recursive: true, verbatimSymlinks: true });
			}
			await modLock.restore(server.name, before).catch((restoreErr) => console.error("Putting the mod lock back failed:", restoreErr));
		}
		throw err;
	} finally {
		await fsp.rm(stage, { recursive: true, force: true }).catch(() => {});
	}
}
