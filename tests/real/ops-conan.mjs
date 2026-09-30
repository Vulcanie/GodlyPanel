// Runs the operations features against the REAL Conan Exiles server installed by
// install-conan.mjs: start, logs, a backup (which stops the game for the copy and
// starts it again), restore, crash recovery (the game is killed from outside), a
// scheduled restart, stop, presets, a full clone running on its own ports, and a
// Steam Workshop mod. Slow, run by hand:
//
//   node tests/real/ops-conan.mjs
//
// Ports: the server uses 8892 (game), 8893 (raw UDP), 8894 (query), 8895 (RCON); the
// clone gets the next free set. The panel itself listens on 7100.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TESTBED, startPanel, get, post, put, del, check, summary, sleep, until, freeGB, dirGB } from "./lib.mjs";
import { listZip } from "../../src/server/util/tarZip.js";

const NAME = "Real Conan";
const enc = encodeURIComponent;
const ps = (cmd) => execFileSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8" }).trim();
const gameAlive = () => ps("(Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Measure-Object).Count") !== "0";
const status = async (n = NAME) => (await get("/api/status")).json[n];
const online = async (n = NAME) => (await status(n))?.online === true;
const idle = async (n = NAME) => !(await get("/api/operations")).json[n];
const events = async (types, n = NAME) => (await get(`/api/activity?server=${enc(n)}&types=${types}&limit=100`)).json;
const stamp = () => new Date().toLocaleTimeString();
const step = (t) => console.log(`\n[${stamp()}] ${t}`);

console.log(`Testbed ${TESTBED}, ${freeGB().toFixed(1)} GB free, servers use ${dirGB(path.join(TESTBED, "servers")).toFixed(1)} GB`);
const panel = await startPanel();
let entry;
try {
	entry = (await get("/api/settings/servers")).json.find((s) => s.name === NAME);
	if (!entry) throw new Error("Run install-conan.mjs first.");
	const saved = path.join(entry.workingDir, "ConanSandbox", "Saved");
	const marker = path.join(saved, "gp-marker.txt");

	// Clean slate: nothing of ours running, nothing left from an earlier run.
	if (gameAlive()) throw new Error("A Conan server is already running on this PC; stop it first so nothing real is disturbed.");
	if ((await get("/api/settings/servers")).json.some((s) => s.name === "Real Conan Two")) {
		await del(`/api/server/${enc("Real Conan Two")}`, { confirmName: "Real Conan Two", deleteFiles: true });
	}
	for (const b of (await get(`/api/server/${enc(NAME)}/backups`)).json.backups) await del(`/api/server/${enc(NAME)}/backups/${b.id}`);
	for (const s of (await get("/api/schedules")).json) await del(`/api/schedules/${s.id}`);

	step("Start");
	check("start is accepted", (await post(`/api/control/${enc(NAME)}/start`)).status === 200);
	await until(() => online(), { timeoutMs: 12 * 60_000, everyMs: 5000, label: "Conan to come online" });
	check("the panel sees the real server online", true);
	await until(() => idle(), { timeoutMs: 60_000 });
	const bound = ps("(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8892,8893,8894 } | Select-Object -ExpandProperty LocalPort | Sort-Object) -join ','");
	check("it binds its game, raw and query ports", bound === "8892,8893,8894", bound);

	step("Logs and players");
	const logs = (await get(`/api/server/${enc(NAME)}/logs`)).json;
	check("its real log file is found", logs.some((l) => /ConanSandbox.*\.log/i.test(l.name)), logs.map((l) => l.name).join(", "));
	const mainLog = logs.find((l) => /^ConanSandbox\.log$/i.test(l.name)) ?? logs[0];
	const tail = (await get(`/api/server/${enc(NAME)}/logs/${mainLog.id}?lines=200`)).json;
	check("the log has real content", tail.lines.length > 20, `${tail.lines.length} lines`);
	const leaked = tail.lines.filter((l) => /TestJoin1/.test(l)).length;
	const asAdmin = leaked;
	console.log(`   (admin view shows the join password on ${asAdmin} line(s) of the tail)`);
	const found = (await get(`/api/server/${enc(NAME)}/logs/${mainLog.id}?search=LogInit`)).json;
	check("searching the real log works", found.lines.length > 0, `${found.lines.length} matches`);
	const players = (await get(`/api/server/${enc(NAME)}/players`)).json;
	check("the players view answers (nobody is on)", Array.isArray(players.online) && players.online.length === 0);

	step("Backup while running (stops the game, copies, starts it again)");
	fs.writeFileSync(marker, "v1\n");
	const before = gameAlive();
	check("the game is running before the backup", before);
	check("backup is accepted", (await post(`/api/server/${enc(NAME)}/backups`, {})).status === 202);
	await until(async () => !gameAlive(), { timeoutMs: 3 * 60_000, everyMs: 1000, label: "the game to be stopped for the copy" });
	check("the game was stopped gracefully for the copy", true);
	await until(() => idle(), { timeoutMs: 15 * 60_000, everyMs: 3000, label: "the backup to finish" });
	check("and started again afterwards", await online());
	const overview = (await get(`/api/server/${enc(NAME)}/backups`)).json;
	check("one backup exists", overview.backups.length === 1, `${(overview.backups[0]?.sizeBytes / 1048576).toFixed(0)} MB`);
	const zip = path.join(overview.directory, `${overview.backups[0].id}.zip`);
	const names = await listZip(zip);
	check("it holds the real save data and our marker", names.some((n) => /^Saved\/gp-marker\.txt$/.test(n)) && names.some((n) => /game_\d+\.db$/i.test(n)), `${names.length} entries`);
	check("but not the logs", !names.some((n) => /^Saved\/Logs\//.test(n)));
	check("it says the game was saved as it exited (consistent)", overview.backups[0].consistent === true);

	step("Restore");
	fs.writeFileSync(marker, "v2 - changed after the backup\n");
	await post(`/api/control/${enc(NAME)}/stop`);
	await until(async () => !gameAlive() && (await idle()), { timeoutMs: 4 * 60_000, everyMs: 2000, label: "a stop" });
	const restore = await post(`/api/server/${enc(NAME)}/backups/${overview.backups[0].id}/restore`, { confirmName: NAME });
	check("restore is accepted", restore.status === 202, JSON.stringify(restore.json));
	await until(() => idle(), { timeoutMs: 15 * 60_000, everyMs: 3000, label: "the restore" });
	check("the marker is back to its backed-up value", fs.readFileSync(marker, "utf8") === "v1\n");
	check("a safety backup of the replaced state was taken", (await get(`/api/server/${enc(NAME)}/backups`)).json.backups.some((b) => b.kind === "pre-restore"));

	step("Crash recovery (the game is killed from outside)");
	await put(`/api/server/${enc(NAME)}/options`, { autoRestart: true });
	await post(`/api/control/${enc(NAME)}/start`);
	await until(() => online(), { timeoutMs: 12 * 60_000, everyMs: 5000, label: "Conan to come online" });
	await until(() => idle(), { timeoutMs: 60_000 });
	await sleep(8000);
	ps("Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\\gp-testbed*' } | Stop-Process -Force");
	await until(async () => !(await online()), { timeoutMs: 90_000, everyMs: 2000, label: "it to be seen down" });
	check("the panel notices it went down", true);
	await until(async () => (await events("server.restarted.auto")).length > 0, { timeoutMs: 4 * 60_000, everyMs: 3000, label: "an automatic restart" });
	check("and restarts it automatically", true);
	await until(() => online(), { timeoutMs: 12 * 60_000, everyMs: 5000, label: "it to come back" });
	check("the real server is back online", true);
	check("the crash and recovery are in the activity log", (await events("server.crashed")).length >= 1 && (await events("server.restarted.auto")).length >= 1);

	step("Scheduled restart (run now)");
	await until(() => idle(), { timeoutMs: 60_000 });
	const task = (await post("/api/schedules", { kind: "restart", name: "Test restart", servers: [NAME], when: { type: "daily", time: "04:00" }, options: { warnMinutes: [] } })).json;
	await post(`/api/schedules/${task.id}/run`);
	await until(async () => (await get("/api/schedules")).json.find((t) => t.id === task.id)?.lastStatus, { timeoutMs: 15 * 60_000, everyMs: 5000, label: "the scheduled restart" });
	const ran = (await get("/api/schedules")).json.find((t) => t.id === task.id);
	check("the scheduled restart finished", ran.lastStatus === "ok", ran.lastMessage);
	check("and the server is online again", await online());
	await del(`/api/schedules/${task.id}`);

	step("Stop");
	await put(`/api/server/${enc(NAME)}/options`, { autoRestart: false });
	await until(() => idle(), { timeoutMs: 60_000 });
	const t0 = Date.now();
	await post(`/api/control/${enc(NAME)}/stop`);
	await until(async () => !gameAlive(), { timeoutMs: 4 * 60_000, everyMs: 1000, label: "the game to exit" });
	check("Stop over RCON makes the real game exit", true, `${Math.round((Date.now() - t0) / 1000)}s`);
	await until(() => idle(), { timeoutMs: 60_000 });

	step("Presets");
	const preset = await post(`/api/server/${enc(NAME)}/presets`, { name: "Real settings" });
	check("a preset saves from the real server's settings", preset.status === 200, JSON.stringify(preset.json?.files ?? preset.json));
	if (preset.status === 200) {
		const apply = await post(`/api/server/${enc(NAME)}/presets/${preset.json.id}/apply`, {});
		check("and applies back to it", apply.status === 200, JSON.stringify(apply.json));
		await del(`/api/presets/${preset.json.id}`);
	}

	step("Clone (copies the whole installed server)");
	// The copy is checked rather than run: the only ports this test may use are the
	// community's Conan ports (which the original owns) and 7100-7101, and a second
	// real Conan server needs more than that. Starting clones is covered by the
	// stand-in game tests.
	console.log(`   source is ${dirGB(entry.installDir).toFixed(1)} GB, ${freeGB().toFixed(1)} GB free`);
	const started = await post(`/api/server/${enc(NAME)}/clone`, { name: "Real Conan Two", ports: { port: 7110, queryPort: 7112, rconPort: 7113 } });
	check("clone is accepted", started.status === 202, JSON.stringify(started.json));
	const job = await until(async () => {
		const j = (await get(`/api/clone-jobs/${started.json.id}`)).json;
		return ["done", "failed"].includes(j.status) ? j : null;
	}, { timeoutMs: 40 * 60_000, everyMs: 10_000, label: "the clone" });
	check("the copy finished", job.status === "done", job.error ?? "");
	const two = (await get("/api/settings/servers")).json.find((s) => s.name === "Real Conan Two");
	check("it has the ports it was given", two && two.port === 7110 && two.queryPort === 7112 && two.rconPort === 7113, two ? `${two.port}/${two.queryPort}/${two.rconPort}` : "");
	if (two) {
		const s2 = fs.readFileSync(two.startScriptPath, "utf8");
		check("its start script uses them", s2.includes("-Port=7110") && s2.includes("-QueryPort=7112") && s2.includes('"Real Conan Two"'));
		const game2 = fs.readFileSync(path.join(two.workingDir, "ConanSandbox", "Saved", "Config", "WindowsServer", "Game.ini"), "utf8");
		check("its RCON port and password in Game.ini match what the panel has", /RconPort=7113/.test(game2) && game2.includes(`RconPassword=${two.rconPassword}`), game2.split(/\r?\n/).filter((l) => /Rcon(Port|Password)/.test(l)).join(" "));
		check("and differ from the original's", two.rconPassword !== entry.rconPassword && !game2.includes(entry.rconPassword));
		const sizeA = dirGB(entry.installDir);
		const sizeB = dirGB(two.installDir);
		check("it is the same size as the original (everything was copied)", Math.abs(sizeA - sizeB) < 0.3, `${sizeA.toFixed(2)} vs ${sizeB.toFixed(2)} GB`);
		const removal = await del(`/api/server/${enc("Real Conan Two")}`, { confirmName: "Real Conan Two", deleteFiles: true });
		check("and it can be deleted with its files", removal.status === 200 && !fs.existsSync(two.installDir), JSON.stringify(removal.json));
		check("deleting the clone left the original alone", fs.existsSync(path.join(entry.installDir, "ConanSandboxServer.exe")));
	}

	step("Workshop mod");
	const workshopId = process.env.GP_WORKSHOP_ID;
	if (workshopId) {
		const mod = await post(`/api/server/${enc(NAME)}/mods/workshop`, { id: workshopId });
		check("a Steam Workshop item installs through SteamCMD", mod.status === 200, JSON.stringify(mod.json));
		if (mod.status === 200) {
			const list = (await get(`/api/server/${enc(NAME)}/mods`)).json;
			check("it is listed and enabled in modlist.txt", list.mods.some((m) => m.enabled && /\.pak$/i.test(m.name)), list.mods.map((m) => m.name).join(", "));
			const modlist = fs.readFileSync(path.join(entry.workingDir, "ConanSandbox", "Mods", "modlist.txt"), "utf8");
			check("with the asterisk Conan expects", /^\*.+\.pak/m.test(modlist), modlist.trim());
			// Start with the mod: the server has to come up with it loaded.
			await post(`/api/control/${enc(NAME)}/start`);
			await until(() => online(), { timeoutMs: 12 * 60_000, everyMs: 5000, label: "Conan to come online with the mod" });
			check("the server starts with the mod installed", true);
			await until(() => idle(), { timeoutMs: 60_000 });
			await post(`/api/control/${enc(NAME)}/stop`);
			await until(async () => !gameAlive(), { timeoutMs: 4 * 60_000, everyMs: 2000 });
			await until(() => idle(), { timeoutMs: 60_000 });
		}
	} else {
		console.log("   skipped (set GP_WORKSHOP_ID to a public Conan Exiles Workshop item number)");
	}

	step("Activity log");
	const all = (await get(`/api/activity?server=${enc(NAME)}&limit=200`)).json;
	for (const type of ["backup.completed", "backup.restored", "server.crashed", "server.restarted.auto", "server.restarted.scheduled", "schedule.ran", "preset.saved", "server.cloned"]) {
		check(`the log recorded ${type}`, all.some((e) => e.type === type) || (type === "server.cloned" && (await get("/api/activity?types=server.cloned")).json.length > 0));
	}
} catch (err) {
	check("the run completed", false, err.stack?.split("\n").slice(0, 3).join(" | "));
} finally {
	try {
		ps("Get-Process ConanSandboxServer-Win64-Shipping,ConanSandboxServer -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\\gp-testbed*' } | Stop-Process -Force");
	} catch {
		// Nothing left.
	}
	await panel.stop();
	console.log(`\nTestbed now uses ${dirGB(TESTBED).toFixed(1)} GB of the 50 GB budget.`);
}
process.exit(summary() ? 0 : 1);
