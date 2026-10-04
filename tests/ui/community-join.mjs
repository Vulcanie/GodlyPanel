// Community access in a real browser: the owner turns the code on in Settings, a friend uses it on
// the sign-in page to make a guest account, lands on the dashboard without any owner-only controls,
// and the whole thing fits a phone. Run with `node tests/ui/community-join.mjs` (needs a Chromium;
// set GP_CHROME to a chrome.exe if it isn't found, GP_SHOTS to keep screenshots).
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
const shot = (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-join-"));
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const PORT = await freePort();
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	// ---- the owner switches the code on
	const owner = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
	const errors = [];
	owner.on("pageerror", (e) => errors.push(e.message));
	await owner.goto(B, { waitUntil: "domcontentloaded" });
	check("no community-code link before the owner has turned it on", (await owner.getByText("I have a community code").count()) === 0);
	await owner.getByLabel(/username/i).fill("admin");
	await owner.getByLabel(/password/i).fill("TestAdmin!2345");
	await owner.getByRole("button", { name: /sign in/i }).click();
	await owner.getByRole("button", { name: "Settings" }).click();
	await owner.getByRole("button", { name: "Open all sections" }).click();
	await owner.getByText("Community access").waitFor({ timeout: 30_000 });
	check("Settings explains Tailscale isn't installed here (or shows it connected)", (await owner.getByText(/Tailscale/).count()) > 0);
	await owner.getByLabel("Community code is off").click();
	const codeEl = owner.getByTestId("community-code");
	await codeEl.waitFor({ timeout: 10_000 });
	const code = (await codeEl.textContent()).trim();
	check("a code appears when switched on", /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code), code);
	check("the message to send holds the code", (await owner.locator("textarea").first().inputValue()).includes(code));
	await shot(owner, "join-1-owner-settings");
	await owner.getByLabel("Most people (blank = no limit)").fill("5");
	await owner.getByLabel("Most people (blank = no limit)").blur();
	await owner.getByText(/up to 5 people/).waitFor({ timeout: 10_000 });
	check("a sign-up limit can be set", true);

	// ---- a friend uses it, on a phone
	const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
	const friend = await phone.newPage();
	friend.on("pageerror", (e) => errors.push(e.message));
	await friend.goto(B, { waitUntil: "domcontentloaded" });
	await friend.getByText("I have a community code").click();
	await friend.getByLabel("Community code").fill(code.toLowerCase());
	await friend.getByLabel("Choose a username").fill("pat-the-friend");
	await friend.getByLabel("Choose a password").fill("short");
	await shot(friend, "join-2-form-phone");
	await friend.getByRole("button", { name: "Create my account" }).click();
	check("a too-short password is explained", await friend.getByText(/at least 8/).first().waitFor({ timeout: 10_000 }).then(() => true, () => false));
	await friend.getByLabel("Choose a password").fill("FriendPass!123");
	await friend.getByLabel("Community code").fill("WRNG-CODE");
	await friend.getByRole("button", { name: "Create my account" }).click();
	check("a wrong code is refused", await friend.getByText("That code isn't right.").waitFor({ timeout: 10_000 }).then(() => true, () => false));
	await friend.getByLabel("Community code").fill(code);
	await friend.getByRole("button", { name: "Create my account" }).click();
	await friend.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 30_000 });
	check("the right code signs them in", true);
	check("they have no owner-only buttons", (await friend.getByRole("button", { name: /^Settings$|^Users$|Create Server/ }).count()) === 0);
	const over = await friend.evaluate(() => ({ scroll: document.documentElement.scrollWidth, view: window.innerWidth }));
	check("it fits a phone-width screen", over.scroll <= Math.max(over.view, 390) + 1, JSON.stringify(over));
	await shot(friend, "join-3-friend-dashboard");

	// ---- the owner sees the account, and the count
	await owner.reload({ waitUntil: "domcontentloaded" });
	await owner.getByRole("button", { name: "Settings" }).click();
	await owner.getByRole("button", { name: "Open all sections" }).click();
	await owner.getByText(/1 person has joined/).waitFor({ timeout: 20_000 });
	check("the owner sees one person has joined", true);
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
