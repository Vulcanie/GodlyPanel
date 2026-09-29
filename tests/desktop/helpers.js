import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Stand-in "game servers" for the tests that need real processes and windows.
// They are renamed copies of node.exe that print a line every 400ms, so nothing
// here can touch a real game server: the helpers only ever look at, and kill,
// processes whose executable lives inside the test's own folder.

const TASKBAR = path.join(import.meta.dirname, "taskbar.ps1");

const ps = (command) => execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim();

/** Titles and owners of every taskbar window right now. */
export const taskbarWindows = () =>
	execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", TASKBAR], { encoding: "utf8" });

/** True if a stand-in's window is on the taskbar (its console title is the `start` title, or its path). */
export const standInOnTaskbar = (title) => new RegExp(`\\|${title}\\r?$`, "m").test(taskbarWindows());

/** Is a process with this image name running from inside `folder`? */
export const isRunning = (imageName, folder) =>
	ps(`(Get-CimInstance Win32_Process -Filter "Name='${imageName}'" | Where-Object { $_.ExecutablePath -like '${folder}*' } | Measure-Object).Count`) !== "0";

export const killStandIns = (imageName, folder) =>
	ps(`Get-CimInstance Win32_Process -Filter "Name='${imageName}'" | Where-Object { $_.ExecutablePath -like '${folder}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`);

/**
 * How many processes with this name are running, ignoring any that live inside
 * `exceptInFolder` (the test's own stand-ins). With no folder it counts them all.
 * Used to prove a test left real programs alone.
 */
export const countRunning = (imageName, exceptInFolder) =>
	Number(
		ps(
			`(Get-CimInstance Win32_Process -Filter "Name='${imageName}'" | Where-Object { ${
				exceptInFolder ? `$_.ExecutablePath -notlike '${exceptInFolder}*'` : "$true"
			} } | Measure-Object).Count`,
		),
	);

/** Waits for `check()` to become true. */
export async function until(check, { timeoutMs = 30_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (check()) return true;
		await new Promise((resolve) => setTimeout(resolve, everyMs));
	}
	return check();
}

/** Lay out a folder with the stand-in programs and the scripts that start them. */
export function makeStandIns(folder) {
	fs.mkdirSync(folder, { recursive: true });
	fs.copyFileSync(process.execPath, path.join(folder, "gamesim.exe"));
	// A second, differently named program: two servers running the same program are
	// indistinguishable to the window hiding, so a test that switches modes on one
	// must not have another matching the same name.
	fs.copyFileSync(process.execPath, path.join(folder, "gamesim2.exe"));
	fs.copyFileSync(process.execPath, path.join(folder, "java.exe"));
	// Where Minecraft's loader version is read from, to tell servers apart.
	fs.writeFileSync(path.join(folder, "variables.txt"), "MODLOADER_VERSION=9.9.9\r\n");

	const tick = `setInterval(()=>console.log('tick'),400)`;
	// Readable by the launch reader.
	fs.writeFileSync(path.join(folder, "sim.bat"), `@echo off\r\ncd /d "%~dp0"\r\nstart /MIN "Sim" gamesim.exe -e "${tick}"\r\n`);
	// The same, but with a for loop, which the reader must refuse and capture must handle.
	fs.writeFileSync(path.join(folder, "unreadable.bat"), `@echo off\r\nfor %%i in (1) do echo hi >nul\r\ncd /d "%~dp0"\r\nstart /MIN "Sim2" gamesim2.exe -e "${tick}"\r\n`);
	// Minecraft-shaped: java, server.jar and the loader version on the command line.
	fs.writeFileSync(
		path.join(folder, "mc.bat"),
		`@echo off\r\ncd /d "%~dp0"\r\nstart /MIN "Mc" "%~dp0java.exe" -e "console.log('argv '+process.argv.slice(1).join(' '));${tick}" -- -jar server.jar --installer-force --installer 9.9.9 nogui\r\n`,
	);
}
