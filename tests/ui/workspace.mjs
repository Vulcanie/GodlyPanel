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
import { EXE } from "./_chrome.mjs";
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
	await page.getByRole("heading", { name: "Dashboard", level: 1 }).waitFor({ timeout: 30_000 });
};
// The sidebar lists every server the person may open.
const openServer = async (page, name) => {
	await page.getByTestId(`sidebar-server-${name}`).click();
	await page.getByTestId("tab-overview").waitFor();
	await settle(page, 1200);
};
// The server page's header says "Online · <game>" / "Offline · <game>" / "Starting… · <game>".
const isOnline = (page) => visible(page, /^Online ·/);
const waitOnline = (page, timeout = 60_000) => page.getByText(/^Online ·/).first().waitFor({ timeout }).catch(() => {});
// Pages that are not a server's have no Back button; the sidebar is the way between them.
const openSettings = async (page, category) => {
	await page.getByTestId("nav-settings").click();
	await page.getByTestId(`settings-category-${category}`).click();
	await settle(page, 1000);
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
	check("an administrator gets every tab", ["Overview", "Settings", "Players", "Backups", "Schedules", "Logs", "Network", "Mods", "Activity", "Automation", "Advanced"].every((t) => tabs.includes(t)), tabs.join(", "));
	check("the header has the start, restart and stop buttons whatever tab is open", (await page.getByTestId("header-start").isVisible()) && (await page.getByTestId("header-restart").isVisible()) && (await page.getByTestId("header-stop").isVisible()));
	check("the overview has the same controls and the performance charts", (await page.getByTestId("ctl-start").isVisible()) && (await visible(page, "Performance")));
	check("while it is off only Start can be pressed", (await page.getByTestId("header-start").isEnabled()) && (await page.getByTestId("header-restart").isDisabled()));
	await shot(page, "1-overview");

	// the settings form (the game's own file, with a form and an explanation for each setting)
	await tab(page, "Settings");
	check("the settings tab shows the game's settings file as a form", (await page.getByTestId("save-config").count()) === 1 && (await page.getByTestId("save-config").isDisabled()));
	await shot(page, "1-settings");

	// start it through the real button and watch it say so
	await tab(page, "Overview");
	await page.getByTestId("header-start").click();
	await page.getByText("Starting…").first().waitFor({ timeout: 15_000 }).catch(() => {});
	check("it says it is starting", await visible(page, "Starting…"));
	await waitOnline(page);
	check("and then that it is online", await isOnline(page));
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
	await waitOnline(page);
	check("the server was started again afterwards", await isOnline(page));

	// ---- restart and use a backup
	const worldFile = path.join(game, "ConanSandbox", "Saved", "world.sav");
	fs.writeFileSync(worldFile, "world NEWER than the backup\n");
	await page.getByRole("button", { name: "Restart and use this backup" }).first().click();
	const dialog = page.getByRole("dialog");
	await dialog.getByText("This erases everything newer than this backup.").waitFor({ timeout: 10_000 });
	check("a running server's backup says it will restart and what it erases", (await visible(page, "stop the server, put this backup back, and start it again")) && (await visible(page, "erases everything newer")));
	check("a safety backup is kept by default, so no name has to be typed", (await dialog.getByRole("checkbox", { name: /Keep a safety backup/ }).isChecked()) && (await dialog.getByLabel(/type Fake Conan to confirm/).count()) === 0);
	await settle(page, 700);
	if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "2c-restore-dialog.png") });
	await dialog.getByRole("checkbox", { name: /Keep a safety backup/ }).uncheck();
	const confirm = dialog.getByRole("button", { name: "Restart and use this backup" });
	check("without the safety backup it asks for the server's name", await confirm.isDisabled());
	await dialog.getByLabel(/type Fake Conan to confirm/).fill("Fake Conan");
	check("and then goes ahead", await confirm.isEnabled());
	await dialog.getByRole("checkbox", { name: /Keep a safety backup/ }).check();
	check("with the safety backup back on, the name isn't needed", (await dialog.getByLabel(/type Fake Conan to confirm/).count()) === 0 && (await confirm.isEnabled()));
	await confirm.click();
	await page.getByText(/Restoring. The server is being stopped/).first().waitFor({ timeout: 10_000 }).catch(() => {});
	check("it says what is happening", (await visible(page, "Restoring.")) || (await visible(page, "Restored Fake Conan")));
	await page.getByText(/Restored Fake Conan from backup .*started it again/).first().waitFor({ timeout: 120_000 }).catch(() => {});
	check("and when it is done", await visible(page, "started it again"));
	await shot(page, "2d-restored");
	check("the older world is back", fs.readFileSync(worldFile, "utf8").startsWith("world v1"));
	await waitOnline(page);
	check("and the server is running again", await isOnline(page));
	check("a safety backup of the newer world was kept", await visible(page, "Before a restore"));

	// ---- logs
	await tab(page, "Logs");
	check("the logs tab shows the game's log", await visible(page, "rcon listening"));
	await page.getByRole("textbox", { name: "Search this log" }).fill("listening");
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
	await page.getByRole("textbox", { name: "Name (optional)" }).fill("Nightly backup");
	await page.getByRole("button", { name: "Save" }).click();
	await settle(page, 1200);
	check("a schedule can be added", await visible(page, "Nightly backup"));
	check("and says when it runs next", await visible(page, "every day at 04:00") && await visible(page, "Next:"));
	await shot(page, "5-schedules");

	// ---- mods
	await tab(page, "Mods");
	check("the mods tab explains Conan's mods", await visible(page, "modlist.txt"));
	check("and warns that mods' settings have no explanations", await page.getByTestId("mods-no-explanations").isVisible());
	await shot(page, "6-mods");

	// ---- activity + automation
	await tab(page, "Activity");
	check("the activity tab shows what happened", await visible(page, "Backup of Fake Conan finished"));
	await shot(page, "7-activity");
	await tab(page, "Automation");
	// Each setting also has an (i) button beside it, so the switch is asked for by its role.
	await page.getByRole("switch", { name: "Restart it if it crashes" }).click();
	await settle(page, 600);
	check("auto-restart can be switched on", await page.getByRole("switch", { name: "Restart it if it crashes" }).isChecked());
	check("presets and cloning are there", (await visible(page, "Setting presets")) && (await visible(page, "Clone this server")));
	await shot(page, "8-automation");

	// ---- stopping asks first, because players are on
	await tab(page, "Overview");
	await page.getByTestId("header-stop").click();
	const stopDialog = page.getByRole("dialog");
	await stopDialog.getByText("Stop Fake Conan?").waitFor({ timeout: 10_000 });
	check("Stop asks before it disconnects anyone", await stopDialog.getByText(/Players will be disconnected/).isVisible());
	await stopDialog.getByRole("button", { name: "Cancel" }).click();
	await stopDialog.waitFor({ state: "hidden" });
	check("and cancelling leaves it running", await isOnline(page));
	await page.getByTestId("header-stop").click();
	await page.getByTestId("confirm-yes").click();
	await page.getByText(/^Offline ·/).first().waitFor({ timeout: 60_000 }).catch(() => {});
	check("confirming stops it", await visible(page, /^Offline ·/));
	await shot(page, "8b-stopped");

	// ---- the sidebar's Activity page and the settings
	await page.getByTestId("nav-activity").click();
	await settle(page, 700);
	check("the Activity page lists events for every server", await visible(page, "Fake Conan"));
	await openSettings(page, "general");
	check("settings has the update check", await visible(page, "GodlyPanel version"));
	check("and start-with-Windows", await visible(page, "Start GodlyPanel when I sign in to Windows"));
	await page.getByTestId("settings-category-notifications").click();
	await settle(page, 700);
	check("and notification choices", await visible(page, "Events to tell you about"));
	await page.getByTestId("settings-category-backups").click();
	await settle(page, 700);
	check("and backup settings", await visible(page, "Backup folder"));
	await shot(page, "9-settings");

	// ---- people: moderator with servers
	await page.getByTestId("nav-people").click();
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
	check("a moderator sees no People, Settings or Create server", (await mod.getByTestId("nav-people").count()) === 0 && (await mod.getByTestId("nav-settings").count()) === 0 && (await mod.getByTestId("nav-create").count()) === 0 && (await mod.getByTestId("create-server").count()) === 0);
	check("but does see Activity", (await mod.getByTestId("nav-activity").count()) === 1);
	check("and only the servers they were given are in the sidebar", (await mod.getByTestId("sidebar-server-Fake Conan").count()) === 1 && (await mod.getByTestId("sidebar-server-Other Server").count()) === 0);
	await shot(mod, "11-moderator-dashboard");

	// The server they're limited away from isn't clickable.
	if ((await mod.getByTestId("server-card-Other Server").count()) > 0) {
		await mod.getByTestId("server-card-Other Server").click();
		await settle(mod, 800);
	}
	check("a server they weren't given doesn't open", (await mod.getByRole("tab").count()) === 0);

	await mod.getByTestId("server-card-Fake Conan").click();
	await settle(mod, 1200);
	const modTabs = await mod.getByRole("tab").allTextContents();
	check("a moderator gets the day-to-day tabs", ["Overview", "Players", "Backups", "Schedules", "Logs", "Network", "Activity"].every((t) => modTabs.includes(t)), modTabs.join(", "));
	check("and not settings, mods, automation or advanced", !["Settings", "Mods", "Automation", "Advanced"].some((t) => modTabs.includes(t)));
	check("the header has start, stop and restart", (await mod.getByTestId("header-start").count()) === 1 && (await mod.getByTestId("header-stop").count()) === 1 && (await mod.getByTestId("header-restart").count()) === 1);
	check("and the overview has no labels or tags to edit", (await mod.getByLabel("Add a tag").count()) === 0);
	await shot(mod, "12-moderator-overview");
	await tab(mod, "Backups");
	check("a moderator can take a backup", await mod.getByRole("button", { name: "Back up now" }).isEnabled());
	check("but can't restore or delete", (await mod.getByRole("button", { name: /Choose folders/ }).count()) === 0 && (await mod.getByRole("button", { name: /use this backup/i }).count()) === 0);
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
