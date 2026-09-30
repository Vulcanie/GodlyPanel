// Puts one templated game through the same checks against a REAL install, through the
// panel, and records what differs from what the templates assume.
//
//   node tests/real/conformance.mjs --game valheim [--keep]
//
// Safety, in this order: the ports the game will use (and its own fixed defaults) must
// be free on this PC or the game is skipped; only ports from the allowed set are ever
// used; free disk and the test area's size are checked before installing; only
// processes running from inside the test area are ever stopped; a backup path outside
// the server's own folder (shared with real servers) is backed up but never restored
// over. The game is deleted (files too) when the run ends unless --keep is given.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TESTBED, startPanel, get, post, put, del, upload, check, summary, sleep, until, freeGB, dirGB } from "./lib.mjs";
import { GAMES } from "./games.mjs";
import { portBusy } from "../../src/server/util/portProbe.js";
import { listZip } from "../../src/server/util/tarZip.js";

const gameId = process.argv[process.argv.indexOf("--game") + 1];
const keep = process.argv.includes("--keep");
const game = GAMES[gameId];
if (!game) {
	console.error(`Unknown game "${gameId}". Known: ${Object.keys(GAMES).join(", ")}`);
	process.exit(2);
}
const NAME = game.name;
const enc = encodeURIComponent;
const ps = (cmd) => execFileSync("powershell", ["-NoProfile", "-Command", cmd], { encoding: "utf8" }).trim();
const TB = TESTBED.replaceAll("/", "\\");
const findings = [];
const note = (text) => {
	findings.push(text);
	console.log(`   · ${text}`);
};
const step = (t) => console.log(`\n[${new Date().toLocaleTimeString()}] ${t}`);
const status = async () => (await get("/api/status")).json[NAME];
const online = async () => (await status())?.online === true;
const idle = async () => !(await get("/api/operations")).json[NAME];
const events = async (types) => (await get(`/api/activity?server=${enc(NAME)}&types=${types}&limit=100`)).json;

/** Processes running from inside the test area (never anything else). */
const ours = () =>
	ps(`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${TB}*' -and $_.Name -notmatch '^(node|powershell|cmd|conhost|steamcmd)' } | ForEach-Object { ($_.Name -replace '\\.exe$', '') + ':' + $_.ProcessId }`)
		.split(/\r?\n/)
		.filter(Boolean);
const killOurs = () => ps(`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${TB}*' -and $_.Name -notmatch '^(node|powershell|cmd|conhost)' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; exit 0`);

async function portsFree(list) {
	const busy = [];
	for (const port of list) if (await portBusy(port)) busy.push(port);
	return busy;
}

/** Everything the game should have bound, from the OS's point of view. */
function bound() {
	const udp = ps("(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 7100,7101,8892,8893,8894,8895 } | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique) -join ','");
	const tcp = ps("(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 7101,8892,8893,8894,8895 } | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique) -join ','");
	return { udp: udp ? udp.split(",").map(Number) : [], tcp: tcp ? tcp.split(",").map(Number) : [] };
}

const snapshotUserData = () => {
	const out = {};
	for (const sub of ["AppData\\LocalLow", "AppData\\Roaming", "AppData\\Local"]) {
		const root = path.join(os.homedir(), sub);
		try {
			for (const name of fs.readdirSync(root)) {
				try {
					out[`${sub}\\${name}`] = fs.statSync(path.join(root, name)).mtimeMs;
				} catch {
					// Gone or locked.
				}
			}
		} catch {
			// No such folder.
		}
	}
	return out;
};

function tree(dir, depth = 2, prefix = "") {
	const lines = [];
	let entries = [];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return lines;
	}
	for (const e of entries.slice(0, 60)) {
		lines.push(`${prefix}${e.name}${e.isDirectory() ? "/" : ""}`);
		if (e.isDirectory() && depth > 1 && !/^(steamapps|Engine|Content|Binaries|Plugins)$/i.test(e.name)) lines.push(...tree(path.join(dir, e.name), depth - 1, `${prefix}  `));
	}
	return lines;
}

console.log(`=== ${NAME} (${game.templateId}) ===  testbed ${TESTBED}, ${freeGB().toFixed(1)} GB free, area ${dirGB(TESTBED).toFixed(1)} GB`);

// ---- safety first ---------------------------------------------------------------
const need = [...new Set([...game.ports.udp, ...game.ports.tcp])];
// A program with the same name already running means a real server of this game is up
// on this PC. Nothing is started, and nothing of it is ever touched.
const running = ps(`Get-Process -Name ${game.programs.map((n) => "'" + n + "'").join(",")} -ErrorAction SilentlyContinue | ForEach-Object { $_.ProcessName + ':' + $_.Id + ':' + $_.Path }; exit 0`).split(/\r?\n/).filter(Boolean);
if (running.length > 0) {
	console.log(`SKIPPED: ${NAME} can't be tested while this is running on the PC: ${running.join(" ; ")}. Nothing was started.`);
	process.exit(3);
}
const busy = await portsFree([...need, ...game.extraFree]);
if (busy.length > 0) {
	console.log(`SKIPPED: port(s) ${busy.join(", ")} are in use on this PC (a real server?). Nothing was started.`);
	process.exit(3);
}
if (dirGB(TESTBED) > 45 || freeGB() < 20) {
	console.log(`SKIPPED: not enough room (area ${dirGB(TESTBED).toFixed(1)} GB, ${freeGB().toFixed(1)} GB free).`);
	process.exit(3);
}

const userBefore = snapshotUserData();
const panel = await startPanel();
let entry;
const startedAt = Date.now();
try {
	if ((await get("/api/settings/servers")).json.some((s) => s.name === NAME)) {
		await del(`/api/server/${enc(NAME)}`, { confirmName: NAME, deleteFiles: true });
	}

	// ---- install ---------------------------------------------------------------
	step("Install");
	const created = await post("/api/servers", { templateId: game.templateId, name: NAME, ...game.params, acceptSteamCmdDownload: true });
	if (!check("creating is accepted", created.status === 200, JSON.stringify(created.json))) throw new Error("not accepted");
	let last = "";
	const began = Date.now();
	for (;;) {
		const job = (await get(`/api/servers/create/${created.json.jobId}`)).json;
		const line = `${job.status}${job.step ? ` — ${job.step}` : ""}`;
		if (line !== last) console.log(`   [${Math.round((Date.now() - began) / 1000)}s] ${line}  (area ${dirGB(TESTBED).toFixed(1)} GB)`);
		last = line;
		if (job.status === "done") break;
		if (job.status === "error") throw new Error(`install failed: ${job.error}`);
		if (dirGB(TESTBED) > 48) throw new Error("the test area passed 48 GB during install; stopping.");
		if (Date.now() - began > 120 * 60_000) throw new Error("install took over two hours");
		await sleep(15_000);
	}
	entry = (await get("/api/settings/servers")).json.find((s) => s.name === NAME);
	check("the server is registered", Boolean(entry));
	note(`install size ${dirGB(entry.installDir).toFixed(2)} GB; process name ${entry.processName ?? "(none)"}; method ${entry.method}`);
	note("top of the install:\n      " + tree(entry.installDir).slice(0, 40).join("\n      "));
	if (entry.startScriptPath) note("start script: " + fs.readFileSync(entry.startScriptPath, "utf8").replace(/\r?\n/g, " | ").slice(0, 400));

	// ---- start -----------------------------------------------------------------
	step("Start");
	const again = await portsFree([...need, ...game.extraFree]);
	if (again.length) throw new Error(`port(s) ${again.join(", ")} became busy before start; not starting`);
	check("start is accepted", (await post(`/api/control/${enc(NAME)}/start`)).status === 200);
	const startedAt = Date.now();
	let goneSince = 0;
	// A program that started and is gone again won't come online however long we wait.
	const onlineOrDead = async () => {
		if (await online()) return true;
		if (ours().length > 0) goneSince = 0;
		else if (Date.now() - startedAt > 60_000) {
			goneSince ||= Date.now();
			if (Date.now() - goneSince > 60_000 && (await idle())) throw new Error("the program started and is no longer running");
		}
		return false;
	};
	const cameUp = await until(() => onlineOrDead(), { timeoutMs: game.onlineMin * 60_000, everyMs: 5000, label: `${NAME} to come online` }).catch(() => null);
	check("the panel sees it online", Boolean(cameUp));
	if (!cameUp) {
		note(`never seen online in ${game.onlineMin} min. process(es): ${ours().join(", ") || "none"}`);
		const w = (await get(`/api/server/${enc(NAME)}/logs`)).json;
		note(`logs found: ${Array.isArray(w) ? w.map((l) => l.name).join(", ") : JSON.stringify(w)}`);
		throw new Error("did not come online");
	}
	await until(() => idle(), { timeoutMs: 120_000, label: "start to settle" }).catch(() => {});
	await sleep(20_000); // let it write its files
	const b = bound();
	for (const p of game.ports.udp) check(`UDP ${p} is bound`, b.udp.includes(p), `bound now: udp ${b.udp.join(",")} tcp ${b.tcp.join(",")}`);
	for (const p of game.ports.tcp) check(`TCP ${p} is listening`, b.tcp.includes(p));
	const st = await status();
	note(`status: players ${st.playerCount}/${st.maxplayers ?? "?"}, ping ${st.ping ?? "?"}, session "${st.sessionName ?? ""}"`);
	note(`running: ${ours().join(", ")}`);

	// ---- logs ------------------------------------------------------------------
	step("Logs");
	const logs = (await get(`/api/server/${enc(NAME)}/logs`)).json;
	note(`logs offered: ${logs.map((l) => `${l.name} (${l.size} B)`).join(", ") || "none"}`);
	const main = logs.find((l) => game.logName.test(l.name));
	if (game.noLogFile) note("this game writes no log file (expected)");
	else check("a log file is found", Boolean(main));
	if (main) {
		const tail = (await get(`/api/server/${enc(NAME)}/logs/${main.id}?lines=100`)).json;
		check("it has content", tail.lines.length > 3, `${tail.lines.length} lines`);
	}
	const players = (await get(`/api/server/${enc(NAME)}/players`)).json;
	check("the players view answers", Array.isArray(players.online));

	// ---- backup ----------------------------------------------------------------
	step("Backup");
	const overview = (await get(`/api/server/${enc(NAME)}/backups`)).json;
	note(`backup folders: ${overview.specs.map((s) => `${s.exists ? "" : "(missing) "}${s.path}`).join(" ; ") || "none configured"}`);
	check("the game's save folders exist", overview.specs.length > 0 && overview.specs.some((s) => s.exists), overview.source);
	const inside = overview.specs.filter((s) => s.exists && path.resolve(s.path).toLowerCase().startsWith(path.resolve(entry.installDir).toLowerCase()));
	const outside = overview.specs.filter((s) => s.exists && !inside.includes(s));
	if (outside.length) note(`SHARED/OUTSIDE the server's folder: ${outside.map((s) => s.path).join(" ; ")}`);
	const markerDir = inside.find((s) => fs.statSync(s.path).isDirectory())?.path;
	const marker = markerDir ? path.join(markerDir, "gp-marker.txt") : null;
	if (marker) fs.writeFileSync(marker, "v1\n");
	if (overview.specs.some((s) => s.exists)) {
		check("a backup is accepted", (await post(`/api/server/${enc(NAME)}/backups`, {})).status === 202);
		await until(() => idle(), { timeoutMs: 20 * 60_000, everyMs: 3000, label: "the backup" });
		const o2 = (await get(`/api/server/${enc(NAME)}/backups`)).json;
		check("one backup exists", o2.backups.length === 1, `${((o2.backups[0]?.sizeBytes ?? 0) / 1048576).toFixed(1)} MB, mode ${o2.backups[0]?.mode}, consistent ${o2.backups[0]?.consistent}`);
		if (o2.backups[0]) {
			const names = await listZip(path.join(o2.directory, `${o2.backups[0].id}.zip`));
			note(`backup holds ${names.length} entries, e.g. ${names.slice(0, 6).join(", ")}`);
			check("it holds more than its own record", names.length > 3);
			if (marker) check("and our marker", names.some((n) => n.endsWith("gp-marker.txt")));
		}
		await until(async () => (await online()) || !ours().length, { timeoutMs: 15 * 60_000, everyMs: 5000 }).catch(() => {});
	}

	// ---- stop ------------------------------------------------------------------
	step("Stop");
	if (!(await online())) {
		await post(`/api/control/${enc(NAME)}/start`);
		await until(() => online(), { timeoutMs: game.onlineMin * 60_000, everyMs: 5000, label: "a restart after the backup" });
	}
	await until(() => idle(), { timeoutMs: 120_000 }).catch(() => {});
	const t0 = Date.now();
	check("stop is accepted", (await post(`/api/control/${enc(NAME)}/stop`)).status === 200);
	const gone = await until(async () => ours().length === 0, { timeoutMs: 6 * 60_000, everyMs: 2000, label: "the game to exit" }).catch(() => null);
	check("the game exits after Stop", Boolean(gone), `${Math.round((Date.now() - t0) / 1000)}s`);
	await until(() => idle(), { timeoutMs: 120_000 }).catch(() => {});
	check("the panel says it is offline", Boolean(await until(async () => !(await online()), { timeoutMs: 60_000, everyMs: 3000 }).catch(() => null)));
	const stopEvents = (await get(`/api/server/${enc(NAME)}/logs`)).json;
	note(`files after a clean stop: ${stopEvents.map((l) => l.name).join(", ")}`);

	// ---- restore (only where the files are the server's own) -------------------------
	step("Restore");
	if (marker && fs.existsSync(marker)) {
		const o3 = (await get(`/api/server/${enc(NAME)}/backups`)).json;
		if (outside.length) {
			note("restore SKIPPED: a backup folder is outside the server's own folder and may hold real servers' data");
		} else if (o3.backups[0]) {
			fs.writeFileSync(marker, "v2\n");
			const r = await post(`/api/server/${enc(NAME)}/backups/${o3.backups[0].id}/restore`, { confirmName: NAME });
			check("restore is accepted", r.status === 202, JSON.stringify(r.json));
			await until(() => idle(), { timeoutMs: 20 * 60_000, everyMs: 3000, label: "the restore" });
			check("the marker is back", fs.readFileSync(marker, "utf8") === "v1\n");
		}
	} else {
		note("restore not exercised: no folder inside the server's own directory to hold a marker");
	}

	// ---- crash recovery ---------------------------------------------------------------
	step("Crash recovery");
	await put(`/api/server/${enc(NAME)}/options`, { autoRestart: true });
	await post(`/api/control/${enc(NAME)}/start`);
	await until(() => online(), { timeoutMs: game.onlineMin * 60_000, everyMs: 5000, label: "the game to come online" });
	await until(() => idle(), { timeoutMs: 120_000 }).catch(() => {});
	await sleep(10_000);
	killOurs();
	await until(async () => !(await online()), { timeoutMs: 120_000, everyMs: 3000, label: "it to be seen down" });
	check("the panel notices it died", true);
	const restarted = await until(async () => (await events("server.restarted.auto")).length > 0, { timeoutMs: 6 * 60_000, everyMs: 4000, label: "an automatic restart" }).catch(() => null);
	check("and restarts it", Boolean(restarted));
	const back = await until(() => online(), { timeoutMs: game.onlineMin * 60_000, everyMs: 5000, label: "it to come back" }).catch(() => null);
	check("it comes back online", Boolean(back));
	await put(`/api/server/${enc(NAME)}/options`, { autoRestart: false });
	await until(() => idle(), { timeoutMs: 120_000 }).catch(() => {});

	// ---- mods -------------------------------------------------------------------------
	step("Mods");
	const modsInfo = (await get(`/api/server/${enc(NAME)}/mods`)).json;
	note(`mod support: ${modsInfo.supported ? `${modsInfo.adapter} in ${modsInfo.directory ?? "(start script)"}` : "none"}`);

	// ---- stop for the file-level checks -------------------------------------------------
	await post(`/api/control/${enc(NAME)}/stop`);
	await until(async () => ours().length === 0, { timeoutMs: 6 * 60_000, everyMs: 2000, label: "the game to exit" }).catch(() => {});
	await until(() => idle(), { timeoutMs: 120_000 }).catch(() => {});
	if (modsInfo.supported && modsInfo.adapter === "folder") {
		const ext = modsInfo.accepts?.includes(".jar") ? ".jar" : modsInfo.accepts?.includes(".pak") ? ".pak" : null;
		if (ext) {
			const up = await upload(`/api/server/${enc(NAME)}/mods/upload`, "mod", `gp-test${ext}`, Buffer.from("x"));
			check("a mod file can be added through the panel", up.status === 200, JSON.stringify(up.json));
			const listed = (await get(`/api/server/${enc(NAME)}/mods`)).json;
			check("and it lands in the folder the game reads", listed.mods.some((m) => m.name === `gp-test${ext}`) && fs.existsSync(path.join(listed.directory, `gp-test${ext}`)), listed.directory);
			await post(`/api/server/${enc(NAME)}/mods/remove`, { id: `gp-test${ext}` });
		}
	}

	// ---- ports, clone, delete -------------------------------------------------------------
	step("Ports and clone (files only: nothing is started on other ports)");
	const before = (await get(`/api/server/${enc(NAME)}/ports`)).json;
	note(`ports as recorded: ${JSON.stringify(before.current)}; implied: ${(before.implicit ?? []).map((i) => `+${i.offset}${i.precaution ? "?" : ""}`).join(" ")}`);
	const swapKey = before.current.rconPort ? "rconPort" : null;
	if (swapKey) {
		const target = 7101;
		const changed = await put(`/api/server/${enc(NAME)}/ports`, { ports: { [swapKey]: target } });
		check("the RCON port can be changed on the stopped server", changed.status === 200, changed.json?.error);
		const scriptAfter = entry.startScriptPath ? fs.readFileSync(entry.startScriptPath, "utf8") : "";
		const inFiles = scriptAfter.includes(String(target)) || (entry.configPath && fs.existsSync(entry.configPath) && fs.readFileSync(entry.configPath, "utf8").includes(String(target)));
		check("and the new number is in the game's files, not only the panel's record", Boolean(inFiles), (changed.json?.warnings ?? []).join(" "));
		await put(`/api/server/${enc(NAME)}/ports`, { ports: { [swapKey]: before.current[swapKey] } });
	}
	if (!game.templateId.startsWith("ark-asa")) {
		const started = await post(`/api/server/${enc(NAME)}/clone`, { name: `${NAME} Copy`, ports: Object.fromEntries(Object.entries(before.current).map(([k], i) => [k, 7110 + i * 2])) });
		if (started.status === 202) {
			const job = await until(async () => {
				const j = (await get(`/api/clone-jobs/${started.json.id}`)).json;
				return ["done", "failed"].includes(j.status) ? j : null;
			}, { timeoutMs: 40 * 60_000, everyMs: 10_000, label: "the clone" });
			check("a clone completes", job.status === "done", job.error ?? "");
			await del(`/api/server/${enc(`${NAME} Copy`)}`, { confirmName: `${NAME} Copy`, deleteFiles: true });
		} else {
			note(`clone refused: ${started.json?.error}`);
		}
	}
} catch (err) {
	check("the run completed", false, err.stack?.split("\n").slice(0, 3).join(" | "));
} finally {
	try {
		killOurs();
	} catch {
		// Nothing left.
	}
	// Anything in the user's profile that changed while this ran: a sign the game writes outside its folder.
	const userAfter = snapshotUserData();
	const changed = Object.keys(userAfter).filter((k) => userAfter[k] !== userBefore[k] && Date.now() - userAfter[k] < Date.now() - startedAt + 60_000);
	if (changed.length) console.log(`   · profile folders touched during the run (may be unrelated): ${changed.join(", ")}`);
	if (!keep && entry) {
		const removal = await del(`/api/server/${enc(NAME)}`, { confirmName: NAME, deleteFiles: true }).catch(() => null);
		console.log(`   · removed the test server: ${removal?.status} ${removal?.json?.deleted ?? removal?.json?.error ?? ""}`);
	}
	await panel.stop();
	fs.mkdirSync(path.join(TESTBED, "results"), { recursive: true });
	fs.writeFileSync(path.join(TESTBED, "results", `${gameId}.txt`), findings.join("\n"));
	console.log(`\nTest area now ${dirGB(TESTBED).toFixed(1)} GB; ${freeGB().toFixed(1)} GB free; ${Math.round((Date.now() - startedAt) / 60000)} min.`);
}
process.exit(summary() ? 0 : 1);
