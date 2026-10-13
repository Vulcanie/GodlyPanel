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
import { EXE } from "./_chrome.mjs";
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
	// The browser reports anything the page's security policy blocked as a console message.
	const blocked = [];
	page.on("console", (m) => /content security policy|refused to (load|apply|execute|connect)/i.test(m.text()) && blocked.push(m.text().slice(0, 200)));
	const see = async (text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
	// The dashboard is the page whose heading says so (a server's page is headed by the server's name, the others by theirs).
	const onDashboard = async () => (await page.getByRole("heading", { name: "Dashboard", level: 1 }).count()) > 0;
	// A server's page is the one with the server's tabs; the breadcrumb across the top names the server.
	const onServer = async (name = "Nav Test") => (await page.getByTestId("tab-overview").count()) > 0 && (await page.getByRole("main").getByRole("heading", { name, level: 1 }).count()) > 0;
	const settle = () => page.waitForTimeout(700);
	const back = async (name) => { await page.getByRole("button", { name }).first().click(); await settle(); };
	const signIn = async () => {
		await page.getByLabel(/username/i).fill("admin");
		await page.getByLabel(/password/i).fill("TestAdmin!2345");
		await page.getByRole("button", { name: /sign in|log in/i }).click();
		await page.getByRole("heading", { name: "Dashboard", level: 1 }).waitFor();
	};

	await page.goto(B, { waitUntil: "networkidle" });
	await signIn();
	check("signs in to the dashboard", await onDashboard());

	// dashboard -> server -> batch editor -> back -> back
	await page.getByTestId("server-card-Nav Test").click();
	await settle();
	check("a server card opens its page", await onServer());
	check("the breadcrumb names where you are", (await page.getByRole("button", { name: "Dashboard", exact: true }).count()) > 0);
	// The start script editor is under Advanced.
	await page.getByTestId("tab-advanced").click();
	await page.getByTestId("edit-batch-files").click();
	await settle();
	check("the launch script editor opens for that server", await page.locator("textarea").count() > 0 && (await page.locator("textarea").first().inputValue()).includes("ConanSandboxServer"));
	await page.getByRole("button", { name: /back/i }).first().click();
	await settle();
	check("Back from the launch script returns to the SAME server's page", await onServer() && !(await see("No server selected")));
	await page.getByTestId("edit-batch-files").click();
	await settle();
	await page.goBack();
	await settle();
	check("the browser Back button also returns to the server's page", await onServer() && !(await see("No server selected")));
	await page.goBack();
	await settle();
	check("and once more to the dashboard", await onDashboard());
	await page.goForward();
	await settle();
	check("Forward returns to the server", await onServer());
	await back(/^Dashboard$/);
	check("the breadcrumb's Dashboard returns to the dashboard", await onDashboard());

	// the sidebar moves the same way
	await page.getByTestId("sidebar-server-Nav Test").click();
	await settle();
	check("the sidebar's server list opens the server", await onServer());
	await page.getByTestId("nav-dashboard").click();
	await settle();
	check("and its Dashboard item returns to the dashboard", await onDashboard());

	// each other page and back. Where a page has its own Back button it is used; Settings and Activity have none (the sidebar and
	// the browser's Back button are the way out), so those are checked with the browser's.
	for (const [nav, label] of [["settings", "Settings"], ["activity", "Activity"]]) {
		await page.getByTestId(`nav-${nav}`).click();
		await settle();
		check(`${label} opens`, !(await onDashboard()) && (await page.getByRole("heading", { name: label, level: 1 }).count()) > 0);
		await page.goBack();
		await settle();
		check(`${label} -> the browser's Back returns to the dashboard`, await onDashboard());
	}
	await page.getByTestId("nav-people").click();
	await settle();
	check("People opens", !(await onDashboard()));
	await back(/back/i);
	check("People -> Back returns to the dashboard", await onDashboard());
	await page.getByTestId("create-server").click();
	await settle();
	check("Create server opens", !(await onDashboard()));
	await back(/back/i);
	check("Create server -> Back returns to the dashboard", await onDashboard());

	// Settings page stays out of a different person's session
	await page.getByTestId("nav-settings").click();
	await settle();
	await post("/api/users", {}).catch(() => {});
	await page.getByTestId("user-menu").click();
	await page.getByTestId("sign-out").click();
	await settle();
	check("signing out shows the login form", await page.getByLabel(/username/i).count() > 0);
	await signIn();
	await settle();
	check("signing back in starts on the dashboard, not the last page", await onDashboard());

	check("no script errors during any of it", errors.length === 0, errors.join(" | "));
	check("nothing the page needed was blocked by its security policy", blocked.length === 0, blocked.join(" | "));
	// And it really enforces: a script injected into the page doesn't run.
	const injectedRan = await page.evaluate(() => { const el = document.createElement("script"); el.textContent = "window.__injected = true"; document.head.appendChild(el); return window.__injected === true; });
	check("a script injected into the page does not run", injectedRan === false);
	const headers = (await fetch(B + "/")).headers;
	check("the page is sent with a security policy that forbids framing and outside scripts", /frame-ancestors 'none'/.test(headers.get("content-security-policy") ?? "") && /script-src 'self'/.test(headers.get("content-security-policy") ?? "") && headers.get("x-frame-options") === "DENY" && headers.get("x-content-type-options") === "nosniff");
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
