import { exec } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { all as allServers } from "../data/serverStore.js";
import { resolveResource } from "../../shared/resources.js";
import { getConfig } from "../config/configStore.js";

const SAMPLE_SCRIPT = resolveResource("scripts/process-resource-sample.ps1");

// Last successful reading, served to clients that connect between poll
// ticks (mirrors latestStats in systemStats.js).
export let latestServerStats = [];

function runSampleScript() {
	return new Promise((resolve, reject) => {
		exec(
			`powershell -NoProfile -ExecutionPolicy Bypass -File "${SAMPLE_SCRIPT}"`,
			{ windowsHide: true, timeout: 8000, maxBuffer: 10 * 1024 * 1024 },
			(error, stdout) => {
				if (error) return reject(error);
				try {
					resolve(JSON.parse(stdout));
				} catch (e) {
					reject(new Error(`Failed to parse process sample: ${e.message}`));
				}
			},
		);
	});
}

// Every Minecraft server here launches as a plain "java" (or a specific
// JDK's java.exe) process running ServerPackCreator's generic
// "server.jar --installer-force --installer <loader version> nogui" line
// (Fabric packs differ enough to already be unique — see below). Two of
// these can be running at once with otherwise-identical command lines,
// so the loader version — read live from each server's own variables.txt
// — is the only thing that tells them apart.
function readNeoForgeLoaderVersion(server) {
	if (!server.workingDir) return null;
	try {
		const contents = readFileSync(
			path.join(server.workingDir, "variables.txt"),
			"utf8",
		);
		const match = contents.match(/^MODLOADER_VERSION=(.+)$/m);
		return match ? match[1].trim() : null;
	} catch {
		return null;
	}
}

function isFabricServer(server) {
	if (!server.startScriptPath) return false;
	try {
		const contents = readFileSync(server.startScriptPath, "utf8");
		return /fabric-server-launcher/i.test(contents);
	} catch {
		return false;
	}
}

// Returns true if `proc`'s command line is the one belonging to `server`.
function isMatchForMinecraft(server, proc) {
	const cmd = proc.CommandLine || "";
	if (!/java/i.test(proc.Name) || !/server\.jar|fabric-server-launcher/i.test(cmd)) {
		return false;
	}
	if (/fabric-server-launcher/i.test(cmd)) {
		// Fabric packs use their own launcher jar — check whether *this*
		// server's own start.bat is the one that launches it, rather than
		// guessing from its name/path. Only Fabulously Optimized does today.
		// The command line itself has nothing server-specific in it (unlike
		// NeoForge's --installer version or ARK's -RCONPort), so if a second
		// Fabric server is ever added, both would match here — revisit then.
		return isFabricServer(server);
	}
	const loaderVersion = readNeoForgeLoaderVersion(server);
	return loaderVersion ? cmd.includes(`--installer ${loaderVersion}`) : false;
}

// ARK maps all run "ArkAscendedServer.exe" (ASA) or "ShooterGameServer.exe"
// (ASE) — identical names across every map. The -RCONPort=NNNN launch
// argument is the one thing unique to each server's config.
function isMatchForArk(server, proc) {
	if (!/^(ArkAscendedServer|ShooterGameServer)(#\d+)?$/i.test(proc.Name)) {
		return false;
	}
	const cmd = proc.CommandLine || "";
	return server.rconPort && cmd.includes(`-RCONPort=${server.rconPort}`);
}

// Every other server type here has a processName that's already unique on
// this machine, so a name match alone is enough. WMI's perf class
// suffixes duplicates as "Name#1", "Name#2", ... so strip that off before
// comparing. (These servers only ever run one instance each, so if two
// processes both match, something's wrong upstream, not here.)
function isMatchForProcessName(server, proc) {
	if (!server.processName) return false;
	const baseName = server.processName.replace(/\.exe$/i, "");
	const procBaseName = proc.Name.replace(/#\d+$/, "");
	return procBaseName.toLowerCase() === baseName.toLowerCase();
}

function findMatches(server, processes) {
	if (server.type === "minecraft") {
		return processes.filter((p) => isMatchForMinecraft(server, p));
	}
	if (server.type === "ark") {
		return processes.filter((p) => isMatchForArk(server, p));
	}
	if (server.processName) {
		return processes.filter((p) => isMatchForProcessName(server, p));
	}
	return [];
}

// Parses `jcmd <pid> GC.heap_info` output. Handles ZGC's single-line format
// ("used 18754M, capacity 19620M, max capacity 20480M" — what every
// Minecraft server here runs today) and tolerates K/M/G units in case a
// server ever switches GC. Returns null on anything unexpected rather than
// throwing, since this is a best-effort supplemental stat.
function parseHeapInfo(output) {
	const match = output.match(
		/used\s+(\d+)([KMG]),\s*capacity\s+(\d+)([KMG]).*?max capacity\s+(\d+)([KMG])/is,
	);
	if (!match) return null;

	const toMB = (num, unit) => {
		const n = Number(num);
		if (unit === "K") return n / 1024;
		if (unit === "G") return n * 1024;
		return n;
	};

	const usedMB = toMB(match[1], match[2].toUpperCase());
	const maxMB = toMB(match[5], match[6].toUpperCase());
	if (!maxMB) return null;

	return {
		heapUsedMB: Math.round(usedMB),
		heapMaxMB: Math.round(maxMB),
		heapPercent: Math.round((usedMB / maxMB) * 1000) / 10,
	};
}

function getHeapInfo(pid) {
	// jcmd ships with a JDK, which plenty of machines won't have — the path is
	// configurable, and a failure here just means no heap bar rather than an error.
	const jcmd = getConfig().paths.jcmdPath || "jcmd";
	return new Promise((resolve) => {
		exec(
			`"${jcmd}" ${pid} GC.heap_info`,
			{ windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 },
			(error, stdout) => {
				if (error) return resolve(null);
				resolve(parseHeapInfo(stdout));
			},
		);
	});
}

export async function getServerResourceStats() {
	const processes = await runSampleScript();

	const stats = await Promise.all(
		allServers().map(async (server) => {
			const matches = findMatches(server, processes);
			if (matches.length === 0) {
				return { name: server.name, running: false, cpuPercent: 0, ramMB: 0 };
			}
			// Sum in the (should-be-rare) case a server legitimately spans more
			// than one process.
			const cpuPercent = matches.reduce((sum, p) => sum + p.CpuPercent, 0);
			const ramMB = matches.reduce((sum, p) => sum + p.RamMB, 0);
			const result = {
				name: server.name,
				running: true,
				cpuPercent: Math.round(cpuPercent * 10) / 10,
				ramMB: Math.round(ramMB),
			};

			if (server.type === "minecraft" && getConfig().polling.enableHeapStats) {
				const heapInfo = await getHeapInfo(matches[0].ProcessId);
				if (heapInfo) Object.assign(result, heapInfo);
			}

			return result;
		}),
	);

	latestServerStats = stats;
	return stats;
}
