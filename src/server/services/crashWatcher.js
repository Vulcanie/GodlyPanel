import { all as allServers } from "../data/serverStore.js";
import { getOptions } from "../data/serverOptions.js";
import { getIntent, intentSince } from "../data/serverIntent.js";
import { getConfig } from "../config/configStore.js";
import { serverStatus } from "./pollingService.js";
import { startServer } from "./serverControl.js";
import { isProgramAlive } from "./serverState.js";
import { currentOperation, runOperation } from "./serverOps.js";
import { logActivity } from "./activityLog.js";
import { initialState, step } from "./crashPolicy.js";
import { sleep } from "../util/async.js";

// Restarts a server that dies while it is meant to be running, for servers that
// have asked for it (autoRestart). Runs every few seconds off the poller's view of
// who is online. The decisions are in crashPolicy.js; this applies them.

const states = new Map(); // server name -> { policy, intentAt, restartedByWatcher }
const PANEL_STARTED = Date.now();

const cfg = () => {
	const r = getConfig().recovery;
	return { graceMs: r.graceSec * 1000, maxRestarts: r.maxRestarts, windowMs: r.windowMin * 60_000, startupGraceMs: r.startupGraceMin * 60_000 };
};

/** What the watcher currently thinks of a server, for the UI. */
export function recoveryState(name) {
	const s = states.get(name)?.policy;
	if (!s) return { gaveUp: false, restartsInWindow: 0, unresponsive: false };
	return { gaveUp: s.gaveUp, restartsInWindow: s.restarts.length, unresponsive: s.unresponsive };
}

/** Forget a server's history, so a manual start gives it a fresh set of tries. */
export function resetRecovery(name) {
	states.delete(name);
}

export async function checkServersOnce(now = Date.now()) {
	for (const server of allServers()) {
		const options = getOptions(server.name);
		if (!options.autoRestart) {
			states.delete(server.name);
			continue;
		}

		let entry = states.get(server.name);
		const at = intentSince(server.name);
		// Someone started or stopped it by hand since we last looked: a clean slate.
		if (!entry || entry.intentAt !== at) {
			// A server started during this session is expected to come up; one that was
			// already meant to be running before the panel started (and may have been
			// down since the PC was off) is not judged until it has been seen online.
			const policy = initialState();
			if (at && at >= PANEL_STARTED) policy.pendingSince = at;
			entry = { policy, intentAt: at, restartedByWatcher: false };
			states.set(server.name, entry);
		}
		if (getIntent(server.name) !== "running") continue;

		// Mid-backup, mid-update, mid-restart: the server being down is expected.
		// When it ends, the server gets the same time to load as a restart would
		// before it is judged.
		if (currentOperation(server.name)) {
			entry.policy = { ...entry.policy, downSince: null, pendingSince: now, unresponsive: false };
			continue;
		}

		const online = serverStatus[server.name]?.online === true;
		const alive = online ? true : await isProgramAlive(server);
		const result = step(entry.policy, { online, alive, now }, cfg());

		if (result.action === "restart" && currentOperation(server.name)) continue;
		entry.policy = result.state;

		switch (result.action) {
			case "recovered":
				// Only worth saying when the panel itself brought it back.
				if (entry.restartedByWatcher) {
					entry.restartedByWatcher = false;
					logActivity({ type: "server.recovered", server: server.name, message: `${server.name} is back online.` });
				}
				break;
			case "unresponsive":
				logActivity({
					type: "server.unresponsive",
					server: server.name,
					level: "warn",
					message: `${server.name} is still running but has stopped answering. It was left alone in case it is saving; stop it from the panel if it doesn't come back.`,
				});
				break;
			case "give_up":
				logActivity({
					type: "server.gave_up",
					server: server.name,
					level: "error",
					message: `${server.name} keeps going down (${cfg().maxRestarts} automatic restarts in ${getConfig().recovery.windowMin} minutes), so the panel has stopped restarting it. Check its log, then start it yourself.`,
				});
				break;
			case "restart":
				entry.restartedByWatcher = true;
				restart(server, result.reason).catch((err) => console.error(`[recovery] ${server.name}:`, err));
				break;
			default:
				break;
		}
	}
}

async function restart(server, reason) {
	logActivity({
		type: "server.crashed",
		server: server.name,
		level: "warn",
		message: reason === "start_timeout" ? `${server.name} didn't come back after its restart.` : `${server.name} went down unexpectedly.`,
	});
	try {
		await runOperation(server.name, "restarting", async () => {
			await startServer(server);
		});
		logActivity({ type: "server.restarted.auto", server: server.name, message: `${server.name} was restarted automatically.` });
	} catch (err) {
		logActivity({ type: "server.restart_failed", server: server.name, level: "error", message: `${server.name} couldn't be restarted: ${err.message}` });
	}
}

/**
 * Start the servers set to start with the panel, spaced out so they don't all load
 * at once. Skips any already running (the panel restarting doesn't stop games).
 */
export async function startAutoStartServers() {
	const delay = getConfig().startup.autoStartDelaySec * 1000;
	let first = true;
	for (const server of allServers()) {
		if (!getOptions(server.name).autoStart) continue;
		if (serverStatus[server.name]?.online) continue;
		if (!first) await sleep(delay);
		first = false;
		try {
			await runOperation(
				server.name,
				"starting",
				async () => {
					await startServer(server);
				},
				{ wait: true },
			);
			logActivity({ type: "server.autostarted", server: server.name, message: `${server.name} was started with the panel.` });
		} catch (err) {
			logActivity({ type: "server.start_failed", server: server.name, level: "error", message: `${server.name} couldn't be started with the panel: ${err.message}` });
		}
	}
}
