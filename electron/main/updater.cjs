const { spawn } = require("node:child_process");
// original-fs: Electron's own fs treats a file called app.asar as a folder.
const fs = require("original-fs");
const os = require("node:os");
const path = require("node:path");

// The desktop app's half of "Update now". The panel (the API process) has already downloaded the update, checked it and
// unpacked it into <data>/updates/stage-<version>; this process only has to get out of the way. It launches
// apply-update.ps1, which waits for the app to close, swaps the files, starts the new version and rolls back if that
// doesn't come up, and then the caller quits.
//
// The request comes from the API child over IPC, but the paths in it are still checked here: nothing outside the
// updates folder is ever handed to the script, and the script itself is the copy shipped with the app.

const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/;

const inside = (parent, child) => {
	const rel = path.relative(path.resolve(parent), path.resolve(child));
	return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/**
 * Check an apply-update request and start the helper. Throws (with a message for the user) when it can't or shouldn't.
 * @param {object} request    { mode, stageDir, version, files[] } from the API
 * @param {object} context    { dataDir, resourceRoot, execPath, currentVersion, argv, pid }
 */
async function launchUpdate(request, { dataDir, resourceRoot, execPath, currentVersion, argv, pid }) {
	const updatesDir = path.join(dataDir, "updates");
	if (!request || !["app", "full"].includes(request.mode)) throw new Error("The update request is malformed.");
	if (typeof request.version !== "string" || !VERSION.test(request.version)) throw new Error("The update's version isn't valid.");
	const stageDir = path.resolve(String(request.stageDir ?? ""));
	if (!inside(updatesDir, stageDir) || !path.basename(stageDir).startsWith("stage-")) throw new Error("The unpacked update isn't where updates are kept.");
	const need = request.mode === "app" ? ["resources", "app.asar"] : ["GodlyPanel.exe"];
	if (!fs.existsSync(path.join(stageDir, ...need))) throw new Error("The unpacked update is incomplete.");
	const files = (Array.isArray(request.files) ? request.files : []).map(String);
	for (const f of files) if (!inside(updatesDir, f)) throw new Error("A downloaded file isn't where updates are kept.");

	const script = path.join(resourceRoot, "scripts", "apply-update.ps1");
	if (!fs.existsSync(script)) throw new Error("The update script is missing from the app.");

	// Run from a copy: the folder the script lives in is the one being replaced.
	const work = fs.mkdtempSync(path.join(os.tmpdir(), "gp-update-"));
	const runScript = path.join(work, "apply-update.ps1");
	fs.copyFileSync(script, runScript);
	const plan = {
		appDir: path.dirname(execPath),
		exePath: execPath,
		// Started the way it was: where it keeps its data, and whether it was living in the tray without a window.
		exeArgs: argv.filter((a) => a.startsWith("--data-dir=") || a === "--hidden"),
		stageDir,
		mode: request.mode,
		version: request.version,
		oldVersion: currentVersion,
		parentPid: pid,
		dataDir,
		logFile: path.join(dataDir, "logs", "update.log"),
		resultFile: path.join(dataDir, "state", "update-result.json"),
		healthFile: path.join(dataDir, "state", "update-health.json"),
		cleanup: [stageDir, ...files, work],
		healthTimeoutSec: 90,
	};
	const planFile = path.join(work, "plan.json");
	fs.writeFileSync(planFile, JSON.stringify(plan));

	// Written from here as well as from the script, so a script that never got going still leaves a trace.
	const note = (text) => {
		try {
			fs.mkdirSync(path.dirname(plan.logFile), { recursive: true });
			fs.appendFileSync(plan.logFile, `${new Date().toISOString().slice(0, 19)} [app] ${text}\r\n`);
		} catch {
			// Nothing to do about a log that can't be written.
		}
	};
	// The script has to outlive this process, and on Windows that is harder than it sounds. A child started the usual way
	// is killed with its parent (Node ties its children to a job object that closes when it exits), and a detached
	// PowerShell, having no console, silently never runs. A program started by `cmd /c start` is a grandchild, which is
	// outside that job, and `start /B` gives it no window. So: start it that way, and wait for cmd to say it has.
	// (cmd reads %NAME% even inside quotes, so a path with a % in it can't be passed this way.)
	const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
	const outFile = path.join(path.dirname(plan.logFile), "update-script-output.txt");
	for (const p of [powershell, runScript, planFile, outFile]) {
		if (p.includes("%")) throw new Error(`The folder name ${p} contains a "%", which Windows' command line can't pass on safely, so the panel can't update itself from there. Update by unzipping the package instead.`);
	}
	const inner = `start "" /B "${powershell}" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${runScript}" "${planFile}" >> "${outFile}" 2>&1`;
	await new Promise((resolve, reject) => {
		const cmd = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `"${inner}"`], { stdio: "ignore", windowsHide: true, windowsVerbatimArguments: true, cwd: os.tmpdir() });
		const timer = setTimeout(() => reject(new Error("The update script didn't start.")), 15_000);
		cmd.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		cmd.on("exit", (code) => {
			clearTimeout(timer);
			if (code === 0) resolve();
			else reject(new Error(`The update script couldn't be started (cmd exited with ${code}).`));
		});
	});
	note(`Handed over to the update script for ${currentVersion} -> ${request.version}.`);
}

module.exports = { launchUpdate };
