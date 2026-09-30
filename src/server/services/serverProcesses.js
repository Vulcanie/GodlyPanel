import { execFile } from "node:child_process";
import path from "node:path";

// Which running programs belong to a server. A program's name alone is not enough to
// say: two Valheim servers are both "valheim_server.exe", and stopping one by name
// stops both. So a process only counts as a server's own if it runs from inside that
// server's folder. Anything else with the same name is reported as foreign and is
// never touched by Stop.

const SAFE_NAME = /^[A-Za-z0-9._ -]{1,80}$/;

const norm = (p) => path.resolve(String(p)).replace(/[\\/]+$/, "").toLowerCase();
const inside = (child, parent) => child === parent || child.startsWith(`${parent}${path.sep}`);

/** The folders a server's own program may run from. */
export function serverRoots(server) {
	return [server.installDir, server.workingDir].filter(Boolean).map(norm);
}

/**
 * Split running programs with the server's image name into its own and foreign ones.
 * @param {{ pid: number, path: string|null }[]} running  every process with that name
 * @returns {{ owned: {pid:number,path:string}[], foreign: {pid:number,path:string|null}[], hasRoots: boolean }}
 */
export function classify(server, running) {
	const roots = serverRoots(server);
	if (roots.length === 0) return { owned: running.filter((p) => p.path), foreign: [], hasRoots: false };
	const owned = [];
	const foreign = [];
	for (const p of running) {
		if (p.path && roots.some((r) => inside(norm(p.path), r))) owned.push(p);
		else foreign.push(p);
	}
	return { owned, foreign, hasRoots: true };
}

/** Every running process with this image name and where it runs from. Never throws. */
export function listByName(imageName) {
	return new Promise((resolve) => {
		if (!SAFE_NAME.test(String(imageName ?? ""))) return resolve([]);
		execFile(
			"powershell",
			[
				"-NoProfile",
				"-NonInteractive",
				"-Command",
				`Get-CimInstance Win32_Process -Filter "Name='${imageName.replace(/'/g, "''")}'" | ForEach-Object { "$($_.ProcessId)|$($_.ExecutablePath)" }`,
			],
			{ windowsHide: true, timeout: 15000 },
			(error, stdout) => {
				if (error) return resolve([]);
				resolve(
					String(stdout)
						.split(/\r?\n/)
						.filter(Boolean)
						.map((line) => {
							const [pid, ...rest] = line.split("|");
							return { pid: Number(pid), path: rest.join("|") || null };
						})
						.filter((p) => Number.isInteger(p.pid)),
				);
			},
		);
	});
}

/** The server's own running programs, and any others that merely share the name. */
export async function findServerProcesses(server) {
	if (!server.processName) return { owned: [], foreign: [], hasRoots: false };
	return classify(server, await listByName(server.processName));
}
