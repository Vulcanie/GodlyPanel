import express from "express";
import fs from "node:fs";
import path from "node:path";
import { update as updateServer } from "../data/serverStore.js";
import { assertWithinAllowedRoots } from "../util/safePath.js";
import { getConfig } from "../config/configStore.js";
import { serverStatus } from "../services/pollingService.js";
import { deriveLaunch } from "../services/batchLaunch.js";
import { launchProblem, readServerLog, serverLogPath } from "../services/windowlessLauncher.js";
import {
	WINDOW_MODES,
	requestedWindowMode,
	effectiveWindowMode,
	usesWindows,
	hideWindows,
	showWindows,
	markHidingStarted,
} from "../services/serverWindows.js";

// Everything about how one server's window behaves. Mounted under
// /server/:serverName, whose parameter the parent router has already resolved
// into req.server.
const router = express.Router({ mergeParams: true });

const PRIORITIES = ["low", "belowNormal", "normal", "aboveNormal", "high", "realtime"];

function describe(server) {
	return {
		applicable: usesWindows(server),
		requested: WINDOW_MODES.includes(server.windowMode) ? server.windowMode : null,
		effective: effectiveWindowMode(server),
		defaultMode: getConfig().servers.defaultWindowMode,
		launch: server.launch ?? null,
		launchProblem: server.launch ? launchProblem(server.launch) : null,
		hasScript: Boolean(server.startScriptPath),
		hasLog: fs.existsSync(serverLogPath(server)),
	};
}

router.get("/window", (req, res) => {
	res.json(describe(req.server));
});

// Read what the start script runs, without saving anything, so the owner can
// see it — and what would be skipped — before choosing "no window".
router.post("/launch/detect", (req, res) => {
	const { startScriptPath, workingDir } = req.server;
	res.json(deriveLaunch(startScriptPath, { workingDir }));
});

// Set the launch details by hand, for a script that can't be read automatically.
router.put("/launch", async (req, res) => {
	const { exe, args = "", cwd, priority } = req.body ?? {};
	try {
		if (typeof exe !== "string" || !path.isAbsolute(exe) || !/\.exe$/i.test(exe)) {
			throw new Error("The program must be a full path to an .exe file.");
		}
		if (!fs.existsSync(exe)) throw new Error("That program doesn't exist.");
		assertWithinAllowedRoots(exe);

		const folder = typeof cwd === "string" && cwd.trim() ? cwd.trim() : path.dirname(exe);
		if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new Error("That folder doesn't exist.");
		assertWithinAllowedRoots(folder);

		if (typeof args !== "string" || args.length > 8000 || /[\r\n]/.test(args)) {
			throw new Error("Arguments must be a single line of text.");
		}
		if (priority && !PRIORITIES.includes(priority)) throw new Error("Unknown priority.");

		const launch = {
			exe,
			args: args.trim(),
			cwd: folder,
			...(priority ? { priority } : {}),
			// Environment variables read out of the script are kept.
			...(req.server.launch?.env ? { env: req.server.launch.env } : {}),
		};
		await updateServer(req.server.name, { launch });
		res.json(describe({ ...req.server, launch }));
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

router.put("/window-mode", async (req, res) => {
	const mode = req.body?.mode;
	if (mode !== "default" && !WINDOW_MODES.includes(mode)) {
		return res.status(400).json({ error: "Unknown window mode." });
	}

	let server = req.server;
	let skipped = [];
	try {
		if (mode === "windowless") {
			if (!server.launch) {
				const found = deriveLaunch(server.startScriptPath, { workingDir: server.workingDir });
				if (!found.ok) {
					return res.status(400).json({ error: found.reason, code: "no_launch" });
				}
				skipped = found.skipped;
				server = await updateServer(server.name, { launch: found.launch });
			}
			const problem = launchProblem(server.launch);
			if (problem) return res.status(400).json({ error: problem, code: "bad_launch" });
		}

		server = await updateServer(server.name, { windowMode: mode === "default" ? null : mode });

		// If it's running right now, act on that too instead of waiting for the
		// next start — hide the window it already has, or bring it back.
		let appliedNow = false;
		if (serverStatus[server.name]?.online && usesWindows(server)) {
			if (effectiveWindowMode(server) === "minimized") {
				await showWindows([server]).catch(() => {});
				appliedNow = true;
			} else {
				markHidingStarted(server);
				hideWindows([server], 20);
				appliedNow = true;
			}
		}
		res.json({ ...describe(server), skipped, appliedNow, requestedMode: requestedWindowMode(server) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post("/windows/:action(hide|show)", async (req, res) => {
	try {
		if (req.params.action === "hide") {
			markHidingStarted(req.server);
			hideWindows([req.server], 20);
			return res.json({ success: true });
		}
		res.json({ success: true, restored: await showWindows([req.server]) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get("/log", (req, res) => {
	const offset = req.query.offset === undefined ? undefined : Number(req.query.offset);
	res.json(readServerLog(req.server, Number.isInteger(offset) ? offset : undefined));
});

export default router;
