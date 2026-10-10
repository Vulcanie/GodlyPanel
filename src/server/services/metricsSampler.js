import { all as allServers } from "../data/serverStore.js";
import { getConfig } from "../config/configStore.js";
import { getSystemStats } from "./systemStats.js";
import { getServerStatsIfStale } from "./serverResourceStats.js";
import { serverStatus } from "./pollingService.js";
import { addSample } from "./metrics.js";

/** Take one reading of the PC and of every server, for the history charts. */
export async function sampleOnce() {
	const cfg = getConfig().metrics;
	if (!cfg.enabled) return;

	try {
		const sys = await getSystemStats();
		if (sys) await addSample("system", { cpu: sys.cpuPercent, ramMB: sys.usedMemMB, ramPercent: sys.usedMemPercent });
	} catch {
		// A missed reading is a gap in a chart, nothing more.
	}

	// null: the lookup failed (it can, on a PC that is struggling). That is not the same as "nothing is using any memory", so the
	// readings are left out of that sample rather than recorded as 0, which would put a false dip in the chart.
	let stats = null;
	try {
		stats = await getServerStatsIfStale(Math.max(1000, cfg.sampleSec * 1000 - 2000));
	} catch {
		// Same.
	}
	const byName = new Map((stats ?? []).map((s) => [s.name, s]));
	for (const server of allServers()) {
		const status = serverStatus[server.name];
		const stat = byName.get(server.name);
		const online = Boolean(status?.online);
		// Use is known when the lookup worked and found the game, or worked and found it isn't running. A game that is up but wasn't
		// found among the processes is unknown too.
		const known = stats !== null && (stat !== undefined || !online);
		await addSample(`server:${server.name}`, {
			...(known ? { cpu: stat?.cpuPercent ?? 0, ramMB: stat?.ramMB ?? 0 } : {}),
			players: online ? (status.playerCount ?? 0) : 0,
			up: online ? 1 : 0,
		});
	}
}
