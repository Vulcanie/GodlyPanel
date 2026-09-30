// Drives every page-to-page move in the real UI, in a real browser, against a
// throwaway data directory. Not part of `npm test` (it needs a Chromium);
// run it with `node tests/ui/navigation.mjs`. Set GP_CHROME to a chrome.exe.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(path.join(os.homedir(), "AppData/Local/ms-playwright")).filter((d) => d.startsWith("chromium-")).map((d) => path.join(os.homedir(), "AppData/Local/ms-playwright", d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-nav-"));
const srv = path.join(root, "srv", "one");
const PORT = 8789;
fs.mkdirSync(srv, { recursive: true });
fs.writeFileSync(path.join(srv, "Start_One.bat"), '@echo off\r\nstart /MIN "T" ConanSandboxServer.exe -log -Port=9000 -QueryPort=9002\r\n');
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [
	{ name: "Nav Test", type: "conan", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 9000, queryPort: 9002, rconPort: 9003, installDir: srv, workingDir: srv, startScriptPath: path.join(srv, "Start_One.bat") },
] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
const post = (p, b) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
await post("/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const see = async (text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
	const onDashboard = async () => (await page.getByRole("button", { name: "Expand All" }).count()) > 0;
	const settle = () => page.waitForTimeout(700);
	const back = async (name) => { await page.getByRole("button", { name }).first().click(); await settle(); };

	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { name: "Expand All" }).waitFor();
	check("signs in to the dashboard", await onDashboard());

	// dashboard -> server -> batch editor -> back -> back
	await page.getByRole("button", { name: "Expand All" }).click();
	await page.getByText("Nav Test", { exact: true }).first().click();
	await settle();
	check("a server tile opens its config page", await see("Edit Launch Script") || await see("Ports"));
	await page.getByRole("button", { name: /batch|launch script/i }).first().click();
	await settle();
	check("the launch script editor opens for that server", await page.locator("textarea").count() > 0 && (await page.locator("textarea").first().inputValue()).includes("ConanSandboxServer"));
	await page.getByRole("button", { name: /back/i }).first().click();
	await settle();
	check("Back from the launch script returns to the SAME server's config page", await see("Ports") && !(await see("No server selected")));
	await page.getByRole("button", { name: /batch|launch script/i }).first().click();
	await settle();
	await page.goBack();
	await settle();
	check("the browser Back button also returns to the config page", await see("Ports") && !(await see("No server selected")));
	await page.goBack();
	await settle();
	check("and once more to the dashboard", await onDashboard());
	await page.goForward();
	await settle();
	check("Forward returns to the server", await see("Ports"));
	await back(/back/i);
	check("the config page's Back returns to the dashboard", await onDashboard());

	// each other page and back
	for (const [label, marker] of [["Settings", /Artwork|Appearance|Panel/i], ["People", /Add|user|People/i]]) {
		await page.getByRole("button", { name: label }).click();
		await settle();
		check(`${label} opens`, !(await onDashboard()));
		await back(/back/i);
		check(`${label} -> Back returns to the dashboard`, await onDashboard());
	}
	await page.getByRole("button", { name: /create server|add server|new server/i }).first().click();
	await settle();
	check("Create server opens", !(await onDashboard()));
	await back(/back/i);
	check("Create server -> Back returns to the dashboard", await onDashboard());

	// Settings page stays out of a different person's session
	await page.getByRole("button", { name: "Settings" }).click();
	await settle();
	await post("/api/users", {}).catch(() => {});
	await page.getByRole("button", { name: /sign out/i }).click();
	await settle();
	check("signing out shows the login form", await page.getByLabel(/username/i).count() > 0);
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.waitForLoadState("networkidle");
	await settle();
	check("signing back in starts on the dashboard, not the last page", await onDashboard());

	check("no script errors during any of it", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
