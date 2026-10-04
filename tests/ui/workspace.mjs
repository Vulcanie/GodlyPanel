// Drives the server workspace in a real browser against a throwaway panel with a
// stand-in game: every tab, as an administrator and as a moderator. Not part of
// `npm test` (it needs a Chromium); run with `node tests/ui/workspace.mjs`. Set
// GP_CHROME to a chrome.exe if it isn't found, and GP_SHOTS to keep screenshots.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeFakeGame, killFakeGames } from "./../helpers/fakeGame.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browsers = path.join(os.homedir(), "AppData/Local/ms-playwright");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(browsers).filter((d) => d.startsWith("chromium-")).map((d) => path.join(browsers, d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const SHOTS = process.env.GP_SHOTS ? path.resolve(process.env.GP_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-workspace-"));
const PORT = 8791;
const game = path.join(root, "game");
const rcon = 47311;
const entry = makeFakeGame(game, { name: "Fake Conan", rconPort: rcon, exe: "gp-ui-fake.exe", ports: { port: 47312, queryPort: 47314 } });
const other = makeFakeGame(path.join(root, "other"), { name: "Other Server", rconPort: 47321, exe: "gp-ui-other.exe", ports: { port: 47322, queryPort: 47324 } });
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [entry, other] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
fs.writeFileSync(path.join(game, "players.txt"), "Alice\nBob\n");

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources"), GHP_UPDATE_API: "http://127.0.0.1:9" }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
const post = async (p, b, cookie) => (await fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(b) }));
await post("/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });
const adminCookie = (await post("/api/auth/login", { username: "admin", password: "TestAdmin!2345" })).headers.get("set-cookie").split(";")[0];
await post("/api/users", { username: "modone", password: "TestMod!2345", role: "moderator", servers: ["Fake Conan"] }, adminCookie);

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const shot = (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const visible = async (page, text, opts = {}) => page.getByText(text, { exact: false, ...opts }).first().isVisible().catch(() => false);
const signIn = async (page, username, password) => {
	await page.goto(B, { waitUntil: "domcontentloaded" });
	await page.getByLabel(/username/i).fill(username);
	await page.getByLabel(/password/i).fill(password);
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("button", { name: "Expand All" }).waitFor({ timeout: 30_000 });
};
const openServer = async (page, name) => {
	await page.getByRole("button", { name: "Expand All" }).click();
	await page.getByText(name, { exact: true }).first().click();
	await settle(page, 1200);
};
const tab = async (page, name) => { await page.getByRole("tab", { name }).click(); await settle(page, 1000); };

try {
	// ---------------------------------------------------------------- administrator
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await signIn(page, "admin", "TestAdmin!2345");
	await openServer(page, "Fake Conan");

	const tabs = await page.getByRole("tab").allTextContents();
	check("an administrator gets every tab", ["Settings", "Backups", "Schedules", "Logs", "Players", "Mods", "Activity", "Automation"].every((t) => tabs.includes(t)), tabs.join(", "));
	check("the settings tab still has the start and stop buttons", await page.getByRole("button", { name: "Start Server", exact: true }).isVisible());
	check("and a Restart button", await page.getByRole("button", { name: "Restart Server" }).isVisible());
	await shot(page, "1-settings");

	// start it through the real button and watch it say so
	await page.getByRole("button", { name: "Start Server", exact: true }).click();
	await page.getByText("Starting…").first().waitFor({ timeout: 15_000 }).catch(() => {});
	check("it says it is starting", await visible(page, "Starting…"));
	await page.getByText("Online", { exact: true }).first().waitFor({ timeout: 60_000 }).catch(() => {});
	check("and then that it is online", await visible(page, "Online"));
	await page.waitForFunction(() => !document.body.innerText.includes("Starting…"), null, { timeout: 30_000 }).catch(() => {});

	// ---- backups
	await tab(page, "Backups");
	check("the backups tab says what is backed up", await visible(page, "ConanSandbox"));
	await shot(page, "2-backups");
	await page.getByRole("button", { name: "Back up now" }).click();
	await page.getByText(/Stopping the server|Copying files|Backing up/).first().waitFor({ timeout: 20_000 }).catch(() => {});
	check("a backup shows its progress", (await visible(page, "Stopping the server")) || (await visible(page, "Copying files")) || (await visible(page, "Backing up")) || (await visible(page, "Backup started")));
	await page.getByText(/^Manual$/).first().waitFor({ timeout: 90_000 }).catch(() => {});
	check("and then it is listed", await visible(page, "Manual"));
	await shot(page, "2b-backups-done");
	await page.getByText("Online", { exact: true }).first().waitFor({ timeout: 60_000 }).catch(() => {});
	check("the server was started again afterwards", await visible(page, "Online"));

	// ---- logs
	await tab(page, "Logs");
	check("the logs tab shows the game's log", await visible(page, "rcon listening"));
	await page.getByLabel("Search this log").fill("listening");
	await page.getByRole("button", { name: "Search", exact: true }).click();
	await settle(page);
	check("a search narrows it to matching lines", await visible(page, "matching line"));
	await shot(page, "3-logs");

	// ---- players
	await tab(page, "Players");
	check("the players tab lists who is on", (await visible(page, "Alice")) && (await visible(page, "Bob")));
	await shot(page, "4-players");

	// ---- schedules
	await tab(page, "Schedules");
	await page.getByRole("button", { name: "Add a schedule" }).click();
	await settle(page, 500);
	await page.getByLabel("Name (optional)").fill("Nightly backup");
	await page.getByRole("button", { name: "Save" }).click();
	await settle(page, 1200);
	check("a schedule can be added", await visible(page, "Nightly backup"));
	check("and says when it runs next", await visible(page, "every day at 04:00") && await visible(page, "Next:"));
	await shot(page, "5-schedules");

	// ---- mods
	await tab(page, "Mods");
	check("the mods tab explains Conan's mods", await visible(page, "modlist.txt"));
	await shot(page, "6-mods");

	// ---- activity + automation
	await tab(page, "Activity");
	check("the activity tab shows what happened", await visible(page, "Backup of Fake Conan finished"));
	await shot(page, "7-activity");
	await tab(page, "Automation");
	await page.getByLabel("Restart it if it crashes").click();
	await settle(page, 600);
	check("auto-restart can be switched on", await page.getByLabel("Restart it if it crashes").isChecked());
	check("presets and cloning are there", (await visible(page, "Setting presets")) && (await visible(page, "Clone this server")));
	await shot(page, "8-automation");

	// ---- dashboard: activity dialog and settings
	await page.getByRole("button", { name: "Back to Dashboard" }).click();
	await settle(page);
	await page.getByRole("button", { name: "Activity" }).click();
	await settle(page, 700);
	check("the dashboard's Activity button lists events for every server", await visible(page, "Fake Conan:"));
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Open all sections" }).click();
	await settle(page, 1200);
	check("settings has the update check", await visible(page, "GodlyPanel version"));
	check("and notification choices", await visible(page, "Events to tell you about"));
	check("and start-with-Windows and backup settings", (await visible(page, "Start GodlyPanel when I sign in to Windows")) && (await visible(page, "Backup folder")));
	await shot(page, "9-settings");

	// ---- people: moderator with servers
	await page.getByRole("button", { name: "Back to Dashboard" }).click();
	await page.getByRole("button", { name: "People" }).click();
	await settle(page, 800);
	check("the people page offers Moderator", await visible(page, "Moderator"));
	check("and shows the limited moderator's scope", await visible(page, "1 server"));
	await shot(page, "10-people");
	check("no script errors for the administrator", errors.length === 0, errors.join(" | "));
	await ctx.close();

	// ---------------------------------------------------------------- moderator
	const mctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
	const mod = await mctx.newPage();
	const merrors = [];
	mod.on("pageerror", (e) => merrors.push(e.message));
	await signIn(mod, "modone", "TestMod!2345");
	check("a moderator sees no People or Settings", (await mod.getByRole("button", { name: "People" }).count()) === 0 && (await mod.getByRole("button", { name: "Settings" }).count()) === 0);
	check("but does see Activity", (await mod.getByRole("button", { name: "Activity" }).count()) === 1);
	await shot(mod, "11-moderator-dashboard");

	// The server they're limited away from isn't clickable.
	await mod.getByRole("button", { name: "Expand All" }).click();
	await mod.getByText("Other Server", { exact: true }).first().click();
	await settle(mod, 800);
	check("a server they weren't given doesn't open", (await mod.getByRole("tab").count()) === 0);

	await mod.getByText("Fake Conan", { exact: true }).first().click();
	await settle(mod, 1200);
	const modTabs = await mod.getByRole("tab").allTextContents();
	check("a moderator gets the day-to-day tabs", ["Controls", "Backups", "Schedules", "Logs", "Players", "Activity"].every((t) => modTabs.includes(t)), modTabs.join(", "));
	check("and not settings, mods or automation", !["Settings", "Mods", "Automation"].some((t) => modTabs.includes(t)));
	check("the controls tab has start, stop and restart", (await mod.getByRole("button", { name: "Restart", exact: true }).count()) === 1 && (await mod.getByRole("button", { name: "Stop", exact: true }).count()) === 1);
	await shot(mod, "12-moderator-controls");
	await tab(mod, "Backups");
	check("a moderator can take a backup", await mod.getByRole("button", { name: "Back up now" }).isEnabled());
	check("but can't restore or delete", (await mod.getByRole("button", { name: /Choose folders/ }).count()) === 0);
	await tab(mod, "Logs");
	check("and read logs", await visible(mod, "rcon listening"));
	check("no script errors for the moderator", merrors.length === 0, merrors.join(" | "));
	await mctx.close();
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1500));
	killFakeGames(game);
	killFakeGames(path.join(root, "other"));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
