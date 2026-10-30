// Start, stop, update and console: what a moderator may do as well as an admin.
import express from "express";
import { get as getServer } from "../data/serverStore.js";
import { checkProcess } from "../services/processCheck.js";
import { findServerProcesses, ownedProgramRunning } from "../services/serverProcesses.js";
import { pollServers, serverStatus } from "../services/pollingService.js";
import { startServer, stopServer, sendRconCommand } from "../services/serverControl.js";
import { updateServer } from "../services/updateService.js";
import { rollbackUpdate, rollbackState } from "../services/updateSafety.js";
import { runDetached, currentOperation, cancelOperation, isCancelled, waitUntilIdle } from "../services/serverOps.js";
import { waitUntilStopped, waitUntilOnline, stopAndWait, startAndWait } from "../services/serverLifecycle.js";
import { requirePermission } from "../middleware/permissions.js";
import { resetRecovery } from "../services/crashWatcher.js";
import { isServerRunning } from "../services/serverState.js";
import { listHistory } from "../services/updateHistory.js";
import { getConfig } from "../config/configStore.js";

const router = express.Router();

router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

// What each control action does. All but "rcon" refresh the dashboard right
// away instead of leaving it on stale state until the next scheduled poll.
// Each holds the server's lock (see serverOps) until the thing has really finished
// (stopped, online, update done), while answering the request as soon as the
// command has gone out. That is what lets the dashboard say "Stopping..." and
// refuse a second action while one is under way.
const CONTROL_ACTIONS = {
	// Starting again while a start is still being waited on (the server never reported
	// online, or was closed from outside) cancels that wait first, like Stop does.
	start: async (server) => {
		if (currentOperation(server.name) === "starting") {
			cancelOperation(server.name);
			await waitUntilIdle(server.name);
		}
		return CONTROL_ACTIONS.startNow(server);
	},
	startNow: (server) =>
		runDetached(server.name, "starting", async (report) => {
			// A second launch of a running server fails on its ports at best, and at
			// worst leaves two copies fighting over the same save files. The status
			// can be a few seconds old — right after a stop it still says online — so
			// where the process can be checked directly, it is, rather than refusing
			// a start that would be fine.
			let running = Boolean(serverStatus[server.name]?.online);
			if (running && server.method === "process") {
				// A failed lookup counts as running: better to refuse a start that would have been fine than to start a second copy.
				running = (await checkProcess(server.processName, { fresh: true })) && ownedProgramRunning(await findServerProcesses(server));
			}
			if (running) {
				const err = new Error(`${server.name} is already running.`);
				err.status = 409;
				throw err;
			}
			// A server the panel gave up on gets a fresh set of tries once someone starts it.
			resetRecovery(server.name);
			report(await startServer(server));
			await waitUntilOnline(server, { cancelled: () => isCancelled(server.name) });
		}),
	// Stop, wait until it has really gone, start it again. Answers once the stop has
	// been asked for; the rest carries on under the server's lock.
	restart: (server) =>
		runDetached(server.name, "restarting", async (report) => {
			if (!(await isServerRunning(server))) {
				const err = new Error(`${server.name} isn't running, so there is nothing to restart. Use Start.`);
				err.status = 409;
				throw err;
			}
			resetRecovery(server.name);
			report({ success: true, message: `${server.name} is restarting...` });
			await stopAndWait(server);
			await startAndWait(server);
		}),
	// Stop is the one action allowed while a server is still "starting": a server that
	// never reports online (or was started by mistake) must not be unstoppable for the
	// minutes the wait for it lasts. The wait is cancelled, then the stop goes ahead.
	stop: async (server) => {
		if (currentOperation(server.name) === "starting") {
			cancelOperation(server.name);
			await waitUntilIdle(server.name);
		}
		return CONTROL_ACTIONS.stopNow(server);
	},
	stopNow: (server) =>
		runDetached(server.name, "stopping", async (report) => {
			report(await stopServer(server));
			await waitUntilStopped(server).catch(() => {});
		}),
	// The body can ask to go ahead without a backup that failed. Only the literal true counts, so nothing else can switch the safety off.
	update: (server, body = {}) =>
		runDetached(server.name, "updating", async (report) => {
			const started = await updateServer(server, { restart: false, proceedWithoutBackup: body.proceedWithoutBackup === true });
			report(describeUpdate(server, started, false));
			await started.finished;
		}),
	"update-reboot": (server, body = {}) =>
		runDetached(server.name, "updating", async (report) => {
			const started = await updateServer(server, { restart: true, proceedWithoutBackup: body.proceedWithoutBackup === true });
			report(describeUpdate(server, started, true));
			await started.finished;
		}),
};

function describeUpdate(server, { groupNames, logPath, preUpdateBackupIds }, restart) {
	const who =
		groupNames.length > 1 ? `${groupNames.join(", ")} (shared install)` : server.name;
	const afterward = restart
		? "they'll start back up automatically once the update finishes"
		: "left stopped when it's done";
	const backedUp = preUpdateBackupIds.length > 0 ? " Backed up first." : "";
	return {
		success: true,
		message: `Update${restart ? " + reboot" : ""} started for ${who}.${backedUp} This can take several minutes; ${afterward}. Log: ${logPath}`,
	};
}

// Start, stop, or update a server
router.post("/control/:serverName/:action", (req, res, next) => {
	// Which permission an action needs depends on the action, so it is checked here. Own keys only: "constructor" is on every
	// object, and would otherwise be taken for a permission name.
	const special = { rcon: "server.console", update: "server.update", "update-reboot": "server.update" };
	const permissionNeeded = Object.hasOwn(special, req.params.action) ? special[req.params.action] : "server.control";
	return requirePermission(permissionNeeded)(req, res, next);
}, async (req, res) => {
	const { action } = req.params;
	const server = req.server;

	if (action === "rcon") {
		const { command } = req.body || {};
		if (!command || typeof command !== "string") {
			return res.status(400).json({ error: "A command is required." });
		}
		try {
			res.json({ success: true, response: await sendRconCommand(server, command) });
		} catch (e) {
			console.error(`RCON command error for ${server.name}:`, e);
			res.status(500).json({ error: e.message });
		}
		return;
	}

	// Own keys only: CONTROL_ACTIONS["constructor"] is Object, which "runs" by handing the server entry (RCON password and all) back.
	const run = action === "stopNow" || action === "startNow" || !Object.hasOwn(CONTROL_ACTIONS, action) ? null : CONTROL_ACTIONS[action];
	if (!run) return res.status(400).json({ error: "Invalid action." });

	try {
		res.json(await run(server, req.body ?? {}));
		pollServers().catch(() => {});
	} catch (e) {
		if (!e.status) console.error(`${action} error for ${server.name}:`, e);
		// The code lets the UI tell "the backup failed" (and offer to go ahead without one) from any other failure.
		res.status(e.status ?? 500).json({ error: e.message, ...(e.code ? { code: e.code } : {}) });
	}
});

// What the last game updates did to this server: the newest five (newest first), the latest on its own, the health timeout the
// panel is using, and whether the newest update can be rolled back. Its own path, so it cannot be mistaken for an action in the POST
// route above.
router.get("/control/:serverName/update/status", requirePermission("server.update"), async (req, res) => {
	const history = await listHistory(req.server.name);
	res.json({
		history: history.slice(-5).reverse(),
		latest: history.at(-1) ?? null,
		healthTimeoutMin: getConfig().gameUpdates.healthTimeoutMin,
		rollback: await rollbackState(req.server),
	});
});

// Puts the save files back to the backup taken before the newest update. Only a literal true restarts the server afterwards. The
// game files are not rolled back, and the result says so. Its own path with three parts after the server name, so it cannot be read as
// an action in the POST route above.
router.post("/control/:serverName/update/rollback", requirePermission("server.update"), async (req, res) => {
	const restart = req.body?.restart === true;
	try {
		const started = await runDetached(req.server.name, "rolling back", async (report) => {
			const result = await rollbackUpdate(req.server, { restart, onReady: () => report({ started: true }) });
			report({ started: true, ...result });
		});
		res.status(202).json(started);
	} catch (e) {
		if (!e.status) console.error(`rollback error for ${req.server.name}:`, e);
		res.status(e.status ?? 500).json({ error: e.message, ...(e.code ? { code: e.code } : {}) });
	}
});

export default router;
export { CONTROL_ACTIONS };
