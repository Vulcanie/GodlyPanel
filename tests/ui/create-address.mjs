// On the create-a-server form, the session field of a game where it is the address players join by (Minecraft) starts as the public
// address and the game port, and follows the port until it is typed in; for a game where it is the server's name (Valheim) it is
// left for the person to name. Not part of `npm test` (it needs a Chromium); run it with `node tests/ui/create-address.mjs`.
// Set GP_CHROME to a chrome.exe.
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
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-addr-"));
const PORT = 8793;
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, network: { publicAddress: "203.0.113.9" }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("button", { name: /create server/i }).first().click();
	const settle = () => page.waitForTimeout(500);
	const choose = async (game) => { await page.getByRole("heading", { name: game, exact: true }).click(); await settle(); };

	await choose("Minecraft (Modpack)");
	const session = page.getByLabel(/Join Address \/ Session Name/);
	const port = page.getByLabel("Server Port");
	const gamePort = await port.inputValue();
	check("Minecraft's session field starts as the public address and the game port", (await session.inputValue()) === `203.0.113.9:${gamePort}`, await session.inputValue());
	await port.fill("8123");
	await settle();
	check("and follows the game port as it is changed", (await session.inputValue()) === "203.0.113.9:8123", await session.inputValue());
	check("saying so under the field", await page.getByText(/Filled in from the public address/).isVisible());
	await session.fill("play.example.com:8123");
	await port.fill("8124");
	await settle();
	check("once typed in, it stays as typed", (await session.inputValue()) === "play.example.com:8123", await session.inputValue());
	await page.getByRole("button", { name: "Choose a different game" }).click();
	await settle();

	await choose("Valheim");
	const name = page.getByLabel(/^Server \/ Session Name/);
	check("Valheim's own name field is left blank for the person to name (it is the name in the game)", (await name.inputValue()) === "", await name.inputValue());
	const label = page.getByLabel("Session shown on the dashboard and in Discord");
	const vPort = await page.getByLabel("Game Port").inputValue();
	check("every other game gets a Session field, starting as the public address and the game port", (await label.inputValue()) === `203.0.113.9:${vPort}`, await label.inputValue());
	await page.getByLabel("Game Port").fill("8222");
	await settle();
	check("which follows the game port", (await label.inputValue()) === "203.0.113.9:8222", await label.inputValue());
	await label.fill("Godly Heroes vanilla");
	await page.getByLabel("Game Port").fill("8223");
	await settle();
	check("until it is typed in, then it stays as typed", (await label.inputValue()) === "Godly Heroes vanilla", await label.inputValue());
	check("and says it is a label only", await page.getByText(/Your own text/).isVisible());

	check("no script errors", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
