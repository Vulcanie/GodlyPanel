// The community view against the real Cloudflare, not a stand-in: download cloudflared from its official
// release, start a temporary ("quick") tunnel, and use the public address it gives out from the open
// internet, with the real program in a real browser. Needs internet; makes nothing permanent.
//
// Ports: the panel on 7100 and the community view's small server on 7101, which are the ones reserved
// for testing. It never touches an existing tunnel: the quick tunnel is a separate connection that
// disappears when stopped. Run: node tests/real/community-view.mjs
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browsers = path.join(os.homedir(), "AppData/Local/ms-playwright");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(browsers).filter((d) => d.startsWith("chromium-")).map((d) => path.join(browsers, d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const SHOTS = process.env.GP_SHOTS ? path.resolve(process.env.GP_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const PANEL = 7100;
const SMALL = 7101;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-community-real-"));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PANEL, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
// A pretend server, so the dashboard has something to show and something to hide.
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [{ name: "Demo World", type: "custom", method: "process", processName: "nope-demo.exe", host: "127.0.0.1", installDir: root, workingDir: root, sessionName: "Demo World", serverPassword: "join-secret", rconPassword: "rcon-secret" }] }));

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const env = { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PANEL), GHP_RESOURCE_ROOT: path.join(repo, "resources") };
delete env.GHP_CLOUDFLARED_EXE;
delete env.GHP_CLOUDFLARED_NONE;
let api;
let browser;
const cloudflaredPids = () => {
	try {
		return execFileSync("powershell", ["-NoProfile", "-Command", `Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" | Where-Object { $_.ExecutablePath -like '${root}*' } | ForEach-Object { $_.ProcessId }`], { encoding: "utf8" }).split(/\s+/).filter(Boolean).map(Number);
	} catch { return []; }
};

try {
	// ---- the real download, into this test's own data folder
	process.env.GHP_DATA_DIR = root;
	const { installCloudflared, managedExe } = await import("../../src/server/services/cloudflared.js");
	const log = [];
	await installCloudflared((m) => log.push(m));
	check("cloudflared downloads from Cloudflare's release and runs", fs.existsSync(managedExe), log.join(" | "));
	check("and its checksum was verified", log.some((l) => /Checksum matches/.test(l)), log.join(" | "));

	api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env, stdio: "ignore" });
	const B = `http://127.0.0.1:${PANEL}`;
	for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await sleep(250); }
	const call = async (method, p, body, cookie) => {
		const r = await fetch(B + p, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
		return { status: r.status, json: await r.json().catch(() => null), headers: r.headers };
	};
	await call("POST", "/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });
	const admin = (await call("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" })).headers.get("set-cookie").split(";")[0];
	await call("POST", "/api/users", { username: "viewer", password: "ViewerPass!234", role: "guest" }, admin);
	const code = (await call("PUT", "/api/users/invite", { enabled: true }, admin)).json.code;

	const seen = (await call("GET", "/api/community", undefined, admin)).json;
	check("the panel sees the downloaded program", seen.cloudflared.found && seen.cloudflared.source === "panel", JSON.stringify(seen.cloudflared));

	// ---- start it
	check("settings accept the small server's port", (await call("PUT", "/api/community", { mode: "quick", port: SMALL }, admin)).status === 200);
	const on = await call("POST", "/api/community/enable", {}, admin);
	check("it turns on", on.status === 200, JSON.stringify(on.json).slice(0, 300));
	let st;
	for (let i = 0; i < 120; i++) {
		st = (await call("GET", "/api/community", undefined, admin)).json;
		if (st.tunnel.status === "connected" && st.publicUrl) break;
		await sleep(1000);
	}
	check("Cloudflare gives out an address and the tunnel connects", st.tunnel.status === "connected" && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/$/.test(st.publicUrl ?? ""), st.publicUrl + " | " + st.tunnel.lines.slice(-4).join(" | "));
	const PUBLIC = (st.publicUrl ?? "").replace(/\/$/, "");
	console.log("   public address:", PUBLIC);
	check("the program running is ours (from the test folder), one process", cloudflaredPids().length === 1, String(cloudflaredPids()));

	// The address can take a few seconds to be reachable from outside.
	let page;
	let why = "";
	for (let i = 0; i < 40; i++) {
		try { page = await fetch(PUBLIC + "/api/auth/join"); why = `HTTP ${page.status}`; if (page.status === 200) break; } catch (e) { why = `${e.message} / ${e.cause?.code ?? e.cause?.message ?? ""}`; }
		await sleep(2000);
	}
	check("the address answers from the internet", page?.status === 200, why);
	check("it says a community code is available", (await page.json()).open === true);

	// ---- what the outside world gets
	const out = async (method, p, body, cookie) => {
		const r = await fetch(PUBLIC + p, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
		return { status: r.status, text: await r.text(), headers: r.headers };
	};
	const html = await out("GET", "/");
	check("the sign-in page loads over https", html.status === 200 && html.text.includes('<div id="root">'));
	check("the panel's data needs a sign-in", (await out("GET", "/api/status")).status === 401);
	const adminTry = await out("POST", "/api/auth/login", { username: "admin", password: "TestAdmin!2345" });
	check("the administrator cannot sign in there", adminTry.status === 401 && !adminTry.headers.get("set-cookie"), adminTry.text);
	const guestLogin = await out("POST", "/api/auth/login", { username: "viewer", password: "ViewerPass!234" });
	check("a guest can", guestLogin.status === 200, guestLogin.text);
	const cookieHeader = guestLogin.headers.get("set-cookie") ?? "";
	check("their cookie is Secure, HttpOnly, SameSite=Strict", /Secure/i.test(cookieHeader) && /HttpOnly/i.test(cookieHeader) && /SameSite=Strict/i.test(cookieHeader), cookieHeader);
	const guest = cookieHeader.split(";")[0];
	const status = await out("GET", "/api/status", undefined, guest);
	check("they see the dashboard", status.status === 200 && status.text.includes("Demo World"));
	check("without any password in it", !status.text.includes("join-secret") && !status.text.includes("rcon-secret"));
	for (const p of ["/api/users", "/api/settings", "/api/community", "/api/server/Demo%20World", "/api/config/Demo%20World"]) check(`GET ${p} does not exist there`, (await out("GET", p, undefined, guest)).status === 404);
	check("nothing can be controlled", (await out("POST", "/api/control/Demo%20World/stop", {}, guest)).status === 404);
	// Temporary Cloudflare links are documented not to carry live streams (server-sent events); named tunnels do.
	// Either is fine as long as the page keeps itself up to date, which the browser part below checks.
	let streamWorks = false;
	try {
		const sse = await fetch(PUBLIC + "/api/events", { headers: { Cookie: guest }, signal: AbortSignal.timeout(15_000) });
		const first = await sse.body.getReader().read();
		streamWorks = sse.status === 200 && new TextDecoder().decode(first.value).includes("connected");
		await sse.body.cancel();
	} catch {
		streamWorks = false;
	}
	console.log(`   live stream through this tunnel: ${streamWorks ? "works" : "cut (expected for a temporary link)"}`);

	// ---- the panel is still closed to the tunnel
	const direct = await fetch(`${B}/api/auth/me`, { headers: { "cf-connecting-ip": "203.0.113.9" } });
	check("the panel itself refuses anything a tunnel has touched", direct.status === 403);

	// ---- a friend in a real browser
	browser = await chromium.launch({ executablePath: EXE });
	const phone = await (await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true })).newPage();
	const errors = [];
	phone.on("pageerror", (e) => errors.push(e.message));
	let statusRequests = 0;
	phone.on("request", (r) => { if (r.url().includes("/api/status")) statusRequests += 1; });
	await phone.goto(PUBLIC, { waitUntil: "domcontentloaded" });
	await phone.getByText("I have a community code").click();
	await phone.getByLabel("Community code").fill(code);
	await phone.getByLabel("Choose a username").fill("real-friend");
	await phone.getByLabel("Choose a password").fill("FriendPass!123");
	await phone.getByRole("button", { name: "Create my account" }).click();
	await phone.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 30_000 });
	check("a friend joins with the code, in a browser, over the internet", true);
	await phone.getByRole("button", { name: "Expand All" }).click();
	check("and sees the server", await phone.getByText("Demo World").first().waitFor({ timeout: 20_000 }).then(() => true, () => false));
	if (!streamWorks) {
		const before = statusRequests;
		await phone.waitForTimeout(25_000);
		check("with the live stream cut, the page keeps itself up to date by asking", statusRequests > before, `${before} -> ${statusRequests} requests for status`);
	}
	check("without owner-only buttons", (await phone.getByRole("button", { name: /^Settings$|^Users$|Create Server/ }).count()) === 0);
	if (SHOTS) await phone.screenshot({ path: path.join(SHOTS, "community-real-friend.png"), fullPage: true });
	check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

	// ---- off
	const pids = cloudflaredPids();
	const off = await call("POST", "/api/community/disable", {}, admin);
	check("it turns off", off.status === 200 && off.json.tunnel.status === "stopped");
	await sleep(1500);
	check("the tunnel program is gone", cloudflaredPids().length === 0, `was ${pids}`);
	let stillUp = true;
	try { stillUp = (await fetch(PUBLIC + "/api/auth/join", { signal: AbortSignal.timeout(8000) })).status === 200; } catch { stillUp = false; }
	check("and the address no longer reaches the small server", stillUp === false);
} catch (e) {
	bad++;
	console.log("FAIL  the run completed  — " + String(e.stack || e).split("\n").slice(0, 4).join(" | "));
} finally {
	try { await browser?.close(); } catch {}
	api?.kill();
	await sleep(500);
	for (const pid of cloudflaredPids()) { try { process.kill(pid); } catch {} }
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
	console.log(`\n${ok} passed, ${bad} failed`);
	process.exit(bad ? 1 : 0);
}
