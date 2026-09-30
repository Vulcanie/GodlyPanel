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
const PORT = 8765;
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
delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(path.join(APP, "GodlyPanel.exe"), ["--remote-debugging-port=9334"], { env, stdio: "ignore", cwd: APP });
let browser;
let page;

try {
	const status = await until(async () => {
		try { const r = await fetch(`${BASE}/api/setup/status`); return r.ok ? await r.json() : null; } catch { return null; }
	}, { timeoutMs: 90_000, everyMs: 1000, label: "the app's web server" });
	if (!step("the app starts and its web server answers", Boolean(status))) throw new Error("app didn't start");
	step("it reports a first run", status.setupRequired === true);

	// ---- the first-run screen, in the real window
	browser = await chromium.connectOverCDP("http://127.0.0.1:9334");
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
		await page.reload({ waitUntil: "networkidle" });
		await page.waitForTimeout(1500);
		await page.screenshot({ path: path.join(OUT, "3-dashboard-conan.png"), fullPage: true });

		const udp = ps("(Get-NetUDPEndpoint -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 8892,8893,8894 } | Select-Object -ExpandProperty LocalPort | Sort-Object) -join ','");
		step("the game binds its game, raw and query ports", udp === "8892,8893,8894", `bound: ${udp}`);

		// ---- ports cannot be changed while it runs; once stopped they can
		const whileRunning = await call("PUT", "/api/server/Conan%20Clean/ports", { ports: { port: 8902 } });
		step("ports can't be changed while it is running", whileRunning.status === 409);
		const stop = await call("POST", "/api/control/Conan%20Clean/stop");
		step("Stop is accepted", stop.status === 200, JSON.stringify(stop.json));
		const gone = await until(() => ps("(Get-Process ConanSandboxServer-Win64-Shipping -ErrorAction SilentlyContinue | Measure-Object).Count") === "0", { timeoutMs: 5 * 60_000, everyMs: 5000, label: "the server to exit" });
		step("Conan exits after Stop", Boolean(gone));
		await sleep(8000);

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
	try { ps("Get-Process ConanSandboxServer*, steamcmd -ErrorAction SilentlyContinue | Stop-Process -Force"); } catch {}
	try { fs.copyFileSync(path.join(APP, "data", "logs", "api.log"), path.join(OUT, "api.log")); } catch {}
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log("FAILED:\n  " + failed.map((f) => f.name).join("\n  "));
process.exit(failed.length ? 1 : 0);
