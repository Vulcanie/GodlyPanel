import { getConfig } from "../config/configStore.js";
import { getOptions } from "../data/serverOptions.js";
import { createBackup, BackupError } from "./backupService.js";

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
		} catch (err) {
			// No folders set up, or none on disk yet: nothing to protect, so the update goes on.
			if (err instanceof BackupError && ["no_paths", "nothing_to_back_up"].includes(err.code)) {
				skipped.push({ name: server.name, reason: err.message });
			} else {
				failed.push({ name: server.name, message: err.message });
			}
		}
	}

	return { backupIds, skipped, failed };
}
