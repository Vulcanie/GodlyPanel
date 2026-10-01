// The Create Server form: choosing a port a game keeps for itself shows a
// warning and disables the Create button. Run with `node tests/ui/create-ports.mjs`
// (needs a Chromium; set GP_CHROME to a chrome.exe if it isn't found).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browsers = path.join(os.homedir(), "AppData/Local/ms-playwright");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(browsers).filter((d) => d.startsWith("chromium-")).map((d) => path.join(browsers, d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-create-ui-"));
const PORT = 8790;
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("button", { name: /create server/i }).first().click();

	const createBtn = page.getByRole("button", { name: /^Create Server$/ });
	const settle = () => page.waitForTimeout(400);
	const choose = async (game) => {
		await page.getByRole("heading", { name: game, exact: true }).click();
		await settle();
		await page.getByLabel(/^Server Name|^Name/).first().fill("Test Server");
	};
	const back = async () => { await page.getByRole("button", { name: "Choose a different game" }).click(); await settle(); };

	// ---- Conan: the query port one above the game port
	await choose("Conan Exiles");
	const game = page.getByLabel("Game Port");
	const query = page.getByLabel("Query Port");
	const gameValue = Number(await game.inputValue());
	check("with the defaults there is no warning and Create is enabled", !(await page.getByText(/is used by .* itself/).count()) && (await createBtn.isEnabled()));
	await query.fill(String(gameValue + 1));
	await settle();
	check("a query port equal to game port + 1 shows the warning", await page.getByText(/is used by Conan Exiles itself/).isVisible());
	check("and disables Create Server", await createBtn.isDisabled());
	await page.screenshot({ path: path.join(root, "create-conan-warning.png") });
	await query.fill(String(gameValue + 2));
	await settle();
	check("moving it off clears the warning and re-enables Create", !(await page.getByText(/is used by .* itself/).count()) && (await createBtn.isEnabled()));
	await page.getByLabel("RCON Port").fill(String(gameValue + 1));
	await settle();
	check("the RCON port is guarded the same way", (await createBtn.isDisabled()) && (await page.getByText(/is used by Conan Exiles itself/).isVisible()));
	await back();

	// ---- every game gets the rule, not only the ones known to use the port
	await choose("Palworld");
	const palGame = Number(await page.getByLabel("Game Port").inputValue());
	check("Palworld's suggested ports don't trip the rule", await createBtn.isEnabled());
	await page.getByLabel("REST API Port").fill(String(palGame + 1));
	await settle();
	check("Palworld: query port = game port + 1 warns as a precaution", await page.getByText(/may use it for itself, so it's\s+kept free/).isVisible());
	check("and disables Create Server", await createBtn.isDisabled());
	await page.getByLabel("REST API Port").fill(String(palGame + 2));
	await settle();
	check("moving it off re-enables it", await createBtn.isEnabled());
	await back();

	await choose("ARK: Survival Ascended");
	const asaGame = Number(await page.getByLabel("Game Port").inputValue());
	check("Ascended's suggested ports don't trip the rule (they used to)", await createBtn.isEnabled());
	await page.getByLabel("RCON Port").fill(String(asaGame + 1));
	await settle();
	check("Ascended: RCON port = game port + 1 disables Create", await createBtn.isDisabled());
	await back();

	// ---- a game with only a game port never warns
	await choose("Valheim");
	check("Valheim's form has no clash to make (one port, chosen for you)", await createBtn.isEnabled());
	await back();
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
