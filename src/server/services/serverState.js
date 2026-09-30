import { serverStatus } from "./pollingService.js";
import { checkProcess } from "./processCheck.js";
import { getRecordedPid } from "./windowlessLauncher.js";

/**
 * Is this server running right now? Used before anything that mustn't happen to
 * a live server: changing its ports (a running game keeps the old ones until it
 * restarts) and deleting it.
 *
 * The polled status can be a few seconds old, so where the process can be looked
 * at directly it is; and a server the panel launched itself is also caught by
 * its recorded process id.
 */
export async function isServerRunning(server) {
	let running = Boolean(serverStatus[server.name]?.online);
	if (running && server.method === "process") {
		running = await checkProcess(server.processName, { fresh: true });
	}
	if (!running) running = Boolean(await getRecordedPid(server));
	return running;
}
