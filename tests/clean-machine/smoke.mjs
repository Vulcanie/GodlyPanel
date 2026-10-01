// A first-run test on a machine that has never seen GodlyPanel.
//
// Run by .github/workflows/clean-machine.yml on a fresh Windows runner (and
// usable on any Windows machine): it unzips the packaged app, starts it exactly
// as a user would, goes through the first-run screen in the real window, then
// uses the API to create a real Conan Exiles server (a genuine SteamCMD install),
// start it, check the panel sees it online, change its ports, stop it, and
// delete it with its files.
//
// Nothing here is mocked: it is the same path a person takes, on a clean box.
//
//   node tests/clean-machine/smoke.mjs <path-to-GodlyPanel-win.zip> [--no-conan]

import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const zip = process.argv[2];
const withConan = !process.argv.includes("--no-conan");
if (!zip || !fs.existsSync(zip)) {
	console.error("Usage: node tests/clean-machine/smoke.mjs <GodlyPanel-win.zip> [--no-conan]");
	process.exit(2);
}

const WORK = process.env.GP_WORK ?? "C:/gp-clean";
const OUT = path.resolve(process.env.GP_ARTIFACTS ?? "clean-machine-artifacts");
const APP = path.join(WORK, "app");
// Defaults are what a clean machine uses; GP_PORT / GP_DEBUG_PORT let a developer's PC run it beside other things.
const PORT = Number(process.env.GP_PORT) || 8765;
const DEBUG_PORT = Number(process.env.GP_DEBUG_PORT) || 9334;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = { username: "admin", password: "CleanMachine!2345" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function step(name, ok, detail = "") {
	results.push({ name, ok, detail });
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + String(detail).slice(0, 300) : ""}`);
	return ok;
}
const ps = (command) => execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim();

let cookie = "";
async function call(method, url, body) {
	const res = await fetch(BASE + url, {
		method,
		headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const set = res.headers.get("set-cookie");
	if (set) cookie = set.split(";")[0];
	const text = await res.text();
	let json;
	try { json = JSON.parse(text); } catch { json = text; }
	return { status: res.status, json };
}

async function until(check, { timeoutMs, everyMs = 3000, label }) {
	const deadline = Date.now() + timeoutMs;
	let last;
	while (Date.now() < deadline) {
		last = await check();
		if (last) return last;
		await sleep(everyMs);
	}
	console.log(`   (timed out waiting for ${label})`);
	return null;
}

function diagnostics(label) {
	const lines = [`===== ${label} =====`];
	const run = (name, cmd) => {
		try { lines.push(`--- ${name}`, ps(cmd)); } catch (e) { lines.push(`--- ${name}: ${e.message.split("\n")[0]}`); }
	};
	run("game processes", "Get-Process | Where-Object { $_.ProcessName -match 'Conan|steamcmd|GodlyPanel' } | Select-Object ProcessName, Id, @{n='MB';e={[int]($_.WorkingSet64/1MB)}} | Format-Table -AutoSize | Out-String");
	run("UDP endpoints on the game's ports", "Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8892,8893,8894,8902,8903,8904 } | Select-Object LocalPort, OwningProcess | Format-Table -AutoSize | Out-String");
	run("TCP listeners on the RCON port", "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8895,8905 } | Select-Object LocalPort, OwningProcess | Format-Table -AutoSize | Out-String");
	const data = path.join(APP, "data");
	try { lines.push("--- recorded process ids", fs.readFileSync(path.join(data, "state", "server-pids.json"), "utf8")); } catch (e) { lines.push("--- recorded process ids: " + e.message); }
	try { lines.push("--- servers.json", fs.readFileSync(path.join(data, "servers.json"), "utf8")); } catch {}
	for (const [name, file] of [["api.log (tail)", path.join(data, "logs", "api.log")]]) {
		try { lines.push(`--- ${name}`, fs.readFileSync(file, "utf8").split("\n").slice(-60).join("\n")); } catch {}
	}
	try {
		const jobs = path.join(data, "jobs", "creation");
		for (const f of fs.readdirSync(jobs)) lines.push(`--- job log ${f} (tail)`, fs.readFileSync(path.join(jobs, f), "utf8").split("\n").slice(-25).join("\n"));
	} catch {}
	try {
		const logs = path.join(data, "servers", "conan-clean", "ConanSandbox", "Saved", "Logs");
		for (const f of fs.readdirSync(logs).filter((n) => n.endsWith(".log"))) lines.push(`--- game log ${f} (tail)`, fs.readFileSync(path.join(logs, f), "utf8").split("\n").slice(-40).join("\n"));
	} catch {}
	fs.writeFileSync(path.join(OUT, `diagnostics-${label.replace(/\W+/g, "-")}.txt`), lines.join("\n"));
}

// ---------------------------------------------------------------------------
console.log(`Unzipping ${zip} to ${APP} ...`);
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
ps(`Expand-Archive -LiteralPath '${path.resolve(zip)}' -DestinationPath '${APP.replaceAll("/", "\\")}' -Force`);
step("the zip unpacks to the expected layout", fs.existsSync(path.join(APP, "GodlyPanel.exe")) && fs.existsSync(path.join(APP, "data", "portable.txt")));

const env = { ...process.env };
if (process.env.GP_PORT) {
	// The app takes its port from its own config.
	const configFile = path.join(APP, "data", "config.json");
	let existing = {};
	try { existing = JSON.parse(fs.readFileSync(configFile, "utf8")); } catch {}
	fs.writeFileSync(configFile, JSON.stringify({ ...existing, http: { ...existing.http, port: PORT } }));
}
delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(path.join(APP, "GodlyPanel.exe"), [`--remote-debugging-port=${DEBUG_PORT}`], { env, stdio: "ignore", cwd: APP });
let browser;
let page;

try {
	const status = await until(async () => {
		try { const r = await fetch(`${BASE}/api/setup/status`); return r.ok ? await r.json() : null; } catch { return null; }
	}, { timeoutMs: 90_000, everyMs: 1000, label: "the app's web server" });
	if (!step("the app starts and its web server answers", Boolean(status))) throw new Error("app didn't start");
	step("it reports a first run", status.setupRequired === true);

	// ---- the first-run screen, in the real window
	browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
	page = await until(async () => browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().startsWith(BASE)), { timeoutMs: 30_000, everyMs: 500, label: "the window" });
	step("a window opens on the panel", Boolean(page));
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(800);
	await page.screenshot({ path: path.join(OUT, "1-welcome.png") });
	step("the welcome screen renders", /Welcome to GodlyPanel/.test(await page.evaluate(() => document.body.innerText)));

	await page.getByRole("button", { name: "Continue" }).click();
	await page.getByLabel("Username").fill(ADMIN.username);
	await page.getByLabel("Password", { exact: true }).fill(ADMIN.password);
	await page.getByLabel("Confirm password").fill(ADMIN.password);
	await page.getByRole("button", { name: /create account/i }).click();
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(1500);
	await page.screenshot({ path: path.join(OUT, "2-dashboard-empty.png") });
	step("the admin account is created and the dashboard opens", /Create Server/i.test(await page.evaluate(() => document.body.innerText)));

	const login = await call("POST", "/api/auth/login", ADMIN);
	step("signing in works", login.status === 200);

	// ---- start with Windows: the real login entry, written by the real app
	const runKey = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
	await call("PUT", "/api/settings", { startup: { openAtLogin: true, startHidden: true } });
	await sleep(3000);
	const loginEntry = ps(`(Get-ItemProperty '${runKey}' -ErrorAction SilentlyContinue).PSObject.Properties | Where-Object { $_.Value -like '*GodlyPanel*' } | ForEach-Object { $_.Value }`);
	step("turning on start-with-Windows writes the login entry, hidden", /GodlyPanel\.exe/i.test(loginEntry) && /--hidden/.test(loginEntry), loginEntry);
	await call("PUT", "/api/settings", { startup: { openAtLogin: false } });
	await sleep(3000);
	const gone2 = ps(`(Get-ItemProperty '${runKey}' -ErrorAction SilentlyContinue).PSObject.Properties | Where-Object { $_.Value -like '*GodlyPanel*' } | Measure-Object | ForEach-Object { $_.Count }`);
	step("and turning it off removes it", gone2 === "0", gone2);

	// ---- the newer features, in the packaged app on a machine that has never seen it
	const checklist = (await call("GET", "/api/settings/checklist")).json;
	step("the setup checklist answers", Array.isArray(checklist.items) && checklist.items.some((i) => i.id === "servers"), JSON.stringify(checklist.items?.map((i) => i.id)));
	const access = (await call("GET", "/api/settings/access")).json;
	step("it says where the panel can be opened from", typeof access.port === "number" && Array.isArray(access.addresses), JSON.stringify(access).slice(0, 160));
	step("the Discord bot is off until set up", (await call("GET", "/api/settings/discord-bot")).json.status === "off");
	const shelf = path.join(WORK, "offsite-copies");
	const dest = await call("POST", "/api/settings/backup-destinations", { type: "folder", name: "Clean shelf", folder: { path: shelf } });
	step("a folder for off-PC backup copies can be added", dest.status === 201, JSON.stringify(dest.json).slice(0, 160));
	const tested = await call("POST", "/api/settings/backup-destinations/test", { id: dest.json.id });
	step("and tested", tested.json.ok === true, JSON.stringify(tested.json).slice(0, 160));
	await page.getByRole("button", { name: "Appearance" }).click();
	await page.getByRole("menuitem", { name: "Light" }).click();
	await page.waitForTimeout(500);
	const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
	step("the interface switches to the light theme", /243, 245, 247/.test(lightBg), lightBg);
	await page.screenshot({ path: path.join(OUT, "2b-dashboard-light.png") });
	await page.getByRole("button", { name: "Appearance" }).click();
	await page.getByRole("menuitem", { name: "Dark" }).click();
	// Resizing a packaged window from the test isn't supported everywhere; the phone-width layout is
	// checked in tests/ui/appearance.mjs, so a failure to resize only skips this check.
	try {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(600);
		const narrow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, view: window.innerWidth }));
		step("and fits a phone-width screen", narrow.scroll <= narrow.view + 1, JSON.stringify(narrow));
		await page.screenshot({ path: path.join(OUT, "2c-dashboard-phone.png") });
		await page.setViewportSize({ width: 1280, height: 800 });
	} catch (e) {
		console.log(`SKIP  the phone-width check (${String(e.message).slice(0, 120)})`);
	}


	if (withConan) {
		// ---- the exact mistake a tester made: the query port one above the game port
		const bad = await call("POST", "/api/servers", { templateId: "conan", name: "Conan Clean", sessionName: "Clean", serverPassword: "abcdef", port: 8892, queryPort: 8893, rconPort: 8895, acceptSteamCmdDownload: true });
		step("Conan with its query port one above the game port is refused", bad.status === 400 && /game port \+ 1/.test(bad.json.error), bad.json.error);

		// ---- declining SteamCMD must not download anything
		const declined = await call("POST", "/api/servers", { templateId: "conan", name: "Conan Clean", sessionName: "Clean", serverPassword: "abcdef", port: 8892, queryPort: 8894, rconPort: 8895 });
		step("without consent, SteamCMD is not downloaded", declined.status === 409 && !fs.existsSync(path.join(APP, "data", "tools", "steamcmd")));

		// ---- a real install
		const created = await call("POST", "/api/servers", { templateId: "conan", name: "Conan Clean", sessionName: "Clean", serverPassword: "abcdef", port: 8892, queryPort: 8894, rconPort: 8895, acceptSteamCmdDownload: true });
		if (!step("creating a Conan server is accepted", created.status === 200, JSON.stringify(created.json))) throw new Error("creation refused");
		const jobId = created.json.jobId;
		const job = await until(async () => {
			const j = (await call("GET", `/api/servers/create/${jobId}`)).json;
			return j.status === "done" || j.status === "error" ? j : null;
		}, { timeoutMs: 25 * 60_000, everyMs: 10_000, label: "the install" });
		step("SteamCMD downloads Conan Exiles and the install completes", job?.status === "done", job ? `status ${job.status} ${job.error ?? ""}` : "timed out");
		if (job?.status !== "done") throw new Error("install failed");

		const entry = (await call("GET", "/api/status")).json["Conan Clean"];
		step("the server appears on the dashboard", Boolean(entry));
		const script = fs.readFileSync(path.join(APP, "data", "servers", "conan-clean", "Start_Conan.bat"), "utf8");
		step("its start script uses the intended ports", /-Port=8892 -QueryPort=8894/.test(script), script.split("\n").find((l) => /start/i.test(l)));
		const win = (await call("GET", "/api/server/Conan%20Clean/window")).json;
		step("its direct launch was recorded", Boolean(win.launch?.exe), win.launch?.exe);

		// ---- start it and wait for the panel to see it online
		const started = await call("POST", "/api/control/Conan%20Clean/start");
		step("Start is accepted", started.status === 200, JSON.stringify(started.json));
		const online = await until(async () => (await call("GET", "/api/status")).json["Conan Clean"]?.online === true, { timeoutMs: 8 * 60_000, everyMs: 10_000, label: "the server to show online" });
		diagnostics("after-start");
		step("the panel sees the server online (its query answers)", Boolean(online));
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "Expand All" }).waitFor({ timeout: 60_000 });
		await page.waitForTimeout(1500);
		await page.screenshot({ path: path.join(OUT, "3-dashboard-conan.png"), fullPage: true });

		const udp = ps("(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8892,8893,8894 } | Select-Object -ExpandProperty LocalPort | Sort-Object) -join ','");
		step("the game binds its game, raw and query ports", udp === "8892,8893,8894", `bound: ${udp}`);

		// ---- logs, players, a backup that stops and restarts the real game, crash recovery
		const base = "/api/server/Conan%20Clean";
		const idle = async () => !(await call("GET", "/api/operations")).json["Conan Clean"];
		const logs = (await call("GET", base + "/logs")).json;
		step("its real log file is found", Array.isArray(logs) && logs.some((l) => /ConanSandbox.*\.log/i.test(l.name)), (logs ?? []).map?.((l) => l.name).join(", "));
		const mainLog = logs.find((l) => /^ConanSandbox\.log$/i.test(l.name)) ?? logs[0];
		const tail = mainLog ? (await call("GET", `${base}/logs/${mainLog.id}?lines=100`)).json : { lines: [] };
		step("and has real content", tail.lines.length > 10, `${tail.lines.length} lines`);
		step("the players view answers", Array.isArray((await call("GET", base + "/players")).json.online));

		await until(idle, { timeoutMs: 60_000, everyMs: 2000, label: "the start to finish" });
		fs.writeFileSync(path.join(APP, "data", "servers", "conan-clean", "ConanSandbox", "Saved", "gp-marker.txt"), "v1\n");
		const backup = await call("POST", base + "/backups", {});
		step("a backup is accepted", backup.status === 202, JSON.stringify(backup.json));
		await until(async () => ps("(Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Measure-Object).Count") === "0", { timeoutMs: 3 * 60_000, everyMs: 1000, label: "the game to be stopped for the copy" });
		await until(idle, { timeoutMs: 15 * 60_000, everyMs: 3000, label: "the backup to finish" });
		const backups = (await call("GET", base + "/backups")).json;
		step("the backup exists and is consistent", backups.backups.length === 1 && backups.backups[0].consistent === true, `${((backups.backups[0]?.sizeBytes ?? 0) / 1048576).toFixed(0)} MB`);
		step("and the real game was started again after it", Boolean(await until(async () => (await call("GET", "/api/status")).json["Conan Clean"]?.online === true, { timeoutMs: 12 * 60_000, everyMs: 5000, label: "Conan back online" })));
		await until(idle, { timeoutMs: 60_000, everyMs: 2000, label: "idle" });

		await call("PUT", base + "/options", { autoRestart: true });
		await sleep(8000);
		ps(`Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${WORK.replaceAll("/", "\\")}*' } | Stop-Process -Force`);
		step("the panel restarts the game after it is killed", Boolean(await until(async () => (await call("GET", `/api/activity?server=Conan%20Clean&types=server.restarted.auto`)).json.length > 0, { timeoutMs: 6 * 60_000, everyMs: 3000, label: "an automatic restart" })));
		step("and it comes back online", Boolean(await until(async () => (await call("GET", "/api/status")).json["Conan Clean"]?.online === true, { timeoutMs: 12 * 60_000, everyMs: 5000, label: "Conan back online" })));
		await call("PUT", base + "/options", { autoRestart: false });
		await until(idle, { timeoutMs: 60_000, everyMs: 2000, label: "idle" });

		// ---- ports cannot be changed while it runs; once stopped they can
		const whileRunning = await call("PUT", "/api/server/Conan%20Clean/ports", { ports: { port: 8902 } });
		step("ports can't be changed while it is running", whileRunning.status === 409);
		const stop = await call("POST", "/api/control/Conan%20Clean/stop");
		step("Stop is accepted", stop.status === 200, JSON.stringify(stop.json));
		const gone = await until(() => ps("(Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Measure-Object).Count") === "0", { timeoutMs: 5 * 60_000, everyMs: 5000, label: "the server to exit" });
		step("Conan exits after Stop", Boolean(gone));
		// The panel's own view of "stopped" lags the process by a poll or two.
		const settled = await until(async () => (await call("GET", "/api/server/Conan%20Clean/ports")).json.running === false, { timeoutMs: 120_000, everyMs: 5000, label: "the panel to see it stopped" }).catch(() => false);
		diagnostics("after-stop");
		step("the panel sees it stopped", Boolean(settled));

		// ---- restore: put the marker back
		fs.writeFileSync(path.join(APP, "data", "servers", "conan-clean", "ConanSandbox", "Saved", "gp-marker.txt"), "v2\n");
		const restore = await call("POST", base + "/backups/" + backups.backups[0].id + "/restore", { confirmName: "Conan Clean" });
		step("a restore is accepted", restore.status === 202, JSON.stringify(restore.json));
		await until(idle, { timeoutMs: 10 * 60_000, everyMs: 3000, label: "the restore" });
		step("and puts the saved files back", fs.readFileSync(path.join(APP, "data", "servers", "conan-clean", "ConanSandbox", "Saved", "gp-marker.txt"), "utf8") === "v1\n");

		const changed = await call("PUT", "/api/server/Conan%20Clean/ports", { ports: { port: 8902, queryPort: 8904, rconPort: 8905 } });
		step("its ports can be changed once stopped", changed.status === 200, changed.json.error);
		const script2 = fs.readFileSync(path.join(APP, "data", "servers", "conan-clean", "Start_Conan.bat"), "utf8");
		step("the start script now uses the new ports", /-Port=8902 -QueryPort=8904/.test(script2));

		// ---- delete it, files and all
		const removal = (await call("GET", "/api/server/Conan%20Clean/removal")).json;
		step("deleting its files is offered", removal.canDeleteFiles === true && removal.mode === "folder", removal.reason);
		const deleted = await call("DELETE", "/api/server/Conan%20Clean", { confirmName: "Conan Clean", deleteFiles: true });
		step("the server is deleted", deleted.status === 200, deleted.json.error);
		step("its folder is gone from disk", !fs.existsSync(path.join(APP, "data", "servers", "conan-clean")));
		step("and it's gone from the dashboard", (await call("GET", "/api/status")).json["Conan Clean"] === undefined);
	}
} catch (e) {
	step("the run completed without an unexpected error", false, e.message);
	diagnostics("failure");
} finally {
	try { await page?.screenshot({ path: path.join(OUT, "z-final.png") }); } catch {}
	try { await browser?.close(); } catch {}
	try { execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
	// Only what this run started: the test may be run on a PC that has real servers.
	try { ps(`Get-Process ConanSandboxServer*, steamcmd -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${WORK.replaceAll("/", "\\")}*' } | Stop-Process -Force`); } catch {}
	// And no login entry left behind if the run stopped halfway through the startup check.
	try { ps(`$k='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; (Get-ItemProperty $k).PSObject.Properties | Where-Object { $_.Value -like '*${WORK.replaceAll("/", "\\\\")}*' } | ForEach-Object { Remove-ItemProperty -Path $k -Name $_.Name }`); } catch {}
	try { fs.copyFileSync(path.join(APP, "data", "logs", "api.log"), path.join(OUT, "api.log")); } catch {}
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log("FAILED:\n  " + failed.map((f) => f.name).join("\n  "));
process.exit(failed.length ? 1 : 0);
