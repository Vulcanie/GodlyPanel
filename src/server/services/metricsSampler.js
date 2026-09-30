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

	let stats = [];
	try {
		stats = await getServerStatsIfStale(Math.max(1000, cfg.sampleSec * 1000 - 2000));
	} catch {
		// Same.
	}
	const byName = new Map(stats.map((s) => [s.name, s]));
	for (const server of allServers()) {
		const status = serverStatus[server.name];
		const stat = byName.get(server.name);
		await addSample(`server:${server.name}`, {
			cpu: stat?.cpuPercent ?? 0,
			ramMB: stat?.ramMB ?? 0,
			players: status?.online ? (status.playerCount ?? 0) : 0,
			up: status?.online ? 1 : 0,
		});
	}
}
