// The collapsible, searchable Settings page and the server's Settings tab, in a real browser against a throwaway
// data folder. Not part of `npm test` (it needs a Chromium); run with `node tests/ui/sections.mjs`.
// Set GP_CHROME to a chrome.exe, and GP_SHOTS to a folder to keep screenshots.
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
const SHOTS = process.env.GP_SHOTS ? path.resolve(process.env.GP_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-sections-"));
const srv = path.join(root, "srv", "one");
const PORT = await freePort();
fs.mkdirSync(srv, { recursive: true });
fs.writeFileSync(path.join(srv, "ServerSettings.ini"), ["[ServerSettings]", "MaxPlayers=40", "ServerName=Sect Test", ""].join("\r\n"));
fs.writeFileSync(path.join(srv, "Start_One.bat"), '@echo off\r\nstart /MIN "T" ConanSandboxServer.exe -log -Port=9000 -QueryPort=9002\r\n');
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [
	{ name: "Sect Test", type: "conan", source: "imported", method: "process", host: "127.0.0.1", processName: "not-running.exe", port: 9000, queryPort: 9002, rconPort: 9003, installDir: srv, workingDir: srv, startScriptPath: path.join(srv, "Start_One.bat"), configPath: path.join(srv, "ServerSettings.ini") },
] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "First-Admin-Pass-1" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const settle = () => page.waitForTimeout(500);
	const shot = (name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
	const visible = (text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
	const section = (title) => page.locator(`[data-section]`).filter({ hasText: title }).first();

	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("First-Admin-Pass-1");
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.getByRole("button", { name: "Expand All" }).waitFor();

	// ---- the panel's Settings page ----------------------------------------------------------------
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByLabel("Search settings").waitFor();
	await settle();
	const total = await page.locator("[data-section]").count();
	check("Settings is a list of sections", total >= 15, `${total} sections`);
	check("they start folded: a setting's own field isn't showing", !(await visible("Allow access from your network")));
	check("but each shows what's inside", await visible("The panel's port, and who can reach it"));
	await shot("settings-folded");

	await page.getByRole("button", { name: /^Access/ }).first().click();
	await settle();
	check("opening a section shows its settings", await visible("Allow access from your network"));
	await shot("settings-one-open");
	await page.getByRole("button", { name: /^Access/ }).first().click();
	await settle();
	check("and closing it hides them again", !(await visible("Allow access from your network")));

	// Search.
	await page.getByLabel("Search settings").fill("discord");
	await settle();
	const matches = await page.locator("[data-section]").count();
	check("searching narrows the list", matches > 0 && matches < total, `${matches} of ${total}`);
	check("matching sections open by themselves", await visible("Discord"));
	await shot("settings-search-discord");
	await page.getByLabel("Search settings").fill("allow access from your network");
	await settle();
	check("a search can match a single setting by its label and open just that section", (await page.locator("[data-section]").count()) >= 1 && (await visible("Allow access from your network")));
	await page.getByLabel("Search settings").fill("zzzzqqq");
	await settle();
	check("a search with no match says so", await visible("Nothing matches"));
	await page.getByRole("button", { name: "Clear search" }).first().click();
	await settle();
	check("clearing the search brings every section back", (await page.locator("[data-section]").count()) === total);

	// Expand / collapse all, and being remembered.
	await page.getByRole("button", { name: "Open all sections" }).click();
	await settle();
	check("Open all sections opens everything", await visible("Allow access from your network") && await visible("Web port"));
	await shot("settings-all-open");
	// Where existing servers are, beside where new ones will go.
	if (SHOTS) await page.locator('[data-section="settings:group:paths"]').screenshot({ path: path.join(SHOTS, "folders-section.png") });
	check("Settings lists where the existing servers are", await visible("Where your servers are now"));
	const listed = await page.getByTestId("server-locations").innerText();
	check("it names the server and its folder", listed.includes("Sect Test") && listed.toLowerCase().includes(path.join(root, "srv", "one").toLowerCase()), listed.slice(0, 200).replace(/s+/g, " "));
	check("and says where new servers will be created, and that existing ones stay put", listed.toLowerCase().includes(path.join(root, "servers").toLowerCase()) && /stay where they are/.test(listed));
	check("a server outside that folder is marked as elsewhere", /Elsewhere/.test(listed));
	await page.reload({ waitUntil: "load" });
	await page.getByLabel("Search settings").waitFor().catch(async () => { await page.getByRole("button", { name: "Settings" }).click(); await page.getByLabel("Search settings").waitFor(); });
	await settle();
	check("what was open is remembered after a reload", await visible("Allow access from your network"));
	await page.getByRole("button", { name: "Close all sections" }).click();
	await settle();
	check("Close all sections folds everything", !(await visible("Allow access from your network")));

	// Unsaved changes survive a search that hides them.
	await page.getByLabel("Search settings").fill("web port");
	await settle();
	const portField = page.getByLabel("Web port");
	await portField.fill("8799");
	await page.getByLabel("Search settings").fill("discord");
	await settle();
	check("a change made in one section is still pending while the search shows others", await page.getByText(/unsaved changes/).first().isVisible());
	await page.getByRole("button", { name: "Discard" }).click();

	// ---- a server's Settings tab ----------------------------------------------------------------------
	await page.getByRole("button", { name: /back to dashboard/i }).first().click();
	await page.getByRole("button", { name: "Expand All" }).click();
	await page.getByText("Sect Test", { exact: true }).first().click();
	await settle();
	const folderLine = await page.getByTestId("server-folder").first().innerText().catch(() => "");
	if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "server-header.png"), clip: { x: 0, y: 100, width: 1200, height: 330 } });
	check("a server's Settings says where it is installed", folderLine.toLowerCase() === path.join(root, "srv", "one").toLowerCase(), folderLine);
	await shot("server-settings");
	// Where everything is on the page, top to bottom.
	const tops = await page.evaluate(() => {
		const top = (el) => el.getBoundingClientRect().top + window.scrollY;
		const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div")].find((e) => e.children.length === 0 && e.textContent.trim() === "Delete server");
		const fields = [...document.querySelectorAll("input, textarea")].filter((e) => e.offsetParent !== null).map(top);
		const accordions = [...document.querySelectorAll(".MuiAccordion-root")].map(top);
		return { del: heading ? top(heading) : null, fields, accordions, pageBottom: document.documentElement.scrollHeight };
	});
	check("a server's Settings has the delete card", tops.del !== null);
	check("it is below every field and card above it, including the settings form", tops.del !== null && Math.max(...tops.fields, ...tops.accordions) < tops.del, JSON.stringify({ del: tops.del, lastField: Math.max(...tops.fields), lastAccordion: Math.max(...tops.accordions) }));
	check("and it is the end of the page, with only room for the Save bar below", tops.del !== null && tops.pageBottom - tops.del < 420, `${Math.round(tops.pageBottom - tops.del)}px below it`);
	check("the window and ports cards are still the folding ones they were", (await page.locator(".MuiAccordion-root").count()) >= 2);
	await shot("server-settings-bottom");
	check("no script errors during any of it", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
