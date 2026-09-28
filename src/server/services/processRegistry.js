import { execFile } from "node:child_process";

// Game servers are launched as genuinely independent processes and are meant
// to outlive the panel. SteamCMD is the opposite: it's spawned as a direct
// child (deliberately, so its output can be streamed into the job log) and on
// Windows killing our process does NOT kill it, because child.kill() doesn't
// reach grandchildren. Left alone, a quit mid-install leaves steamcmd.exe
// running against a half-installed folder with nothing watching it.
//
// So we track the PIDs and taskkill the tree on shutdown, and we track job
// activity so the app can warn before quitting instead of silently corrupting
// an install.

const steamCmdPids = new Set();
const activeJobs = new Map();

export function trackSteamCmd(pid) {
	if (pid) steamCmdPids.add(pid);
}

export function untrackSteamCmd(pid) {
	if (pid) steamCmdPids.delete(pid);
}

/** Kill every tracked SteamCMD process tree. Best-effort and synchronous-ish. */
export function killTrackedSteamCmd() {
	for (const pid of steamCmdPids) {
		try {
			execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => {});
			console.log(`[shutdown] Killed in-flight SteamCMD process ${pid}.`);
		} catch {
			// Already gone.
		}
	}
	steamCmdPids.clear();
}

export function markJobActive(id, info) {
	activeJobs.set(id, { id, ...info });
}

export function markJobDone(id) {
	activeJobs.delete(id);
}

/** Returns the list of jobs still running, for the quit-confirmation dialog. */
export function hasActiveJobs() {
	return [...activeJobs.values()];
}
