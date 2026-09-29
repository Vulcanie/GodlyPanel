import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { all as allServers } from "../data/serverStore.js";
import { paths } from "../paths.js";
import { trackSteamCmd, untrackSteamCmd } from "./processRegistry.js";
import { serverStatus } from "./pollingService.js";
import { stopServer, startServer } from "./serverControl.js";

const WAIT_TIMEOUT_MS = 90000;
const POLL_INTERVAL_MS = 2000;

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

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
	{ restart = false, serversToRestart = null } = {},
) {
	if (!server.updateAppId) {
		throw new Error(`No update is configured for ${server.name}.`);
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

	await Promise.all(
		group.map((s) => (serverStatus[s.name]?.online ? stopServer(s) : null)),
	);

	const { success, stillOnline } = await waitUntilStopped(groupNames);
	if (!success) {
		throw new Error(
			`Timed out waiting for ${stillOnline.join(", ")} to stop. Update aborted — nothing was run.`,
		);
	}

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
		"+app_update",
		String(server.updateAppId),
		"validate",
		"+quit",
	];

	const child = spawn(server.steamCmdPath, args, {
		detached: true,
		windowsHide: true,
		stdio: ["ignore", logStream, logStream],
	});
	trackSteamCmd(child.pid);
	child.on("exit", () => untrackSteamCmd(child.pid));

	if (restart) {
		// Stay attached so this handler survives to see steamcmd finish —
		// don't unref(). The API process itself needs to stay up for the
		// whole update for this to fire; if it gets bounced mid-update, the
		// servers will come back updated but won't auto-start.
		child.on("exit", async (code) => {
			logStream.write(`\n[update-and-reboot] steamcmd exited with code ${code}\n`);

			if (code !== 0) {
				console.error(
					`[update-and-reboot] steamcmd failed for ${server.name} (exit ${code}) — not restarting.`,
				);
				logStream.end();
				return;
			}

			for (const s of restartTargets) {
				try {
					await startServer(s);
					logStream.write(`[update-and-reboot] started ${s.name}\n`);
				} catch (e) {
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
		});
	} else {
		child.unref();
	}

	return { groupNames, logPath, restart };
}
