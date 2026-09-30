import { serverStatus, pollServerNow } from "./pollingService.js";
import { checkProcess } from "./processCheck.js";
import { getRecordedPid } from "./windowlessLauncher.js";

// Every Minecraft server is "java.exe", so the image name says nothing about
// which server is running.
const SHARED_PROGRAM = /^javaw?(\.exe)?$/i;

/**
 * Is this server running right now? Used before anything that mustn't happen to
 * a live server: changing its ports (a running game keeps the old ones until it
 * restarts) and deleting it.
 *
 * The polled status can be a few seconds old, so where the process can be
 * looked at directly it is; and a server the panel launched itself is also
 * caught by its recorded process id.
 */
export async function isServerRunning(server) {
	let running = Boolean(serverStatus[server.name]?.online);
	if (running && server.method === "process") {
		running = await checkProcess(server.processName, { fresh: true });
	}
	if (!running) running = Boolean(await getRecordedPid(server));
	return running;
}

/**
 * Has this server really finished stopping? Stricter than "not running": for
 * waiting on a stop before copying its files or starting it again, where
 * a game still writing its save is as bad as one that is still up. Looks at the
 * process itself where its name identifies the server, and otherwise at a fresh
 * poll rather than the last cycle's.
 */
export async function isFullyStopped(server) {
	if (await getRecordedPid(server)) return false;
	if (server.processName && !SHARED_PROGRAM.test(server.processName)) {
		return !(await checkProcess(server.processName, { fresh: true }));
	}
	const status = await pollServerNow(server.name);
	return !status?.online;
}
