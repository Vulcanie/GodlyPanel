// Each server's page has a Session box: automatic (the public address and game port) until text is typed, and the dashboard follows
// it. Not part of `npm test` (it needs a Chromium); run it with `node tests/ui/session-box.mjs`. Set GP_CHROME to a chrome.exe.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-sess-"));
const srv = path.join(root, "srv", "one");
const PORT = 8795;
fs.mkdirSync(srv, { recursive: true });
fs.writeFileSync(path.join(srv, "Start_One.bat"), '@echo off\r\nstart /MIN "T" ConanSandboxServer.exe -log -Port=9000 -QueryPort=9002\r\n');
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [
	{ name: "Session Test", type: "conan", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 9000, queryPort: 9002, rconPort: 9003, sessionName: "GodlyConan", installDir: srv, workingDir: srv, startScriptPath: path.join(srv, "Start_One.bat") },
] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, network: { publicAddress: "203.0.113.9" }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const settle = (ms = 700) => page.waitForTimeout(ms);
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByTestId("server-card-Session Test").waitFor();
	await settle(3500); // a poll has filled the card in

	// (The card no longer prints the game's own session name, GodlyConan, beside the address; the search box still finds it.)
	const tile = page.getByTestId("server-card-Session Test");
	check("the dashboard card shows the address as the Session", (await tile.innerText()).includes("203.0.113.9:9000"));

	await tile.click();
	await settle(1500);
	const box = page.getByLabel("Session", { exact: true });
	check("the server's page has a Session box, automatic by default", (await box.count()) === 1 && (await box.inputValue()) === "" && ((await box.getAttribute("placeholder")) ?? "").includes("203.0.113.9:9000"));

	await box.fill("Godly Conan - PvE");
	await box.press("Enter");
	await settle(1200);
	check("typing in it keeps it, and offers to go back to automatic", await page.getByRole("button", { name: /Use automatic/ }).isVisible());
	check("and says it was saved", await page.getByText("Session label saved.").isVisible());
	await page.reload({ waitUntil: "load" });
	await page.getByTestId("server-card-Session Test").waitFor();
	await settle(2500);
	check("the dashboard card follows what was typed", (await page.getByTestId("server-card-Session Test").innerText()).includes("Godly Conan - PvE"));
	await page.getByTestId("server-card-Session Test").click();
	await settle(1500);
	check("and it is still there after a reload", (await page.getByLabel("Session", { exact: true }).inputValue()) === "Godly Conan - PvE");

	await page.getByRole("button", { name: /Use automatic/ }).click();
	await settle(1200);
	check("Use automatic puts it back", (await page.getByLabel("Session", { exact: true }).inputValue()) === "" && !(await page.getByRole("button", { name: /Use automatic/ }).count()));

	// And the dashboard follows what was set.
	const set = await (await fetch(B + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) })).headers.get("set-cookie");
	const cookie = set.split(";")[0];
	await fetch(B + "/api/server/Session%20Test/session", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ sessionLabel: "Custom text" }) });
	await settle(3500);
	const live = await (await fetch(B + "/api/status", { headers: { Cookie: cookie } })).json();
	check("the dashboard's status carries what was set", live["Session Test"].session === "Custom text" && live["Session Test"].joinAddress === "203.0.113.9:9000", JSON.stringify(live["Session Test"]).slice(0, 160));

	check("no script errors", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
