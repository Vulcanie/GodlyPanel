import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { all as allServers } from "../data/serverStore.js";
import { paths } from "../paths.js";
import { trackSteamCmd, untrackSteamCmd } from "./processRegistry.js";
import { existsSync } from "fs";
import { resolveSteamCmdFor } from "./steamCmdProvisioner.js";
import { sleep } from "../util/async.js";
import { steamBranchArgs, steamModArgs } from "../util/steamBranch.js";
import { serverStatus } from "./pollingService.js";
import { stopServer, startServer } from "./serverControl.js";
import { snapshotBeforeUpdate, watchHealth } from "./updateSafety.js";
import { logActivity } from "./activityLog.js";
import { readInstalledBuild } from "./buildTracker.js";
import { addRecord, patchRecord } from "./updateHistory.js";
import { getConfig } from "../config/configStore.js";

const WAIT_TIMEOUT_MS = 90000;
const POLL_INTERVAL_MS = 2000;

// One history record per server in the group, written once SteamCMD has finished. A server being restarted is "checking" until
// the health watch settles it. The history is a record of the update, not part of it, so a failure here is logged and passed over.
async function recordUpdate(group, { at, fromBuilds, byServer, checking }) {
	for (const s of group) {
		try {
			await addRecord(s.name, {
				at,
				fromBuild: fromBuilds.get(s.name) ?? null,
				toBuild: await readInstalledBuild(s),
				branch: s.updateBranch ?? null,
				backupId: byServer[s.name] ?? null,
				outcome: checking.has(s.name) ? "checking" : "updated",
			});
		} catch (e) {
			console.error(`[update] couldn't record the update history for ${s.name}:`, e.message);
		}
	}
}

// Watches the servers restarted after an update, in the background, and says how each one turned out. The update itself has already
// finished by now, so a server that never comes back does not hold up Stop. A server that could not be started at all is failed at once.
function watchRestarted(restartTargets, { at, startErrors }) {
	void (async () => {
		await Promise.all(
			restartTargets.map(async (s) => {
				const minutes = getConfig().gameUpdates.healthTimeoutMin;
				let outcome;
				let failure;
				if (startErrors.has(s.name)) {
					outcome = "failed";
					failure = `${s.name} couldn't be started after the update (${startErrors.get(s.name)}). Open its Logs tab, and the Update panel to roll back.`;
				} else {
					outcome = await watchHealth(s);
					failure = `${s.name} did not come back online within ${minutes} minutes after the update. Open its Logs tab, and the Update panel to roll back.`;
				}
				try {
					await patchRecord(s.name, at, { outcome });
				} catch (e) {
					console.error(`[update] couldn't record the outcome for ${s.name}:`, e.message);
				}
				if (outcome === "failed") {
					logActivity({ type: "update.failed", server: s.name, level: "error", message: failure });
				} else {
					logActivity({ type: "update.verified", server: s.name, message: `${s.name} is back online after the update.` });
				}
			}),
		);
	})().catch((e) => console.error("[update] the health check failed:", e.message));
}

// ARK's SA servers all run out of one shared install directory, so updating
// any one of them requires stopping every sibling first (updating shared
// files under a still-running server risks corrupting it). Siblings are
// found by matching installDir rather than a hardcoded list, so this stays
// correct if more ARK maps are added later.
export function getUpdateGroup(server) {
	if (server.type === "ark") {
		return allServers().filter(
			(s) => s.type === "ark" && s.installDir === server.installDir,
		);
	}
	return [server];
}

async function waitUntilStopped(names) {
	const deadline = Date.now() + WAIT_TIMEOUT_MS;
	let stillOnline = names;

	while (Date.now() < deadline) {
		stillOnline = names.filter((n) => serverStatus[n]?.online);
		if (stillOnline.length === 0) return { success: true };
		await sleep(POLL_INTERVAL_MS);
	}

	stillOnline = names.filter((n) => serverStatus[n]?.online);
	return { success: stillOnline.length === 0, stillOnline };
}

export async function updateServer(
	server,
	{ restart = false, serversToRestart = null, proceedWithoutBackup = false } = {},
) {
	if (!server.updateAppId) {
		throw new Error(`No update is configured for ${server.name}.`);
	}

	// Checked before anything is stopped. This used to find out only when spawn()
	// failed — after the servers were already down, and as an 'error' event with
	// no listener, which is fatal to the whole process.
	const steamCmd = resolveSteamCmdFor(server.steamCmdPath);
	if (!existsSync(steamCmd)) {
		throw new Error(
			"SteamCMD isn't installed yet, so nothing was stopped. Download it from Settings first.",
		);
	}

	const group = getUpdateGroup(server);
	const groupNames = group.map((s) => s.name);

	// Who to bring back after the update: whatever in the group was actually
	// running right before this call, captured now so the stop step below
	// doesn't erase the evidence. A shared ARK install can have some maps up
	// and others deliberately left off — restarting the whole group
	// regardless would resurrect maps nobody asked to be running. Callers
	// that want different behavior can still pass serversToRestart directly.
	const restartTargets =
		serversToRestart ?? group.filter((s) => serverStatus[s.name]?.online);
	// What was actually running, so a failed backup can put things back as they were. Unlike restartTargets, a caller can't override this.
	const wereRunning = group.filter((s) => serverStatus[s.name]?.online);

	await Promise.all(
		group.map((s) => (serverStatus[s.name]?.online ? stopServer(s) : null)),
	);

	const { success, stillOnline } = await waitUntilStopped(groupNames);
	if (!success) {
		throw new Error(
			`Timed out waiting for ${stillOnline.join(", ")} to stop. Update aborted — nothing was run.`,
		);
	}

	// Backed up now, while every server in the group is stopped, so the copy can't catch a save mid-write. A failed backup stops
	// the update unless the caller said to go ahead anyway; the servers that were running are started again first.
	const snap = await snapshotBeforeUpdate(group);
	if (snap.failed.length > 0) {
		const names = snap.failed.map((f) => f.name).join(", ");
		const firstMessage = snap.failed[0].message;
		logActivity({ type: "update.backup_failed", server: server.name, level: "error", message: `Backup before the update failed for ${names}: ${firstMessage}` });
		if (!proceedWithoutBackup) {
			for (const s of wereRunning) {
				try {
					await startServer(s);
				} catch (e) {
					console.error(`[update] couldn't start ${s.name} after the backup failed:`, e.message);
				}
			}
			const err = new Error(`Backup before the update failed for ${names} (${firstMessage}), so the update was not run. Servers that were running have been started again.`);
			err.status = 409;
			err.code = "backup_failed";
			throw err;
		}
		logActivity({ type: "update.backup_skipped", server: server.name, level: "warn", message: `Updating ${names} without a backup, as asked: ${firstMessage}` });
	}

	// The build each server is on before anything changes, so the history can say what the update moved it from. A shared ARK install
	// gives the same answer for each map, but reading each one keeps this from depending on that.
	const fromBuilds = new Map();
	for (const s of group) fromBuilds.set(s.name, await readInstalledBuild(s));
	const at = new Date().toISOString();

	const logDir = paths.updateLogsDir;
	await fs.mkdir(logDir, { recursive: true });
	const logPath = path.join(
		logDir,
		`${server.name.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.log`,
	);
	const logFd = await fs.open(logPath, "a");
	const logStream = logFd.createWriteStream();

	const args = [
		...(server.installDir ? ["+force_install_dir", server.installDir] : []),
		"+login",
		"anonymous",
		...steamModArgs(server.updateAppId, server.updateMod),
		"+app_update",
		String(server.updateAppId),
		...steamBranchArgs(server.updateBranch),
		"validate",
		"+quit",
	];

	// Written into the log, so someone reading it later can see why a server had no backup before the update.
	for (const s of snap.skipped) {
		logStream.write(`[backup] ${s.name} not backed up before the update: ${s.reason}\n`);
	}

	const child = spawn(steamCmd, args, {
		detached: true,
		windowsHide: true,
		stdio: ["ignore", logStream, logStream],
	});
	trackSteamCmd(child.pid);
	child.on("error", (err) => {
		finish?.();
		untrackSteamCmd(child.pid);
		logStream.end(`
Could not run SteamCMD: ${err.message}
`);
		console.error(`[update] SteamCMD failed to start for ${server.name}:`, err.message);
	});
	child.on("exit", () => untrackSteamCmd(child.pid));

	// Settles when SteamCMD has finished and, for update-and-reboot, the servers have
	// been started again, so callers can hold the server's lock until then.
	let finish;
	const finished = new Promise((resolve) => (finish = resolve));

	if (restart) {
		// Stay attached so this handler survives to see steamcmd finish —
		// don't unref(). The API process itself needs to stay up for the
		// whole update for this to fire; if it gets bounced mid-update, the
		// servers will come back updated but won't auto-start.
		child.on("exit", async (code) => {
			logStream.write(`\n[update-and-reboot] steamcmd exited with code ${code}\n`);
			// Recorded before anything is started, so the health check below always finds a record to settle.
			await recordUpdate(group, { at, fromBuilds, byServer: snap.byServer, checking: new Set(restartTargets.map((s) => s.name)) });

			// SteamCMD reports a non-zero exit after a self-update relaunch even
			// when the install itself succeeded (the creation flow documents the
			// same quirk). Skipping the restart on that left servers stopped after
			// a perfectly good update, which is the worse failure — so bring them
			// back regardless, and say what the code was.
			if (code !== 0) {
				logStream.write(`[update-and-reboot] non-zero exit (${code}); restarting anyway.
`);
				console.warn(`[update-and-reboot] steamcmd exited ${code} for ${server.name}; restarting anyway.`);
			}

			const startErrors = new Map();
			for (const s of restartTargets) {
				try {
					await startServer(s);
					logStream.write(`[update-and-reboot] started ${s.name}\n`);
				} catch (e) {
					startErrors.set(s.name, e.message);
					logStream.write(
						`[update-and-reboot] failed to start ${s.name}: ${e.message}\n`,
					);
					console.error(
						`[update-and-reboot] failed to start ${s.name}:`,
						e.message,
					);
				}
			}
			logStream.end();
			finish();
			// After finish(), so the server's lock is already free while the health check runs in the background.
			watchRestarted(restartTargets, { at, startErrors });
		});
	} else {
		child.on("exit", async () => {
			await recordUpdate(group, { at, fromBuilds, byServer: snap.byServer, checking: new Set() });
			logStream.end();
			finish();
		});
		child.unref();
	}

	return { groupNames, logPath, restart, finished, preUpdateBackupIds: snap.backupIds, backupSkipped: snap.skipped };
}
