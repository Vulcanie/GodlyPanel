// The Create Server form for every game template: it opens without a page error, asks for the
// fields that game needs, and the ports it suggests are accepted (Create Server is enabled once
// the server has a name). Run with `node tests/ui/create-every-game.mjs` (needs a Chromium; set
// GP_CHROME to a chrome.exe if it isn't found).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browsers = path.join(os.homedir(), "AppData/Local/ms-playwright");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(browsers).filter((d) => d.startsWith("chromium-")).map((d) => path.join(browsers, d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-create-all-"));
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

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("button", { name: /create server/i }).first().click();
	const createBtn = page.getByRole("button", { name: /^Create Server$/ });

	check("there are templates to try", templates.length >= 16, `${templates.length}: ${templates.map((t) => t.id).join(", ")}`);
	for (const t of templates) {
		await page.getByRole("heading", { name: t.displayName, exact: true }).click();
		await page.waitForTimeout(500);
		await page.getByLabel(/^Server Name|^Name/).first().fill("Try Server");
		await page.waitForTimeout(300);
		// every port the template lists has a box with a number in it
		let portsOk = true;
		for (const p of t.ports) {
			const box = page.getByLabel(p.label, { exact: true }).first();
			const value = await box.inputValue().catch(() => "");
			if (!/^\d+$/.test(value)) portsOk = false;
		}
		check(`${t.displayName}: the form opens with its ports filled in`, portsOk);
		const needsUpload = t.fields?.includes("uploadId");
		if (!needsUpload) check(`${t.displayName}: the suggested ports are accepted`, await createBtn.isEnabled());
		if (t.fields?.includes("adminPassword")) check(`${t.displayName}: it asks for an admin password`, (await page.getByLabel(/Admin Password/).count()) > 0);
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
