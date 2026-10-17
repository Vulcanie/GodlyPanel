// A game that is installed from a GitHub release zip (a template's `zipInstall`) asks before it downloads anything: pressing Create
// Server shows a dialog saying what, from where and how big, and Cancel leaves no server behind. This never presses "Download and
// continue", so nothing is fetched. Skipped when no template installs from GitHub. Run with `node tests/ui/create-zip-consent.mjs`
// (needs a Chromium; set GP_CHROME to a chrome.exe if it isn't found).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-create-zip-"));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const PORT = await freePort();
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
const post = (p, b, cookie) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(b) });
await post("/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });
const cookie = (await post("/api/auth/login", { username: "admin", password: "TestAdmin!2345" })).headers.get("set-cookie").split(";")[0];
const templates = await (await fetch(B + "/api/templates", { headers: { Cookie: cookie } })).json();
const zipGames = templates.filter((t) => t.zipInstall);

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
if (zipGames.length === 0) {
	console.log("SKIP  no template installs from a GitHub release");
	api.kill();
	fs.rmSync(root, { recursive: true, force: true });
	process.exit(0);
}
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByTestId("nav-create").click();

	for (const t of zipGames) {
		await page.getByRole("heading", { name: t.displayName, exact: true }).click();
		await page.waitForTimeout(500);
		await page.getByLabel(/^Server Name|^Name/).first().fill("Zip Try");
		await page.getByRole("button", { name: /^Create Server$/ }).click();
		const dialog = page.getByRole("dialog");
		await dialog.waitFor({ timeout: 20000 });
		const text = await dialog.innerText();
		check(`${t.displayName}: pressing Create asks before downloading`, /from GitHub\?/.test(text), text.slice(0, 80));
		check(`${t.displayName}: the dialog says what and from where`, text.includes(t.zipInstall.asset) && text.includes(`github.com/${t.zipInstall.repo}`));
		check(`${t.displayName}: it says how it is checked and gives a size (or says it is not known)`, /SHA-256/.test(text) && /Size:/.test(text));
		await dialog.getByRole("button", { name: "Cancel" }).click();
		await page.waitForTimeout(400);
		check(`${t.displayName}: Cancel closes it`, (await page.getByRole("dialog").count()) === 0);
		const servers = await (await fetch(B + "/api/servers", { headers: { Cookie: cookie } })).json();
		const names = (Array.isArray(servers) ? servers : servers.servers ?? []).map((s) => s.name);
		check(`${t.displayName}: and no server was made`, !names.includes("Zip Try"), names.join(", "));
		await page.getByRole("button", { name: "Choose a different game" }).click();
		await page.waitForTimeout(300);
	}
	check("no page errors along the way", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (e) {
	bad++;
	console.log("FAIL  the run completed  — " + String(e.stack || e).split("\n").slice(0, 4).join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 400));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
	console.log(`\n${ok} passed, ${bad} failed`);
	process.exit(bad ? 1 : 0);
}
