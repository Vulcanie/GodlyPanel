// The Settings page (groups down the left, a search across all of them) and a server's own Settings, Advanced and Network
// tabs, in a real browser against a throwaway data folder. Not part of `npm test` (it needs a Chromium); run with `node tests/ui/sections.mjs`.
// Set GP_CHROME to a chrome.exe, and GP_SHOTS to a folder to keep screenshots.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
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
	if (process.env.GP_DARK) await page.emulateMedia({ colorScheme: "dark" });
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
	await page.getByRole("heading", { name: "Dashboard", level: 1 }).waitFor();

	// ---- the panel's Settings page ----------------------------------------------------------------
	// The page is a column of groups on the left and the open group's settings on the right (it replaced one folding list of
	// sections), so there is nothing to fold or unfold: a group's settings are simply showing.
	await page.getByTestId("nav-settings").click();
	await page.getByLabel("Search settings").waitFor();
	await settle();
	const categories = ["general", "servers", "backups", "notifications", "community", "appearance"];
	check("Settings has its groups down the left", (await Promise.all(categories.map((c) => page.getByTestId(`settings-category-${c}`).count()))).every((n) => n === 1));
	check("it opens on the first group, with its settings showing", (await page.getByTestId("settings-category-general").getAttribute("aria-selected")) === "true" && (await visible("Allow access from your network")));
	check("and each section says what is inside it", await visible("The panel's port, and who can reach it"));
	const inGeneral = await page.locator("[data-section]").count();
	check("it shows only that group's sections", inGeneral >= 3 && !(await visible("Where your servers are now")), `${inGeneral} sections`);
	await shot("settings-general");

	await page.getByTestId("settings-category-servers").click();
	await settle();
	check("choosing another group shows its sections instead", (await visible("Where your servers are now")) && !(await visible("Allow access from your network")));
	check("including where the existing servers are, beside where new ones will go", await visible("Where your servers are now"));
	if (SHOTS) await page.locator('[data-section="settings:folders"]').screenshot({ path: path.join(SHOTS, "folders-section.png") });
	const listed = await page.getByTestId("server-locations").innerText();
	check("it names the server and its folder", listed.includes("Sect Test") && listed.toLowerCase().includes(path.join(root, "srv", "one").toLowerCase()), listed.slice(0, 200).replace(/\s+/g, " "));
	check("and says where new servers will be created, and how many existing ones are elsewhere", listed.toLowerCase().includes(path.join(root, "servers").toLowerCase()) && /0 in that folder, 1 elsewhere/.test(listed));
	check("a server outside that folder is marked as elsewhere", /Elsewhere/.test(listed));
	await shot("settings-servers");

	// Search looks in every group at once.
	await page.getByLabel("Search settings").fill("discord");
	await settle();
	const matches = await page.locator("[data-section]").count();
	check("searching narrows the page to the sections that match, from every group", matches > 0 && matches < 10 && (await page.locator('[data-section="settings:discord"]').count()) === 1, `${matches} sections`);
	check("and the groups with a match say how many", (await page.getByTestId("settings-category-notifications").innerText()).match(/\d/) !== null);
	await shot("settings-search-discord");
	await page.getByLabel("Search settings").fill("allow access from your network");
	await settle();
	check("a search can match a single setting by its label and show just that section", (await page.locator("[data-section]").count()) === 1 && (await visible("Allow access from your network")));
	await page.getByLabel("Search settings").fill("zzzzqqq");
	await settle();
	check("a search with no match says so", await visible("Nothing matches"));
	await page.getByRole("button", { name: "Clear search" }).first().click();
	await settle();
	check("clearing the search goes back to the group that was open", (await page.getByTestId("settings-category-servers").getAttribute("aria-selected")) === "true" && (await visible("Where your servers are now")));

	// The chosen group is remembered (it used to be which sections were open).
	await page.reload({ waitUntil: "load" });
	await page.getByTestId("nav-settings").click();
	await page.getByLabel("Search settings").waitFor();
	await settle();
	check("the group that was open is remembered after a reload", (await page.getByTestId("settings-category-servers").getAttribute("aria-selected")) === "true");

	// Unsaved changes survive a search that hides them.
	await page.getByTestId("settings-category-general").click();
	await page.getByLabel("Search settings").fill("web port");
	await settle();
	// Each setting has an (i) button whose label repeats its name, so the field is asked for by its exact label.
	const portField = page.getByLabel("Web port", { exact: true });
	await portField.fill("8799");
	await page.getByLabel("Search settings").fill("discord");
	await settle();
	check("a change made in one section is still pending while the search shows others", await page.getByText(/unsaved changes/).first().isVisible());
	check("and the group it belongs to is marked", (await page.getByTestId("settings-category-general").locator('[title*="unsaved"]').count()) === 1);
	await page.getByRole("button", { name: "Discard" }).click();
	await page.getByLabel("Search settings").fill("");

	// ---- a server's own pages ------------------------------------------------------------------------
	await page.getByTestId("sidebar-server-Sect Test").click();
	await page.getByTestId("tab-overview").waitFor();
	await settle();
	const folderLine = await page.getByTestId("server-folder").first().innerText().catch(() => "");
	if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "server-header.png"), clip: { x: 0, y: 0, width: 1200, height: 360 } });
	check("a server's Overview says where it is installed", folderLine.toLowerCase() === path.join(root, "srv", "one").toLowerCase(), folderLine);
	await shot("server-overview");

	// The server's Settings tab is the game's settings file as a form, with a save bar that is always in reach.
	await page.getByTestId("tab-settings").click();
	await settle(1000);
	check("the Settings tab shows the game's settings file with a form and a Save button", (await page.getByTestId("save-config").count()) === 1 && (await page.getByTestId("save-config").isDisabled()) && (await page.locator("input").count()) > 3);
	check("the file's own name is on the page", await visible("ServerSettings.ini") || await visible("Server Settings"));
	await shot("server-settings");

	// Delete used to sit under the Settings page; it is under Advanced now, last on the page, below every field and card.
	await page.getByTestId("tab-advanced").click();
	await settle(1000);
	const tops = await page.evaluate(() => {
		const top = (el) => el.getBoundingClientRect().top + window.scrollY;
		const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,div")].find((e) => e.children.length === 0 && e.textContent.trim() === "Remove this server");
		const fields = [...document.querySelectorAll("input, textarea")].filter((e) => e.offsetParent !== null).map(top);
		const cards = [...document.querySelectorAll("main .MuiPaper-root")].map(top);
		return { del: heading ? top(heading) : null, fields, cards, pageBottom: document.documentElement.scrollHeight };
	});
	check("a server's Advanced tab has the remove card", tops.del !== null);
	check("it is below every field and card above it", tops.del !== null && Math.max(...tops.fields, 0) < tops.del && tops.cards.filter((t) => t < tops.del).length >= 2, JSON.stringify({ del: tops.del, lastField: Math.max(...tops.fields, 0), cards: tops.cards.length }));
	check("and it is the end of the page", tops.del !== null && tops.pageBottom - tops.del < 420, `${Math.round(tops.pageBottom - tops.del)}px below it`);
	check("the window and start-script cards are in Advanced beside it", (await visible("Window and launch")) && (await page.getByTestId("edit-batch-files").isVisible()));
	await shot("server-advanced");
	// The window card used to fold open from the Settings page; it is a plain card now, and the ports live in Network.
	await page.getByTestId("tab-network").click();
	await settle(1000);
	check("the ports and the firewall check are on the Network tab", (await visible("Ports players need")) && (await page.getByRole("main").getByText("Ports", { exact: true }).first().isVisible()));
	await shot("server-network");
	check("no script errors during any of it", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
