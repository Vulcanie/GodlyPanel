import { startServer, stopServer, sendRconCommand } from "./serverControl.js";
import { isServerRunning, isFullyStopped, isProgramAlive } from "./serverState.js";
import { pollServerNow } from "./pollingService.js";
import { getBroadcastCommand } from "./gameCommands.js";
import { sleep } from "../util/async.js";

// Stop, start and restart that wait for the result. The control routes return the
// moment a command has been sent; backups, scheduled restarts and crash recovery
// need to know the server has really gone (or really come up) before the next step.

const STOP_TIMEOUT_MS = 180_000;
const START_TIMEOUT_MS = 300_000;

export async function waitUntilStopped(server, { timeoutMs = STOP_TIMEOUT_MS, everyMs = 2000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await isFullyStopped(server)) return true;
		await sleep(everyMs);
	}
	return isFullyStopped(server);
}

// A program that has been gone for this long after starting isn't loading, it died.
const DEAD_AFTER_MS = 20_000;

export async function waitUntilOnline(server, { timeoutMs = START_TIMEOUT_MS, everyMs = 2000 } = {}) {
	const startedAt = Date.now();
	const deadline = startedAt + timeoutMs;
	let goneInARow = 0;
	while (Date.now() < deadline) {
		const status = await pollServerNow(server.name);
		if (status?.online) return true;
		// Don't hold everything up for minutes waiting on something that has already died.
		goneInARow = (await isProgramAlive(server)) === false ? goneInARow + 1 : 0;
		if (goneInARow >= 2 && Date.now() - startedAt >= DEAD_AFTER_MS) return false;
		await sleep(everyMs);
	}
	return false;
}

/**
 * Stop the server and wait until it has finished. Resolves to whether it had
 * been running; throws if it is still up after the timeout.
 */
export async function stopAndWait(server, { timeoutMs = STOP_TIMEOUT_MS } = {}) {
	const wasRunning = await isServerRunning(server);
	if (!wasRunning) return { wasRunning: false };
	await stopServer(server);
	if (!(await waitUntilStopped(server, { timeoutMs }))) {
		throw new Error(`${server.name} was asked to stop but is still running after ${Math.round(timeoutMs / 1000)}s.`);
	}
	return { wasRunning: true };
}

/** Start the server and wait for it to answer. `online: false` means it never did within the timeout. */
export async function startAndWait(server, { timeoutMs = START_TIMEOUT_MS } = {}) {
	await startServer(server);
	return { online: await waitUntilOnline(server, { timeoutMs }) };
}

/** Tell players in-game, where the game has a broadcast command. Never throws. */
export async function warnPlayers(server, message) {
	if (!server.rconPort || !server.rconPassword) return false;
	const command = getBroadcastCommand(server, message);
	if (!command) return false;
	try {
		await sendRconCommand(server, command);
		return true;
	} catch (err) {
		console.warn(`[lifecycle] Warning to ${server.name} failed: ${err.message}`);
		return false;
	}
}
