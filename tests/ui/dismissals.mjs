// "Don't show again" on the setup list stays off for that person: after a page reload, after the browser's own storage is wiped, and
// from a different browser profile altogether. (It used to be kept in the browser's local storage, so a different address or a
// cleared profile brought it back.) Not part of `npm test` (it needs a Chromium); run it with `node tests/ui/dismissals.mjs`.
// Set GP_CHROME to a chrome.exe.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-dismiss-"));
const PORT = 8791;
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const signIn = async (page) => {
		await page.goto(B, { waitUntil: "networkidle" });
		await page.getByLabel(/username/i).fill("admin");
		await page.getByLabel(/password/i).fill("TestAdmin!2345");
		await page.getByRole("button", { name: /sign in|log in/i }).click();
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(1200);
	};
	const listShown = (page) => page.getByText(/Setup: \d+ of \d+ done/).first().isVisible().catch(() => false);

	const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
	const page = await context.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await signIn(page);
	check("a new panel shows the setup list", await listShown(page));

	await page.getByRole("button", { name: "Don't show again" }).click();
	await page.waitForTimeout(500);
	check("Don't show again hides it", !(await listShown(page)));

	await page.reload({ waitUntil: "load" });
	await page.waitForTimeout(1200);
	check("and it stays hidden after a reload", !(await listShown(page)));

	// What used to bring it back: the browser's storage being a blank slate.
	await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
	await page.reload({ waitUntil: "load" });
	await page.waitForTimeout(1200);
	check("and after the browser's own storage is wiped", !(await listShown(page)));

	// A different browser profile, signing in as the same person.
	const other = await browser.newContext({ viewport: { width: 1100, height: 900 } });
	const page2 = await other.newPage();
	await signIn(page2);
	check("and in a different browser profile, signed in as the same person", !(await listShown(page2)));

	// Another person's list is their own: a person who hasn't dismissed it still sees it. (The only account here is the administrator's,
	// so check the saved choice is on the account, which is what makes it per person.)
	const prefs = await page2.evaluate(async () => (await (await fetch("/api/auth/preferences")).json()).prefs);
	check("the choice is kept on the account", prefs.checklistDismissed === true, JSON.stringify(prefs));

	check("no script errors", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
