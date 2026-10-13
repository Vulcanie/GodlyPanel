// The panel's frame in a real browser: the Ctrl+K command palette, the sidebar's server list, the Start/Stop/Restart buttons on the
// dashboard's cards, the dropdowns and "no explanation" markers in a game's settings form, the notice on the Mods tab, and the (i)
// beside a panel setting with its link to the guide. Not part of `npm test` (it needs a Chromium); run it with
// `node tests/ui/shell.mjs`. Set GP_CHROME to a chrome.exe if it isn't found, and GP_SHOTS to keep screenshots.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeFakeGame, killFakeGames } from "./../helpers/fakeGame.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
const SHOTS = process.env.GP_SHOTS ? path.resolve(process.env.GP_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-shell-"));
const PORT = await freePort();
// A stand-in game that really starts and stops (so the card's buttons have something to act on) ...
const conan = makeFakeGame(path.join(root, "conan"), { name: "Shell Conan", rconPort: await freePort(), exe: "gp-ui-shell.exe", ports: { port: await freePort(), queryPort: await freePort() } });
// ... and a Minecraft server that is only ever read: its settings file has a setting with a short list of values (difficulty) and one
// the panel has never heard of (as a plugin would add).
const craftDir = path.join(root, "craft");
fs.mkdirSync(craftDir, { recursive: true });
const propertiesFile = path.join(craftDir, "server.properties");
fs.writeFileSync(propertiesFile, "motd=Hello\ndifficulty=hard\ngamemode=survival\nmax-players=20\npvp=true\nmy-plugin-option=7\n");
fs.writeFileSync(path.join(craftDir, "start.bat"), "@echo off\r\njava -Xmx6G -jar server.jar nogui\r\n");
const craft = { name: "Shell Craft", type: "minecraft", source: "imported", method: "process", host: "127.0.0.1", processName: "gp-not-running.exe", port: 25565, installDir: craftDir, workingDir: craftDir, startScriptPath: path.join(craftDir, "start.bat"), configPath: propertiesFile };
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [conan, craft] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources"), GHP_UPDATE_API: "http://127.0.0.1:9" }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const visible = (page, text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
try {
	const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	// Every call the panel makes to start, stop or restart something, in order.
	const controls = [];
	page.on("request", (r) => { const m = r.method() === "POST" && r.url().match(/\/api\/control\/([^/]+)\/(\w+)$/); if (m) controls.push(`${decodeURIComponent(m[1])}:${m[2]}`); });
	const onServer = async (name) => (await page.getByTestId("tab-overview").count()) > 0 && (await page.getByRole("main").getByRole("heading", { name, level: 1 }).count()) > 0;
	const selectedTab = (key) => page.getByTestId(`tab-${key}`).getAttribute("aria-selected");

	await page.goto(B, { waitUntil: "domcontentloaded" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("heading", { name: "Dashboard", level: 1 }).waitFor({ timeout: 30_000 });

	// ---- the sidebar
	check("the sidebar lists every server", (await page.getByTestId("sidebar-server-Shell Conan").count()) === 1 && (await page.getByTestId("sidebar-server-Shell Craft").count()) === 1);
	check("and the pages an administrator can go to", (await Promise.all(["dashboard", "create", "activity", "people", "settings"].map((n) => page.getByTestId(`nav-${n}`).count()))).every((c) => c === 1));
	await page.getByTestId("sidebar-server-Shell Craft").click();
	await settle(page);
	check("a server in the sidebar opens that server", await onServer("Shell Craft"));
	check("with the sidebar marking it as the one you are on", (await page.getByTestId("sidebar-server-Shell Craft").getAttribute("class")).includes("Mui-selected"));
	await page.getByTestId("nav-dashboard").click();
	await settle(page);
	check("and Dashboard in the sidebar goes back", (await page.getByRole("heading", { name: "Dashboard", level: 1 }).count()) > 0);

	// ---- the command palette
	await page.keyboard.press("Control+k");
	await page.getByTestId("palette-input").waitFor({ timeout: 5000 });
	check("Ctrl+K opens the command palette", true);
	check("it starts with the pages", (await page.getByTestId("palette-results").innerText()).includes("Settings"));
	await shot(page, "shell-1-palette");
	await page.keyboard.press("Escape");
	await page.getByTestId("palette-input").waitFor({ state: "hidden" });
	check("Escape closes it", true);
	await page.getByTestId("open-palette").click();
	await page.getByTestId("palette-input").waitFor();
	check("the search button in the top bar opens it too", true);
	await page.keyboard.press("Escape");
	await page.getByTestId("palette-input").waitFor({ state: "hidden" });

	await page.keyboard.press("Control+k");
	await page.getByTestId("palette-input").fill("shell craft");
	await settle(page, 300);
	check("typing a server's name lists it", (await page.getByTestId("palette-results").innerText()).includes("Shell Craft"));
	await page.keyboard.press("Enter");
	await settle(page);
	check("Enter jumps to that server", await onServer("Shell Craft"));

	await page.keyboard.press("Control+k");
	await page.getByTestId("palette-input").fill("conan backups");
	await settle(page, 300);
	check("a server and a page together find that server's tab", (await page.getByTestId("palette-results").innerText()).includes("Shell Conan: Backups"));
	await page.keyboard.press("Enter");
	await settle(page);
	check("Enter jumps to the server's tab", (await onServer("Shell Conan")) && (await selectedTab("backups")) === "true");
	check("the palette is closed afterwards", (await page.getByTestId("palette-input").count()) === 0);
	await page.goBack();
	await settle(page);
	check("and the browser's Back button steps back through those jumps", await onServer("Shell Craft"));

	await page.keyboard.press("Control+k");
	await page.getByTestId("palette-input").fill("settings");
	await settle(page, 300);
	await page.getByTestId("palette-results").getByText("Settings", { exact: true }).first().click();
	await settle(page);
	check("clicking a page in the palette goes there", (await page.getByRole("heading", { name: "Settings", level: 1 }).count()) > 0);
	await page.keyboard.press("Control+k");
	await page.getByTestId("palette-input").fill("zzzqqq");
	await settle(page, 300);
	check("a search with no match says so", await visible(page, "Nothing matches"));
	await page.keyboard.press("Escape");

	// ---- the (i) beside a panel setting
	await page.getByTestId("nav-settings").click();
	await page.getByTestId("settings-category-general").click();
	await settle(page);
	const tip = page.getByRole("button", { name: "About this setting: Web port" });
	await tip.hover();
	const link = page.getByRole("tooltip").getByRole("link").first();
	await link.waitFor({ timeout: 5000 });
	const href = await link.getAttribute("href");
	check("hovering the (i) beside a setting explains it and links to the guide", /^https:\/\/github\.com\/Vulcanie\/GodlyPanel\/blob\/main\/docs\//.test(href ?? ""), href);
	check("the link opens in a new tab and leaves nothing behind", (await link.getAttribute("target")) === "_blank" && /noopener/.test((await link.getAttribute("rel")) ?? ""));
	await shot(page, "shell-2-infotip");
	await page.mouse.move(5, 500);

	// ---- the dashboard's Start / Stop / Restart
	await page.getByTestId("nav-dashboard").click();
	await page.getByTestId("server-card-Shell Conan").waitFor();
	await settle(page, 1500);
	const startBtn = page.getByRole("button", { name: "Start Shell Conan", exact: true });
	const stopBtn = page.getByRole("button", { name: "Stop Shell Conan", exact: true });
	const restartBtn = page.getByRole("button", { name: "Restart Shell Conan", exact: true });
	check("an offline server's card has Start and nothing else to press", (await startBtn.isEnabled()) && (await stopBtn.isDisabled()) && (await restartBtn.isDisabled()));
	await startBtn.click();
	await page.waitForRequest((r) => r.method() === "POST" && /\/api\/control\/Shell%20Conan\/start$/.test(r.url()), { timeout: 10_000 }).catch(() => {});
	check("Start asks the panel to start it, without asking first", controls.includes("Shell Conan:start"));
	await page.getByTestId("server-card-Shell Conan").getByText("Online", { exact: true }).waitFor({ timeout: 90_000 }).catch(() => {});
	check("the card then says it is online", await page.getByTestId("server-card-Shell Conan").getByText("Online", { exact: true }).isVisible());
	await shot(page, "shell-3-online");

	await restartBtn.click();
	const dialog = page.getByRole("dialog");
	await dialog.getByText("Restart Shell Conan?").waitFor({ timeout: 5000 });
	check("Restart asks first, because players are on", true);
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await dialog.waitFor({ state: "hidden" });
	check("and Cancel sends nothing", !controls.includes("Shell Conan:restart"));
	await stopBtn.click();
	await dialog.getByText("Stop Shell Conan?").waitFor({ timeout: 5000 });
	check("Stop asks first too", true);
	await dialog.getByRole("button", { name: "Cancel" }).click();
	await dialog.waitFor({ state: "hidden" });
	check("and Cancel sends nothing", !controls.includes("Shell Conan:stop"));
	await stopBtn.click();
	await page.getByTestId("confirm-yes").click();
	await page.waitForRequest((r) => r.method() === "POST" && /\/api\/control\/Shell%20Conan\/stop$/.test(r.url()), { timeout: 10_000 }).catch(() => {});
	check("saying yes asks the panel to stop it", controls.includes("Shell Conan:stop"));
	await page.getByTestId("server-card-Shell Conan").getByText("Offline", { exact: true }).waitFor({ timeout: 60_000 }).catch(() => {});
	check("the card goes back to offline", await page.getByTestId("server-card-Shell Conan").getByText("Offline", { exact: true }).isVisible());

	// ---- the Mods tab warns that mods have no explanations
	await page.getByTestId("sidebar-server-Shell Conan").click();
	await page.getByTestId("tab-mods").click();
	await settle(page, 1000);
	check("the Mods tab says a mod's settings will have no explanations", await page.getByTestId("mods-no-explanations").isVisible());

	// ---- a game's settings: a dropdown for a setting with a few values, and "no explanation" for one the panel doesn't know
	await page.getByTestId("sidebar-server-Shell Craft").click();
	await page.getByTestId("tab-settings").click();
	await page.getByTestId("save-config").waitFor();
	await settle(page, 800);
	check("a setting the panel doesn't know is counted and explained at the top", await visible(page, "1 setting here has no explanation") && await visible(page, "Mods will not have explanations"));
	const search = page.getByRole("textbox", { name: "Search settings" });
	await search.fill("my-plugin");
	await settle(page, 400);
	check("and it carries a 'no explanation' marker beside it", await page.getByText("no explanation", { exact: true }).first().isVisible());
	await search.fill("difficulty");
	await settle(page, 400);
	const row = page.getByText("difficulty", { exact: true }).first().locator("xpath=ancestor::div[.//*[@role='combobox']][1]");
	const dropdown = row.getByRole("combobox");
	check("difficulty is a dropdown showing its current value", (await dropdown.count()) === 1 && /Hard/.test(await dropdown.innerText()), await dropdown.innerText().catch(() => ""));
	check("and it is not marked as lacking an explanation", (await row.getByText("no explanation", { exact: true }).count()) === 0);
	await dropdown.click();
	const options = await page.getByRole("option").allInnerTexts();
	check("it offers the game's own choices", ["Easy", "Normal", "Hard"].every((o) => options.some((t) => t.startsWith(o))) && options.some((t) => /Peaceful/.test(t)), options.join(" | "));
	await page.getByRole("option", { name: "Easy", exact: true }).click();
	await settle(page, 300);
	check("choosing one marks the file as changed", await page.getByTestId("save-config").isEnabled());
	await shot(page, "shell-4-dropdown");
	await page.getByTestId("save-config").click();
	await page.getByText(/saved/i).first().waitFor({ timeout: 10_000 }).catch(() => {});
	check("saving writes the choice into the game's own file", /^difficulty=easy$/m.test(fs.readFileSync(propertiesFile, "utf8")), fs.readFileSync(propertiesFile, "utf8").replace(/\n/g, " | "));

	check("no script errors", errors.length === 0, errors.join(" | "));
} catch (e) {
	bad++;
	console.log("FAIL  the run completed  — " + String(e.stack || e).split("\n").slice(0, 4).join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	killFakeGames(path.join(root, "conan"));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
	console.log(`\n${ok} passed, ${bad} failed`);
	process.exit(bad ? 1 : 0);
}
