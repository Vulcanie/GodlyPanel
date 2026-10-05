// "Update now" against the REAL packaged app, end to end:
//
//   node tests/real/self-update.mjs [--full]
//
// Needs `npm run package` first (dist/win-unpacked). It copies that build into a test folder, runs it, and points it at a
// stand-in for GitHub's releases that offers a second "release" made by repacking the app's own app.asar with a new
// version number. Then it presses the install button through the panel's API and checks what really happens:
//
//   1. a working update: the app closes, its files are swapped, the new version starts, reports healthy, and the temporary
//      files are gone; a game server the panel started keeps running through it, and the data folder is untouched
//   2. a broken update (an app.asar that isn't one): the new version can't start, so the old files are put back and the
//      old version is running again, with a note saying so
//   3. with --full: the same for a release that needs the whole package (a different Electron), which replaces every file
//      except `data`
//
// Safety: everything happens inside C:\gp-testbed\selfupdate on port 7100 (one of the ports the real-game tests are allowed
// to use). Only processes running from inside that folder are ever stopped. Nothing of the real panel at C:\GodlyPanelApp,
// its servers or its port is touched.
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import asar from "@electron/asar";
import { createZip } from "../../src/server/util/tarZip.js";
import { portBusy } from "../../src/server/util/portProbe.js";
import { makeFakeGame } from "../helpers/fakeGame.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WORK = "C:/gp-testbed/selfupdate";
const PORT = 7100;
const GH_PORT = 7101;
const withFull = process.argv.includes("--full");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const realElectron = JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", "electron", "package.json"), "utf8")).version;

let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
	if (ok) passed += 1;
	else failed += 1;
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const step = (title) => console.log(`\n[${new Date().toLocaleTimeString()}] ${title}`);

async function until(fn, { timeoutMs = 120_000, everyMs = 1000, label = "" } = {}) {
	const end = Date.now() + timeoutMs;
	while (Date.now() < end) {
		const v = await fn();
		if (v) return v;
		await sleep(everyMs);
	}
	throw new Error(`Timed out waiting for ${label || "a condition"}.`);
}

const powershell = (command) => execFileSync("powershell", ["-NoProfile", "-Command", command], { encoding: "utf8" }).trim();
const processesIn = (folder) =>
	JSON.parse(
		powershell(`$p = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${folder.replaceAll("/", "\\")}*' } | Select-Object ProcessId, Name; if ($p) { ConvertTo-Json -InputObject @($p) } else { '[]' }`),
	);
const killAllIn = (folder) => {
	powershell(`Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '${folder.replaceAll("/", "\\")}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`);
};

// ---- the panel, over HTTP --------------------------------------------------------------------------------------------
let cookie = "";
const base = `http://127.0.0.1:${PORT}`;
async function call(method, url, body) {
	const res = await fetch(base + url, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
	const set = res.headers.get("set-cookie");
	if (set) cookie = set.split(";")[0];
	const text = await res.text();
	try {
		return { status: res.status, json: JSON.parse(text) };
	} catch {
		return { status: res.status, json: text };
	}
}
const up = async () => {
	try {
		return (await fetch(`${base}/api/setup/status`, { signal: AbortSignal.timeout(3000) })).ok;
	} catch {
		return false;
	}
};
const updateStatus = async () => (await call("GET", "/api/updates/panel")).json;

// The update script finishes a moment after the new version answers: it writes its verdict and tidies up once the new
// version has said it is up. Wait for that, as a person looking at the page would.
async function settled(appDirForCheck) {
	try {
		await until(async () => (await updateStatus())?.selfUpdate?.lastUpdate && !fs.existsSync(path.join(appDirForCheck, ".update-backup")), { timeoutMs: 40_000, everyMs: 500, label: "the update to be wrapped up" });
	} catch {
		// The checks below say what is missing.
	}
}

// Wait for the panel to go away and answer again. Stops at once, with the panel's own reason, if the update is refused.
async function waitForRestart(timeoutMs, label) {
	let sawDown = false;
	await until(async () => {
		if (!(await up())) {
			sawDown = true;
			return false;
		}
		if (sawDown) return true;
		const install = (await updateStatus())?.selfUpdate?.install;
		if (install?.phase === "failed") throw new Error(`The update was refused: ${install.error}`);
		return false;
	}, { timeoutMs, everyMs: 500, label });
	return sawDown;
}

// ---- making a second "release" ---------------------------------------------------------------------------------------
async function makeRelease({ name, version, electron = realElectron, broken = false, full = false, appBuild }) {
	const dir = path.join(WORK, "releases", name);
	const unpacked = path.join(dir, "unpacked");
	fs.mkdirSync(path.join(unpacked), { recursive: true });
	fs.cpSync(path.join(appBuild, "resources"), path.join(unpacked, "resources"), { recursive: true });
	const asarFile = path.join(unpacked, "resources", "app.asar");
	if (broken) {
		fs.writeFileSync(asarFile, crypto.randomBytes(200_000));
	} else {
		const tmp = path.join(dir, "asar-src");
		asar.extractAll(path.join(appBuild, "resources", "app.asar"), tmp);
		const pkgFile = path.join(tmp, "package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
		pkg.version = version;
		fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
		fs.rmSync(asarFile, { force: true });
		await asar.createPackage(tmp, asarFile);
		fs.rmSync(tmp, { recursive: true, force: true });
	}
	execFileSync(process.execPath, [path.join(ROOT, "scripts", "make-update-payload.mjs"), "--unpacked", unpacked, "--out", dir, "--version", version, "--electron", electron], { stdio: "pipe" });
	const appZip = path.join(dir, `GodlyPanel-${version}-app.zip`);
	const assets = { [`GodlyPanel-${version}-app.zip`]: fs.readFileSync(appZip) };
	const manifest = { format: 1, version, electron, app: { name: `GodlyPanel-${version}-app.zip`, size: assets[`GodlyPanel-${version}-app.zip`].length, sha256: sha(assets[`GodlyPanel-${version}-app.zip`]) } };
	if (full) {
		// The whole package: everything of the app build except its data folder, with the new resources.
		const tree = path.join(dir, "tree");
		fs.mkdirSync(tree, { recursive: true });
		for (const entry of fs.readdirSync(appBuild)) {
			if (entry === "data") continue;
			if (entry === "resources") fs.cpSync(unpacked + "/resources", path.join(tree, "resources"), { recursive: true });
			else fs.cpSync(path.join(appBuild, entry), path.join(tree, entry), { recursive: true });
		}
		const zip = path.join(dir, `GodlyPanel-${version}-win.zip`);
		await createZip(zip, fs.readdirSync(tree).map((n) => ({ dir: tree, name: n })));
		const bytes = fs.readFileSync(zip);
		assets[`GodlyPanel-${version}-win.zip`] = bytes;
		manifest.full = { name: `GodlyPanel-${version}-win.zip`, size: bytes.length, sha256: sha(bytes) };
		fs.rmSync(tree, { recursive: true, force: true });
	}
	assets["update-manifest.json"] = Buffer.from(JSON.stringify(manifest));
	return { version, assets, asarSha: sha(fs.readFileSync(asarFile)) };
}

// ---- go --------------------------------------------------------------------------------------------------------------
const appBuild = path.join(ROOT, "dist", "win-unpacked");
if (!fs.existsSync(path.join(appBuild, "resources", "scripts", "apply-update.ps1"))) {
	console.error('No packaged app with the updater in dist/win-unpacked. Run "npm run package" first.');
	process.exit(2);
}
if ((await portBusy(PORT)) || (await portBusy(GH_PORT))) {
	console.error(`Port ${PORT} or ${GH_PORT} is busy; not running.`);
	process.exit(2);
}
killAllIn(WORK);
fs.rmSync(WORK, { recursive: true, force: true });
const appDir = path.join(WORK, "app");
fs.mkdirSync(WORK, { recursive: true });
fs.cpSync(appBuild, appDir, { recursive: true });
const exe = path.join(appDir, "GodlyPanel.exe");
const asarBytes = (dir) => sha(fs.readFileSync(path.join(dir, "resources", "app.asar")));
const startAsarSha = asarBytes(appDir);

const oldPackage = JSON.parse(asar.extractFile(path.join(appDir, "resources", "app.asar"), "package.json").toString("utf8"));
const OLD = oldPackage.version;
const NEW = `${OLD}-e2e1`;
const BAD = `${OLD}-e2e2`;
const FULL = `${OLD}-e2e3`;

let release = null;
const github = http.createServer((req, res) => {
	if (req.url.startsWith("/repos/")) {
		res.setHeader("Content-Type", "application/json");
		if (!release) return res.end("[]");
		return res.end(
			JSON.stringify([
				{
					tag_name: `v${release.version}`,
					name: `GodlyPanel ${release.version}`,
					prerelease: true,
					published_at: new Date().toISOString(),
					body: "A test release.",
					assets: Object.entries(release.assets).map(([n, b]) => ({ name: n, size: b.length, browser_download_url: `http://127.0.0.1:${GH_PORT}/dl/${n}` })),
				},
			]),
		);
	}
	const file = release?.assets[decodeURIComponent(req.url.replace(/^\/dl\//, ""))];
	if (!file) {
		res.statusCode = 404;
		return res.end();
	}
	res.end(file);
});
await new Promise((resolve) => github.listen(GH_PORT, "127.0.0.1", resolve));

let game = null;
try {
	step(`Preparing: the app is ${OLD}; making releases ${NEW} (works), ${BAD} (broken)${withFull ? `, ${FULL} (needs the whole package)` : ""}`);
	const good = await makeRelease({ name: "good", version: NEW, appBuild });
	const bad = await makeRelease({ name: "bad", version: BAD, broken: true, appBuild });
	const whole = withFull ? await makeRelease({ name: "whole", version: FULL, electron: "99.0.0", full: true, appBuild }) : null;
	check("the update is a small download", good.assets[`GodlyPanel-${NEW}-app.zip`].length < 10 * 1024 * 1024, `${(good.assets[`GodlyPanel-${NEW}-app.zip`].length / 1048576).toFixed(1)} MB`);

	// The app's data: portable, beside it. A config that points updates at the stand-in, and a game server to leave alone.
	const dataDir = path.join(appDir, "data");
	fs.writeFileSync(path.join(dataDir, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false }, updates: { check: false, includePrereleases: true, repo: "test/repo" } }));
	const gameDir = path.join(dataDir, "servers", "e2e-game");
	const entry = makeFakeGame(gameDir, { name: "E2E Game", rconPort: 8893, exe: "gp-e2e-game.exe" });
	fs.writeFileSync(path.join(dataDir, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [entry] }));
	fs.writeFileSync(path.join(dataDir, "canary.txt"), "my data");

	step("Starting the packaged app");
	const env = { ...process.env, GHP_UPDATE_API: `http://127.0.0.1:${GH_PORT}` };
	delete env.ELECTRON_RUN_AS_NODE;
	spawn(exe, ["--hidden"], { cwd: appDir, env, detached: true, stdio: "ignore" }).unref();
	await until(up, { timeoutMs: 90_000, label: "the panel to answer" });
	check("the packaged app starts", true);
	let r = await call("POST", "/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });
	check("an administrator is created", r.status === 200, JSON.stringify(r.json).slice(0, 100));
	await call("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" });
	r = await call("POST", "/api/control/E2E%20Game/start");
	check("a game server is started by the panel", r.status === 200);
	await until(async () => (await call("GET", "/api/status")).json["E2E Game"]?.online === true, { timeoutMs: 60_000, label: "the game server to be online" });
	const gamePid = () => processesIn(gameDir).find((p) => p.Name === "gp-e2e-game.exe")?.ProcessId;
	game = gamePid();
	check("it is running", Boolean(game), `pid ${game}`);

	// ---------------------------------------------------------------- 1. a working update
	step(`1. Updating ${OLD} -> ${NEW}`);
	release = good;
	let s = (await call("POST", "/api/updates/panel/check", {})).json;
	check("the panel sees the new version", s.available === true && s.latest?.version === NEW);
	check("it can update itself, with the small download", s.selfUpdate?.support?.ok === true && s.selfUpdate?.plan?.kind === "app", JSON.stringify({ support: s.selfUpdate?.support, plan: s.selfUpdate?.plan }));
	r = await call("POST", "/api/updates/panel/install", {});
	check("the install is accepted", r.status === 202, JSON.stringify(r.json));
	let sawDown = await waitForRestart(180_000, "the panel to go down and come back");
	check("the panel went away and came back", sawDown);
	await call("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" });
	await settled(appDir);
	s = await updateStatus();
	check("it is now the new version", s.current === NEW, `current ${s.current}`);
	check("and says the update worked", s.selfUpdate?.lastUpdate?.ok === true, JSON.stringify(s.selfUpdate?.lastUpdate));
	check("the app's files are the new ones", asarBytes(appDir) === good.asarSha && asarBytes(appDir) !== startAsarSha);
	check("the temporary backup is gone", !fs.existsSync(path.join(appDir, ".update-backup")));
	check("so are the downloaded and unpacked files", !fs.existsSync(path.join(dataDir, "updates")) || fs.readdirSync(path.join(dataDir, "updates")).length === 0, fs.existsSync(path.join(dataDir, "updates")) ? fs.readdirSync(path.join(dataDir, "updates")).join(",") : "");
	check("the data folder is untouched", fs.readFileSync(path.join(dataDir, "canary.txt"), "utf8") === "my data");
	check("the game server kept running, as the same process", gamePid() === game, `pid ${gamePid()}`);
	check("and the new panel still knows it is online", (await call("GET", "/api/status")).json["E2E Game"]?.online === true);
	check("only the app's own new processes are running from the app folder, no leftovers of the old ones", processesIn(appDir).filter((p) => p.Name === "GodlyPanel.exe").length >= 2);
	const log = fs.readFileSync(path.join(dataDir, "logs", "update.log"), "utf8");
	check("the update log says it went through", /The new version is up/.test(log));

	// ---------------------------------------------------------------- 2. a broken update
	step(`2. Updating ${NEW} -> ${BAD} (an app.asar that can't run)`);
	const beforeBad = asarBytes(appDir);
	release = bad;
	await call("POST", "/api/updates/panel/update-result/dismiss", {});
	s = (await call("POST", "/api/updates/panel/check", {})).json;
	check("the panel offers it", s.available === true && s.latest?.version === BAD);
	r = await call("POST", "/api/updates/panel/install", {});
	check("the install is accepted", r.status === 202, JSON.stringify(r.json));
	sawDown = await waitForRestart(240_000, "the panel to go down and the old version to come back");
	await call("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" });
	s = await updateStatus();
	check("the previous version is running again", s.current === NEW, `current ${s.current}`);
	check("with a note that the update was undone", s.selfUpdate?.lastUpdate?.ok === false && s.selfUpdate?.lastUpdate?.rolledBack === true, JSON.stringify(s.selfUpdate?.lastUpdate));
	check("the app's files are the ones from before", asarBytes(appDir) === beforeBad);
	check("the temporary backup is gone", !fs.existsSync(path.join(appDir, ".update-backup")));
	check("the game server still wasn't touched", gamePid() === game);
	check("the data folder is untouched", fs.readFileSync(path.join(dataDir, "canary.txt"), "utf8") === "my data");

	// ---------------------------------------------------------------- 3. the whole package
	if (whole) {
		step(`3. Updating ${NEW} -> ${FULL} (a release built on a different Electron, so the whole package)`);
		release = whole;
		await call("POST", "/api/updates/panel/update-result/dismiss", {});
		s = (await call("POST", "/api/updates/panel/check", {})).json;
		check("the panel plans the whole package", s.selfUpdate?.plan?.kind === "full", JSON.stringify(s.selfUpdate?.plan));
		r = await call("POST", "/api/updates/panel/install", {});
		check("the install is accepted", r.status === 202, JSON.stringify(r.json));
		sawDown = await waitForRestart(300_000, "the panel to go down and come back");
		await call("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" });
		await settled(appDir);
		s = await updateStatus();
		check("it is now the new version", s.current === FULL, `current ${s.current}`);
		check("and says the update worked", s.selfUpdate?.lastUpdate?.ok === true, JSON.stringify(s.selfUpdate?.lastUpdate));
		check("the app's files are the new ones", asarBytes(appDir) === whole.asarSha);
		check("the data folder is untouched", fs.readFileSync(path.join(dataDir, "canary.txt"), "utf8") === "my data");
		check("the game server kept running", gamePid() === game);
		check("the temporary backup is gone", !fs.existsSync(path.join(appDir, ".update-backup")));
	}
} catch (err) {
	check("the run completed", false, String(err.stack || err).split("\n").slice(0, 3).join(" | "));
	try {
		console.log(fs.readFileSync(path.join(appDir, "data", "logs", "update.log"), "utf8").slice(-1500));
	} catch {
		// No log.
	}
} finally {
	github.close();
	killAllIn(WORK);
	await sleep(1500);
	if (!process.argv.includes("--keep")) {
		try {
			fs.rmSync(WORK, { recursive: true, force: true, maxRetries: 15, retryDelay: 400 });
		} catch (err) {
			console.log(`(Couldn't remove ${WORK}: ${err.code}. Remove it by hand.)`);
		}
	}
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
