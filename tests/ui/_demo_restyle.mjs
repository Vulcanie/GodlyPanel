// Starts the real panel against a throwaway data folder with demo servers, then screenshots pages.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repo = "/home/user/GodlyPanel";
const out = process.argv[2] || "/tmp/claude-0/-home-user-GodlyPanel/955396aa-c6c9-5007-a122-7c4c7913ee17/scratchpad/shots";
fs.mkdirSync(out, { recursive: true });
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-demo-"));
const PORT = 8792;
const mk = (name, files) => {
	const dir = path.join(root, "srv", name);
	fs.mkdirSync(dir, { recursive: true });
	for (const [f, content] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
		fs.writeFileSync(path.join(dir, f), content);
	}
	return dir;
};
const valheim = mk("valheim", { "Start_Valheim.bat": '@echo off\r\nstart /MIN "V" valheim_server -nographics -batchmode -name "Godly Valheim" -port 2456 -world "Dedicated" -password "abcdef" -public 1 -logFile "valheim_server.log" -preset hard -modifier combat hard -setkey nobuildcost\r\n' });
const rust = mk("rust", { "Start_Rust.bat": '@echo off\r\nstart /MIN "R" RustDedicated.exe -batchmode -nographics -logfile "rustserver.log" +server.ip 0.0.0.0 +server.port 28015 +server.queryport 28017 +rcon.ip 127.0.0.1 +rcon.port 28018 +rcon.password "x" +rcon.web 0 +app.port -1 +server.identity "server" +server.hostname "Rusty Nail" +server.maxplayers 50 +server.worldsize 3000 +server.seed 1337 +server.saveinterval 300\r\n', "server/server/cfg/server.cfg": 'server.hostname "Rusty Nail"\nserver.maxplayers 50\ndecay.scale 1\n' });
const days = mk("7days", { "startdedicated.bat": '@echo off\r\nstart /MIN "7" 7DaysToDieServer -logfile "output_log.txt" -quit -batchmode -nographics -configfile=serverconfig.xml "-UserDataFolder=%~dp0userdata" -dedicated\r\n', "serverconfig.xml": '<?xml version="1.0"?>\r\n<ServerSettings>\r\n\t<property name="ServerName" value="Tom &amp; Jerry"/>\r\n\t<property name="ServerPort" value="26900"/>\r\n\t<property name="ServerVisibility" value="2"/>\r\n\t<property name="GameDifficulty" value="2"/>\r\n\t<property name="ServerMaxPlayerCount" value="8"/>\r\n\t<property name="SomeModSetting" value="5"/>\r\n</ServerSettings>\r\n' });
const mc = mk("mc", { "server.properties": "motd=Hello\ndifficulty=hard\ngamemode=survival\nmax-players=20\npvp=true\nlevel-type=minecraft\\:normal\nop-permission-level=4\n", "start.bat": "@echo off\r\njava -Xmx6G -jar server.jar nogui\r\n" });
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [
	{ name: "Valheim Friends", type: "valheim", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 2456, installDir: valheim, workingDir: valheim, startScriptPath: path.join(valheim, "Start_Valheim.bat"), serverPassword: "abcdef", tags: ["friends"] },
	{ name: "Rusty Nail", type: "rust", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 28015, installDir: rust, workingDir: rust, startScriptPath: path.join(rust, "Start_Rust.bat"), configPath: path.join(rust, "server/server/cfg/server.cfg") },
	{ name: "Zombie Nights", type: "7days", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 26900, installDir: days, workingDir: days, startScriptPath: path.join(days, "startdedicated.bat"), configPath: path.join(days, "serverconfig.xml"), tags: ["friends", "modded"] },
	{ name: "Mine Craft", type: "minecraft", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 25565, installDir: mc, workingDir: mc, startScriptPath: path.join(mc, "start.bat"), configPath: path.join(mc, "server.properties") },
] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 80; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
if (!process.env.SETUP) await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const theme = process.env.THEME || "dark";
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 200)));
const shot = async (name, full = false) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: full }); console.log("shot", name); };
try {
	await page.goto(B, { waitUntil: "networkidle" });
	if (process.env.SETUP) {
		await page.setViewportSize({ width: Number(process.env.W || 1440), height: 900 });
		await shot("setup1");
		await page.getByRole("button", { name: "Continue" }).click();
		await shot("setup2");
		await page.getByLabel("Username").fill("a");
		await page.getByLabel("Password", { exact: true }).fill("abc");
		await page.getByLabel("Confirm password").fill("abd");
		await shot("setup3");
		console.log("page errors:", errors.length ? errors : "none");
		await browser.close(); api.kill(); process.exit(0);
	}
	if (process.env.W) await page.setViewportSize({ width: Number(process.env.W), height: 900 });
	await shot("login");
	if (process.env.LOGINONLY) {
		await page.getByLabel(/username/i).fill("admin");
		await page.getByLabel(/password/i).fill("wrong");
		await page.getByRole("button", { name: /sign in/i }).click();
		await shot("login-error");
		console.log("page errors:", errors.length ? errors : "none");
		await browser.close(); api.kill(); process.exit(0);
	}
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(1500);
	await shot("dashboard");
	const steps = (process.env.STEPS || "").split(",").filter(Boolean);
	for (const step of steps) {
		const [kind, a, b] = step.split(":");
		if (kind === "server") { await page.getByTestId(`sidebar-server-${a.replace(/_/g, " ")}`).click(); await page.waitForTimeout(1200); await shot(`server-${a}`); }
		if (kind === "tab") { await page.getByTestId(`tab-${a}`).click(); await page.waitForTimeout(1500); await shot(`tab-${a}`, true); }
		if (kind === "file") { await page.getByTestId(`config-file-${a.replace(/_/g, " ")}`).click(); await page.waitForTimeout(800); await shot(`file-${a}`, true); }
		if (kind === "nav") { await page.getByTestId(`nav-${a}`).click(); await page.waitForTimeout(1500); await shot(`nav-${a}`, true); }
		if (kind === "palette") { await page.keyboard.press("Control+k"); await page.waitForTimeout(300); if (a) await page.getByTestId("palette-input").fill(a.replace(/_/g, " ")); await shot("palette"); await page.keyboard.press("Escape"); }
		if (kind === "hover") { await page.getByRole("button", { name: new RegExp(a.replace(/_/g, " "), "i") }).first().hover(); await page.waitForTimeout(600); await shot(`hover-${a}`); }
		if (kind === "click") { await page.getByText(a.replace(/_/g, " "), { exact: true }).first().click(); await page.waitForTimeout(1200); await shot(`click-${a}`, true); }
		if (kind === "role") { await page.getByRole("button", { name: a.replace(/_/g, " ") }).first().click(); await page.waitForTimeout(1200); await shot(`role-${a}`, true); }
		if (kind === "type") { await page.getByRole("textbox").first().fill(a.replace(/_/g, " ")); await page.waitForTimeout(500); await shot(`type-${a}`, true); }
		if (kind === "key") { await page.keyboard.press(a.replace(/_/g, "+")); await page.waitForTimeout(800); await shot(`key-${a}`, true); }
		if (kind === "width") { await page.setViewportSize({ width: Number(a), height: 900 }); await page.waitForTimeout(500); await shot(`w${a}`); }
	}
} catch (e) { console.log("ERR", e.message); await page.screenshot({ path: path.join(out, "error.png") }); }
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
api.kill();
