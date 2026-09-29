import os from "node:os";

// Memory and CPU straight from Node. This used to spawn PowerShell on every
// tick to read WMI and a perf counter — a fresh interpreter (~0.8s, tens of MB)
// per poll for two numbers Node already has. os.freemem() matches
// Win32_OperatingSystem's FreePhysicalMemory to within ~0.01 GB, and the CPU
// figure comes from the same kernel tick counters the perf counter reads, so
// the two agree to within a couple of points (measured under load).

function cpuTimes() {
	let idle = 0;
	let total = 0;
	for (const cpu of os.cpus()) {
		const t = cpu.times;
		idle += t.idle;
		total += t.user + t.nice + t.sys + t.idle + t.irq;
	}
	return { idle, total };
}

let previous = cpuTimes();

// Last successful reading, served to clients that connect between poll
// ticks (mirrors serverStatus in pollingService.js).
export let latestStats = null;

/** CPU use since the previous call — so the first reading is since boot-ish. */
function cpuPercentSinceLast() {
	const now = cpuTimes();
	const dTotal = now.total - previous.total;
	const dIdle = now.idle - previous.idle;
	previous = now;
	if (dTotal <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round(100 * (1 - dIdle / dTotal))));
}

export async function getSystemStats() {
	const totalMB = Math.round(os.totalmem() / 1048576);
	const usedMB = totalMB - Math.round(os.freemem() / 1048576);

	latestStats = {
		totalMemMB: totalMB,
		usedMemMB: usedMB,
		usedMemPercent: Math.round((usedMB / totalMB) * 1000) / 10,
		cpuPercent: cpuPercentSinceLast(),
		timestamp: Date.now(),
	};
	return latestStats;
}
