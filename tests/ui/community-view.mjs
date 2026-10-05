// The community view's set-up dialog in a real browser, with a stand-in for cloudflared: open the dialog,
// choose a temporary link, turn it on, see the address, turn it off; and the consent step when cloudflared
// isn't on the PC. Run with `node tests/ui/community-view.mjs` (needs a Chromium; GP_CHROME / GP_SHOTS as in the others).
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
const shot = (page, name, fullPage = false) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

async function boot(extraEnv) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-cview-"));
	const PORT = await freePort();
	fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
	// Its own community port, so a panel already running on this PC (which holds the default one) can't get in the way.
	fs.mkdirSync(path.join(root, "state"), { recursive: true });
	fs.writeFileSync(path.join(root, "state", "community-view.json"), JSON.stringify({ port: await freePort() }));
	const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources"), ...extraEnv }, stdio: "ignore" });
	const B = `http://127.0.0.1:${PORT}`;
	for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
	await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });
	return { B, root, stop: async () => { api.kill(); await new Promise((r) => setTimeout(r, 400)); try { fs.rmSync(root, { recursive: true, force: true }); } catch {} } };
}

const openSettings = async (page, B) => {
	await page.goto(B, { waitUntil: "domcontentloaded" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Open all sections" }).click();
	await page.getByText("Community view (a public address)").first().waitFor({ timeout: 30_000 });
};

const browser = await chromium.launch({ executablePath: EXE });
try {
	// ---- cloudflared is on the PC (a stand-in)
	{
		const panel = await boot({ GHP_CLOUDFLARED_EXE: process.execPath, GHP_CLOUDFLARED_PREARGS: JSON.stringify([path.join(repo, "tests/helpers/fakeCloudflared.js")]) });
		const page = await (await browser.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
		const errors = [];
		page.on("pageerror", (e) => errors.push(e.message));
		await openSettings(page, panel.B);
		check("it starts off", (await page.getByTestId("community-view-state").textContent()) === "Off");
		// The written guide is inside the app.
		await page.getByRole("button", { name: "Read the guide" }).click();
		await page.getByRole("heading", { name: "Community view: guide" }).waitFor();
		check("the guide opens, starting with what it is", await page.getByText(/not your panel on the internet|It is not/).first().isVisible().catch(() => false) || await page.getByText("What it is, and what your friends get").isVisible());
		await page.getByText("Set up your own address with a token (recommended)").click();
		check("it names the community view's own port where Cloudflare asks for it", await page.locator("code", { hasText: /localhost:[0-9]{4,5}/ }).first().waitFor({ timeout: 5000 }).then(() => true, () => false));
		await page.getByText("If something doesn't work").click();
		check("and it covers the common problems", await page.getByText(/error 1033 or 530/).waitFor({ timeout: 5000 }).then(() => true, () => false));
		await shot(page, "cview-0-guide");
		await page.getByRole("button", { name: "Close" }).click();
		await page.getByRole("heading", { name: "Community view: guide" }).waitFor({ state: "hidden" });
		await page.getByRole("button", { name: "Set up", exact: true }).click();
		await page.getByRole("heading", { name: "Set up the community view" }).waitFor();
		check("with cloudflared already there, the dialog skips the download", await page.getByText("cloudflared is ready").isVisible());
		await page.waitForTimeout(700);
		await shot(page, "cview-1-choose");
		await page.getByRole("button", { name: "Read the guide" }).last().click();
		check("the dialog links to the guide too", await page.getByRole("heading", { name: "Community view: guide" }).isVisible());
		await page.getByRole("button", { name: "Close" }).click();
		await page.getByRole("heading", { name: "Community view: guide" }).waitFor({ state: "hidden" });
		await page.getByRole("button", { name: "Next" }).click();
		check("it says what will happen", await page.getByText(/temporary address/i).first().isVisible());
		await page.getByRole("button", { name: "Turn it on" }).click();
		await page.getByTestId("community-view-url").waitFor({ timeout: 30_000 });
		check("the address appears", (await page.getByTestId("community-view-url").textContent()).includes("fake-test-name.trycloudflare.com"));
		await page.waitForFunction(() => document.querySelector("[data-testid=community-view-state]")?.textContent === "On", null, { timeout: 15_000 });
		check("and it says it is on", (await page.getByTestId("community-view-state").textContent()) === "On");
		check("a temporary link is described as temporary", await page.getByText(/temporary address: it changes/).isVisible());
		await shot(page, "cview-2-on");
		// The friends' message now carries the public address instead of Tailscale steps.
		await page.getByLabel(/Community code is off/).click();
		await page.getByTestId("community-code").waitFor({ timeout: 10_000 });
		await page.waitForFunction(() => document.querySelector("textarea")?.value.includes("trycloudflare"), null, { timeout: 15_000 }).catch(() => {});
		const message = await page.locator("textarea").first().inputValue();
		check("the message to friends uses the public address", message.includes("fake-test-name.trycloudflare.com") && !message.includes("Tailscale"), message.split("\n")[1]);
		await page.getByRole("button", { name: "Details" }).click();
		check("details show what the tunnel said", await page.getByText(/Registered tunnel connection/).isVisible());
		await page.getByRole("button", { name: "Turn off" }).click();
		await page.waitForFunction(() => document.querySelector("[data-testid=community-view-state]")?.textContent === "Off", null, { timeout: 15_000 });
		check("it turns off again", (await page.getByTestId("community-view-state").textContent()) === "Off");
		check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
		await panel.stop();
	}

	// ---- cloudflared isn't there: the dialog asks first
	{
		const panel = await boot({ GHP_CLOUDFLARED_NONE: "1" });
		const page = await (await browser.newContext({ viewport: { width: 1100, height: 1000 } })).newPage();
		await openSettings(page, panel.B);
		await page.getByRole("button", { name: "Set up", exact: true }).click();
		check("it explains the download before doing it", await page.getByText(/downloaded once from Cloudflare's official release/).isVisible());
		check("and offers to cancel", await page.getByRole("button", { name: "Cancel" }).isVisible());
		await shot(page, "cview-3-consent");
		// Nothing is downloaded by merely opening the dialog.
		const status = await (await fetch(panel.B + "/api/community", { headers: { Cookie: (await (await fetch(panel.B + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) })).headers.get("set-cookie")).split(";")[0] } })).json();
		check("nothing was downloaded", status.cloudflared.found === false && status.cloudflared.installing === false);
		// And the server refuses to download without the agreement.
		const cookie = (await (await fetch(panel.B + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) })).headers.get("set-cookie")).split(";")[0];
		const refused = await fetch(panel.B + "/api/community/cloudflared/install", { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: "{}" });
		check("the server won't download without being told yes", refused.status === 409 && (await refused.json()).code === "cloudflared-not-installed");
		await page.getByRole("button", { name: "Cancel" }).click();
		await panel.stop();
	}
} catch (e) {
	bad++;
	console.log("FAIL  the run completed  — " + String(e.stack || e).split("\n").slice(0, 4).join(" | "));
} finally {
	await browser.close();
	console.log(`\n${ok} passed, ${bad} failed`);
	process.exit(bad ? 1 : 0);
}
