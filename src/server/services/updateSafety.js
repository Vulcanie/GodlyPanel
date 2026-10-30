import { getConfig } from "../config/configStore.js";
import { getOptions } from "../data/serverOptions.js";
import { createBackup, restoreBackup, BackupError } from "./backupService.js";
import { serverStatus } from "./pollingService.js";
import { sleep } from "../util/async.js";
import { listHistory, patchRecord } from "./updateHistory.js";
import { logActivity } from "./activityLog.js";
import { isServerRunning } from "./serverState.js";

// Backing up before a game update: a copy of each server's save folders, taken while the server is stopped, so the
// copy is clean. It lives here, not in updateService.js, so the update code can import it without an import cycle.

/**
 * A server's own choice wins; null means "no choice of its own", so the panel-wide setting applies.
 * Only an explicit true counts as on, so a missing or odd value never turns the backup on by accident.
 */
export function beforeUpdateEnabled(serverChoice, panelSetting) {
	return (serverChoice ?? panelSetting) === true;
}

/**
 * Back up each server in the group, one after another. Every server gets its turn even if an earlier one failed, so
 * the caller sees the whole picture. A server with nothing to back up is skipped rather than failed, because the
 * update should still go ahead for it.
 *
 * @param {object[]} group  the servers about to be updated (from getUpdateGroup); they must already be stopped
 * @returns {Promise<{ backupIds: string[], skipped: {name: string, reason: string}[], failed: {name: string, message: string}[] }>}
 */
export async function snapshotBeforeUpdate(group) {
	const backupIds = [];
	// The same ids by server name, so a record of the update can name the backup that belongs to it. A null-prototype map, so a
	// server called "constructor" is just another key.
	const byServer = Object.create(null);
	const skipped = [];
	const failed = [];

	for (const server of group) {
		const enabled = beforeUpdateEnabled(getOptions(server.name).backup.beforeUpdate, getConfig().backups.beforeUpdate);
		if (!enabled) {
			skipped.push({ name: server.name, reason: "backup before update is switched off" });
			continue;
		}
		try {
			const backup = await createBackup(server, { kind: "pre-update", reason: "Before updating the game", mode: "live" });
			backupIds.push(backup.id);
			byServer[server.name] = backup.id;
		} catch (err) {
			// No folders set up, or none on disk yet: nothing to protect, so the update goes on.
			if (err instanceof BackupError && ["no_paths", "nothing_to_back_up"].includes(err.code)) {
				skipped.push({ name: server.name, reason: err.message });
			} else {
				failed.push({ name: server.name, message: err.message });
			}
		}
	}

	return { backupIds, byServer, skipped, failed };
}

/**
 * Waits for a restarted server to report online. Returns "ok" the first time it is seen online, or "failed" when that has not
 * happened by the timeout (the setting, in minutes, unless a timeout is given). Only the first time counts: what happens after
 * that is the crash recovery's job.
 *
 * @returns {Promise<"ok" | "failed">}
 */
export async function watchHealth(server, { timeoutMs = null, pollMs = 1000 } = {}) {
	const limit = timeoutMs ?? getConfig().gameUpdates.healthTimeoutMin * 60_000;
	const deadline = Date.now() + limit;
	while (true) {
		if (serverStatus[server.name]?.online) return "ok";
		if (Date.now() >= deadline) return "failed";
		await sleep(pollMs);
	}
}

// Why the newest update can't be rolled back, as the error to throw, or null when it can. The rollback and the status the panel
// shows both use this, so they always agree.
function rollbackRefusal(record) {
	const refuse = (message, code, status = 409) => Object.assign(new Error(message), { code, status });
	if (!record) return refuse("There is no update to roll back for this server.", "no_update");
	if (record.rolledBackAt) return refuse("That update has already been rolled back.", "already_rolled_back");
	// Without a backup taken before the update there is no copy of the save to go back to.
	if (!record.backupId) return refuse("The panel did not back this server up before that update, so there is nothing to roll back to.", "no_backup");
	// The health watch is still deciding whether the server came back. Restoring files under it now would race that check.
	if (record.outcome === "checking") return refuse("The panel is still waiting to see if the server comes back after the update. Try again in a moment.", "still_checking");
	return null;
}

/**
 * Puts the server's save files back as the newest update found them. Game files (the binaries) are not rolled back; the result says
 * so. Caller holds the server's lock.
 */
export async function rollbackUpdate(server, { restart = false, onReady = null } = {}) {
	const history = await listHistory(server.name);
	const record = history.at(-1) ?? null;
	const refusal = rollbackRefusal(record);
	if (refusal) throw refusal;

	// restoreBackup takes its own safety backup and refuses to run on a running server unless told to restart it, so the server's own
	// rules hold here too.
	const result = await restoreBackup(server, record.backupId, { safety: true, restart, onReady });
	// The restore has already happened, so a failure to note it in the history must not hide the result from the caller.
	try {
		await patchRecord(server.name, record.at, { outcome: "rolled_back", rolledBackAt: new Date().toISOString() });
	} catch (err) {
		console.error(`[update] couldn't record the rollback for ${server.name}:`, err.message);
	}
	logActivity({ type: "update.rolled_back", server: server.name, message: `Rolled ${server.name} back to its backup from before the update. Game files were not rolled back.` });
	return { backupId: record.backupId, ...result, binariesRolledBack: false };
}

/** Whether the newest update can be rolled back right now, and the plain-English reason when it can't. */
export async function rollbackState(server) {
	const history = await listHistory(server.name);
	const record = history.at(-1) ?? null;
	const refusal = rollbackRefusal(record);
	if (refusal) return { available: false, reason: refusal.message, backupId: null };
	if (await isServerRunning(server)) {
		return { available: false, reason: "Stop the server first. Rolling back replaces files the game is using.", backupId: null };
	}
	return { available: true, reason: null, backupId: record.backupId };
}
