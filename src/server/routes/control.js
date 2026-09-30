// Start, stop, update and console: what a moderator may do as well as an admin.
import express from "express";
import { get as getServer } from "../data/serverStore.js";
import { checkProcess } from "../services/processCheck.js";
import { findServerProcesses } from "../services/serverProcesses.js";
import { pollServers, serverStatus } from "../services/pollingService.js";
import { startServer, stopServer, sendRconCommand } from "../services/serverControl.js";
import { updateServer } from "../services/updateService.js";
import { runDetached, currentOperation, cancelOperation, isCancelled, waitUntilIdle } from "../services/serverOps.js";
import { waitUntilStopped, waitUntilOnline, stopAndWait, startAndWait } from "../services/serverLifecycle.js";
import { requirePermission } from "../middleware/permissions.js";
import { resetRecovery } from "../services/crashWatcher.js";
import { isServerRunning } from "../services/serverState.js";

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
				running = (await checkProcess(server.processName, { fresh: true })) && (await findServerProcesses(server)).owned.length > 0;
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
	update: (server) =>
		runDetached(server.name, "updating", async (report) => {
			const started = await updateServer(server, { restart: false });
			report(describeUpdate(server, started, false));
			await started.finished;
		}),
	"update-reboot": (server) =>
		runDetached(server.name, "updating", async (report) => {
			const started = await updateServer(server, { restart: true });
			report(describeUpdate(server, started, true));
			await started.finished;
		}),
};

function describeUpdate(server, { groupNames, logPath }, restart) {
	const who =
		groupNames.length > 1 ? `${groupNames.join(", ")} (shared install)` : server.name;
	const afterward = restart
		? "they'll start back up automatically once the update finishes"
		: "left stopped when it's done";
	return {
		success: true,
		message: `Update${restart ? " + reboot" : ""} started for ${who}. This can take several minutes; ${afterward}. Log: ${logPath}`,
	};
}

// Start, stop, or update a server
router.post("/control/:serverName/:action", (req, res, next) => {
	// Which permission an action needs depends on the action, so it is checked here.
	const needs = { rcon: "server.console", update: "server.update", "update-reboot": "server.update" }[req.params.action] ?? "server.control";
	return requirePermission(needs)(req, res, next);
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

	const run = action === "stopNow" || action === "startNow" ? null : CONTROL_ACTIONS[action];
	if (!run) return res.status(400).json({ error: "Invalid action." });

	try {
		res.json(await run(server));
		pollServers().catch(() => {});
	} catch (e) {
		if (!e.status) console.error(`${action} error for ${server.name}:`, e);
		res.status(e.status ?? 500).json({ error: e.message });
	}
});

export default router;
export { CONTROL_ACTIONS };
