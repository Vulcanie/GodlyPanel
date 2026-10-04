// Themes, phone layouts, search/tags and the new management panels, in a real browser
// against a throwaway panel with stand-in games. Not part of `npm test` (it needs a
// Chromium): run `node tests/ui/appearance.mjs`. Set GP_CHROME to a chrome.exe if it
// isn't found, and GP_SHOTS to a folder to keep screenshots (look at them: a page that
// "passes" can still look wrong).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
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

const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-appearance-"));
const PORT = await freePort();
const craft = makeFakeGame(path.join(root, "craft"), { name: "Survival Craft", rconPort: await freePort(), exe: "gp-ui-craft.exe", standardRcon: true });
craft.type = "minecraft";
const conan = makeFakeGame(path.join(root, "conan"), { name: "Friends Conan", rconPort: await freePort(), exe: "gp-ui-conan.exe", ports: { port: await freePort(), queryPort: await freePort() } });
const valheim = path.join(root, "valheim");
fs.mkdirSync(valheim, { recursive: true });
fs.writeFileSync(path.join(valheim, "start.bat"), '@echo off\r\nvalheim_server.exe -savedir "%~dp0saves"\r\n');
const val = { name: "Old Valheim", type: "valheim", method: "process", processName: "nope-valheim.exe", installDir: valheim + "\\", workingDir: valheim, startScriptPath: path.join(valheim, "start.bat"), source: "created", tags: ["archive"], port: 2456 };
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [{ ...craft, tags: ["friends", "modded"] }, { ...conan, tags: ["friends"] }, val] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
fs.writeFileSync(path.join(root, "craft", "players.txt"), "Alice\nBob\n");

const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources"), GHP_UPDATE_API: "http://127.0.0.1:9" }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
const post = async (p, b, cookie) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(b) });
await post("/api/setup/admin", { username: "admin", password: "TestAdmin!2345" });
const adminCookie = (await post("/api/auth/login", { username: "admin", password: "TestAdmin!2345" })).headers.get("set-cookie").split(";")[0];

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const shot = (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const visible = async (page, text) => page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
const overflow = (page, width) => page.evaluate((w) => ({ scroll: document.documentElement.scrollWidth, view: w ?? window.innerWidth }), width);
const bg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const signIn = async (page) => {
	await page.goto(B, { waitUntil: "domcontentloaded" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.getByRole("button", { name: "Expand All" }).waitFor({ timeout: 30_000 });
};
const luminance = (css) => { const m = css.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };

try {
	// ------------------------------------------------------------------ themes
	{
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, colorScheme: "dark" });
		const page = await ctx.newPage();
		await signIn(page);
		await page.getByRole("button", { name: "Expand All" }).click();
		await settle(page);
		check("follows Windows: dark when Windows is dark", luminance(await bg(page)) < 0.2, await bg(page));
		await shot(page, "01-dashboard-dark");

		await page.getByRole("button", { name: "Appearance" }).click();
		await page.getByRole("menuitem", { name: "Light" }).click();
		await settle(page, 500);
		check("switches to light", luminance(await bg(page)) > 0.85, await bg(page));
		check("the page says which it is using", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");
		await shot(page, "02-dashboard-light");

		await page.reload({ waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "Expand All" }).waitFor();
		check("remembers the choice after a reload", luminance(await bg(page)) > 0.85);

		await page.getByRole("button", { name: "Appearance" }).click();
		await page.getByRole("menuitem", { name: "Match Windows" }).click();
		await page.emulateMedia({ colorScheme: "dark" });
		await settle(page, 400);
		check("'match Windows' goes back to dark", luminance(await bg(page)) < 0.2);
		await page.emulateMedia({ colorScheme: "light" });
		await settle(page, 400);
		check("and follows Windows live", luminance(await bg(page)) > 0.85);

		// Text must stay readable: no text at all in the same colour as its background.
		await page.getByRole("button", { name: "Expand All" }).click();
		await settle(page, 600);
		const unreadable = await page.evaluate(() => {
			const parse = (c) => c.match(/[\d.]+/g).map(Number);
			const effectiveBg = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > 0.5) return c.slice(0, 3); } return [255, 255, 255]; };
			const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
			const bad = [];
			for (const el of document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,button,label,td,th,li")) {
				if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
				const r = el.getBoundingClientRect();
				if (r.width === 0 || r.height === 0) continue;
				// Text over the game banners is white on an image with a dark overlay; skip it.
				if (el.closest(".MuiAccordionSummary-root")) continue;
				const fg = parse(getComputedStyle(el).color).slice(0, 3);
				if (Math.abs(lum(fg) - lum(effectiveBg(el))) < 0.25) bad.push(el.textContent.trim().slice(0, 30));
			}
			return bad;
		});
		check("no text is lost against its background (light)", unreadable.length === 0, unreadable.slice(0, 5).join(" | "));
		await ctx.close();
	}

	// ------------------------------------------------------------------ search, tags, groups
	{
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, colorScheme: "dark" });
		const page = await ctx.newPage();
		await signIn(page);
		await page.getByRole("button", { name: "Expand All" }).click();
		await settle(page);
		check("the dashboard lists all three servers", (await page.getByText("Survival Craft").count()) > 0 && (await page.getByText("Friends Conan").count()) > 0 && (await page.getByText("Old Valheim").count()) > 0);
		check("tags are shown on the servers", (await page.getByText("modded", { exact: true }).count()) > 0);

		const search = page.getByLabel("Search servers");
		await search.fill("conan");
		await settle(page, 500);
		check("search narrows to what matches", (await page.getByText("Friends Conan").count()) > 0 && (await page.getByText("Survival Craft").count()) === 0);
		check("and says how many", await visible(page, "Showing 1 of 3"));
		await search.fill("modded");
		await settle(page, 500);
		check("search finds by tag", (await page.getByText("Survival Craft").count()) > 0 && (await page.getByText("Friends Conan").count()) === 0);
		await search.fill("zzz");
		await settle(page, 500);
		check("a search with no match says so", await visible(page, "No servers match"));
		await search.fill("");
		await settle(page, 400);

		await page.getByRole("button", { name: "friends", exact: true }).click();
		await settle(page, 500);
		check("a tag chip filters", (await page.getByText("Old Valheim").count()) === 0 && (await page.getByText("Friends Conan").count()) > 0);
		await page.getByRole("button", { name: "Clear" }).click();

		await page.getByLabel("Group by").click();
		await page.getByRole("option", { name: "Tag" }).click();
		await settle(page, 600);
		await page.getByRole("button", { name: "Expand All" }).click();
		await settle(page, 400);
		check("groups by tag", (await page.getByText("friends", { exact: true }).count()) > 0 && (await page.getByText("archive", { exact: true }).count()) > 0);
		await shot(page, "03-dashboard-by-tag");
		await ctx.close();
	}

	// ------------------------------------------------------------------ the management panels (desktop)
	{
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
		const page = await ctx.newPage();
		await signIn(page);
		await page.getByRole("button", { name: "Expand All" }).click();
		await page.getByText("Survival Craft", { exact: true }).first().click();
		await settle(page, 1200);
		check("an administrator can edit tags", (await page.getByLabel("Add a tag").count()) > 0);
		await page.getByLabel("Add a tag").fill("weekend");
		await page.getByLabel("Add a tag").press("Enter");
		await settle(page, 1500);
		check("adding a tag sticks", (await page.getByText("weekend", { exact: true }).count()) > 0);

		await page.getByRole("tab", { name: "Players" }).click();
		await settle(page, 1200);
		check("the players tab offers to manage players", await visible(page, "Manage players"));
		check("with kick and ban for a game with a console", (await page.getByRole("button", { name: "Kick" }).count()) > 0 && (await page.getByRole("button", { name: "Ban", exact: true }).count()) > 0);
		check("and its lists", (await visible(page, "Whitelist")) && (await visible(page, "Operators")));
		await shot(page, "04-players-admin");

		await page.getByRole("tab", { name: "Backups" }).click();
		await settle(page, 1200);
		check("the backups tab has a place for off-PC copies", await visible(page, "Copies off this PC"));
		await shot(page, "05-backups");

		await page.getByText("Back to Dashboard").click();
		await page.getByRole("button", { name: "Settings" }).click();
		await page.getByRole("button", { name: "Open all sections" }).click();
		await settle(page, 1500);
		check("settings has off-PC backup places", await visible(page, "Copies of backups off this PC"));
		await page.getByRole("button", { name: "Add a place" }).click();
		await settle(page, 500);
		check("adding one offers a folder or S3-compatible storage", (await visible(page, "Kind")) && (await visible(page, "Name")));
		await shot(page, "06-add-destination");
		await page.getByRole("button", { name: "Cancel" }).click();
		await ctx.close();
	}

	// ------------------------------------------------------------------ phone layouts
	for (const [label, scheme, size] of [["phone-dark", "dark", { width: 390, height: 844 }], ["phone-light", "light", { width: 390, height: 844 }], ["tablet", "dark", { width: 768, height: 1024 }]]) {
		const ctx = await browser.newContext({ viewport: size, colorScheme: scheme, deviceScaleFactor: 2, hasTouch: true, isMobile: size.width < 500 });
		const page = await ctx.newPage();
		await signIn(page);
		await page.getByRole("button", { name: "Expand All" }).click();
		await settle(page, 800);
		let o = await overflow(page, size.width);
		check(`${label}: the dashboard fits the screen width`, o.scroll <= o.view, `${o.scroll} vs ${o.view}`);
		await shot(page, `10-${label}-dashboard`);

		await page.getByText("Survival Craft", { exact: true }).first().click();
		await settle(page, 1200);
		o = await overflow(page, size.width);
		check(`${label}: a server's page fits`, o.scroll <= o.view, `${o.scroll} vs ${o.view}`);
		await shot(page, `11-${label}-server`);
		for (const name of ["Players", "Backups", "Stats", "Schedules", "Automation"]) {
			const t = page.getByRole("tab", { name });
			if ((await t.count()) === 0) continue;
			await t.scrollIntoViewIfNeeded();
			await t.click();
			await settle(page, 900);
			o = await overflow(page, size.width);
			check(`${label}: the ${name} tab fits`, o.scroll <= o.view, `${o.scroll} vs ${o.view}`);
			if (name === "Players" || name === "Backups") await shot(page, `12-${label}-${name.toLowerCase()}`);
		}
		await page.getByText("Back to Dashboard").click();
		await page.getByRole("button", { name: "Settings" }).click();
		await page.getByRole("button", { name: "Open all sections" }).click();
		await settle(page, 1500);
		o = await overflow(page, size.width);
		check(`${label}: settings fits`, o.scroll <= o.view, `${o.scroll} vs ${o.view}`);
		await shot(page, `13-${label}-settings`);
		await page.getByRole("button", { name: "Add a place" }).click();
		await settle(page, 500);
		const box = await page.getByRole("dialog").boundingBox();
		check(`${label}: a dialog fits the screen`, box && box.x >= 0 && box.x + box.width <= size.width + 1, JSON.stringify(box));
		await shot(page, `14-${label}-dialog`);
		await ctx.close();
	}
} catch (err) {
	bad++;
	console.log("FAIL  the run completed  — " + (err.stack || err).toString().split("\n").slice(0, 4).join(" | "));
} finally {
	await browser.close();
	api.kill();
	killFakeGames(path.join(root, "craft"));
	killFakeGames(path.join(root, "conan"));
	await new Promise((r) => setTimeout(r, 500));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
	console.log(`\n${ok} passed, ${bad} failed`);
	process.exit(bad ? 1 : 0);
}
