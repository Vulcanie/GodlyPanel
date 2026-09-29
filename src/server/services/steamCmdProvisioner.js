import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { getConfig } from "../config/configStore.js";

// Pinned in code rather than config: it's the official distribution point, and
// a settable download URL in an admin tool is an obvious footgun.
const STEAMCMD_ZIP_URL = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";

let inFlight = null;

async function download(url) {
	const res = await fetch(url, { redirect: "follow" });
	if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

async function installSteamCmd(targetExe, log) {
	const dir = path.dirname(targetExe);
	await fs.mkdir(dir, { recursive: true });

	log(`Downloading SteamCMD from Valve (${STEAMCMD_ZIP_URL})...`);
	const buffer = await download(STEAMCMD_ZIP_URL);

	// Sanity-check before trusting it: a captive portal or an error page would
	// otherwise get written to disk and fail much later, much more confusingly.
	if (buffer.length < 1024 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
		throw new Error("Downloaded file is not a zip archive.");
	}

	const zip = new AdmZip(buffer);
	const hasExe = zip
		.getEntries()
		.some((e) => e.entryName.toLowerCase() === "steamcmd.exe");
	if (!hasExe) throw new Error("Archive did not contain steamcmd.exe.");

	zip.extractAllTo(dir, true);
	if (!existsSync(targetExe)) {
		throw new Error(`Extraction did not produce ${targetExe}.`);
	}

	// First run bootstraps itself (pulls down the rest of the client). Doing it
	// now, with output in the job log, beats it happening silently inside the
	// first real install where it looks like a hang.
	log("Running SteamCMD once to let it self-update (this takes a minute)...");
	await new Promise((resolve) => {
		const child = spawn(targetExe, ["+quit"], { windowsHide: true });
		child.stdout?.on("data", (d) => log(d.toString().trimEnd()));
		child.stderr?.on("data", (d) => log(d.toString().trimEnd()));
		child.on("error", resolve);
		child.on("exit", resolve);
	});

	log("SteamCMD is ready.");
	return targetExe;
}

/**
 * Path to a usable steamcmd.exe, installing it on first use.
 * Concurrent callers share one install rather than racing into the same folder.
 */
export function ensureSteamCmd(log = () => {}) {
	const target = getConfig().paths.steamCmdPath;
	if (existsSync(target)) return Promise.resolve(target);

	if (!inFlight) {
		inFlight = installSteamCmd(target, log).finally(() => {
			inFlight = null;
		});
	}
	return inFlight;
}

export function isSteamCmdInstalled() {
	return existsSync(getConfig().paths.steamCmdPath);
}
