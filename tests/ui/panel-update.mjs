// "Update now" in a real browser, up to the point where the desktop app takes over: a stand-in for GitHub offers a newer
// version; the card shows what's new and a button with the size of the (small) download; the confirmation says what will
// happen; pressing it shows progress and then the "Updating GodlyPanel" screen; if the app refuses, that screen goes and the
// reason is shown; and a copy that can't update itself says why instead. The real swap and restart are checked against the
// packaged app by tests/real/self-update.mjs. Run with `node tests/ui/panel-update.mjs` (needs a Chromium; GP_CHROME /
// GP_SHOTS as in the others).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZip } from "../../src/server/util/tarZip.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const browsers = path.join(os.homedir(), "AppData/Local/ms-playwright");
const EXE =
	process.env.GP_CHROME ||
	fs.readdirSync(browsers).filter((d) => d.startsWith("chromium-")).map((d) => path.join(browsers, d, "chrome-win64/chrome.exe")).find((p) => fs.existsSync(p));
const SHOTS = process.env.GP_SHOTS ? path.resolve(process.env.GP_SHOTS) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => SHOTS && page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

const OLD = "0.1.0-alpha.12";
const NEW = "0.1.0-alpha.99";
const ELECTRON = "44.4.5";
const work = fs.mkdtempSync(path.join(os.tmpdir(), "gp-uiupdate-"));

// The small download, as scripts/make-update-payload.mjs makes it.
const build = path.join(work, "build");
const files = { "resources/app.asar": "asar of the new version", "resources/scripts/x.ps1": "# x" };
for (const [rel, text] of Object.entries(files)) {
	fs.mkdirSync(path.dirname(path.join(build, rel)), { recursive: true });
	fs.writeFileSync(path.join(build, rel), text);
}
fs.writeFileSync(path.join(build, "update-manifest.json"), JSON.stringify({ format: 1, version: NEW, electron: ELECTRON, files: Object.entries(files).map(([p, t]) => ({ path: p, size: Buffer.byteLength(t), sha256: sha(t) })) }));
await createZip(path.join(work, "app.zip"), [{ dir: build, name: "resources" }, { dir: build, name: "update-manifest.json" }]);
const appZip = fs.readFileSync(path.join(work, "app.zip"));
const assets = {
	[`GodlyPanel-${NEW}-app.zip`]: appZip,
	"update-manifest.json": Buffer.from(JSON.stringify({ format: 1, version: NEW, electron: ELECTRON, app: { name: `GodlyPanel-${NEW}-app.zip`, size: appZip.length, sha256: sha(appZip) } })),
};
const ghPort = await freePort();
const gh = http.createServer((req, res) => {
	if (req.url.startsWith("/repos/")) {
		res.setHeader("Content-Type", "application/json");
		return res.end(JSON.stringify([{ tag_name: `v${NEW}`, name: `GodlyPanel ${NEW}`, prerelease: true, published_at: "2026-10-05T00:00:00Z", body: "What changed in the test release.", assets: Object.entries(assets).map(([n, b]) => ({ name: n, size: b.length, browser_download_url: `http://127.0.0.1:${ghPort}/dl/${n}` })) }]));
	}
	const f = assets[decodeURIComponent(req.url.replace("/dl/", ""))];
	if (!f) { res.statusCode = 404; return res.end(); }
	res.end(f);
});
await new Promise((r) => gh.listen(ghPort, "127.0.0.1", r));

async function boot({ ipc, selfUpdate, result = null }) {
	const root = fs.mkdtempSync(path.join(work, "data-"));
	if (result) {
		fs.mkdirSync(path.join(root, "state"), { recursive: true });
		fs.writeFileSync(path.join(root, "state", "update-result.json"), JSON.stringify(result));
	}
	const PORT = await freePort();
	const appDir = path.join(work, "installed");
	fs.mkdirSync(appDir, { recursive: true });
	fs.writeFileSync(path.join(appDir, "GodlyPanel.exe"), "x");
	fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false }, updates: { check: false, includePrereleases: true, repo: "test/repo" } }));
	const messages = [];
	const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], {
		env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources"), GHP_UPDATE_API: `http://127.0.0.1:${ghPort}`, GHP_APP_VERSION: OLD, GHP_ELECTRON_VERSION: ELECTRON, ...(selfUpdate ? { GHP_SELF_UPDATE: "1", GHP_APP_DIR: appDir, GHP_APP_EXE: path.join(appDir, "GodlyPanel.exe") } : {}) },
		stdio: ipc ? ["ignore", "ignore", "ignore", "ipc"] : "ignore",
	});
	if (ipc) api.on("message", (m) => messages.push(m));
	const B = `http://127.0.0.1:${PORT}`;
	for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await sleep(250); }
	await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });
	return { B, api, messages, stop: () => api.kill() };
}

async function openCard(page, B) {
	await page.goto(B, { waitUntil: "domcontentloaded" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in/i }).click();
	await page.getByRole("button", { name: "Settings" }).click();
	await page.getByRole("button", { name: "Open all sections" }).click();
	await page.getByText("GodlyPanel version", { exact: true }).waitFor({ timeout: 30_000 });
	await page.getByRole("button", { name: "Check now" }).click();
}

const browser = await chromium.launch({ executablePath: EXE });
try {
	// ---- the installed app, which can update itself
	{
		const panel = await boot({ ipc: true, selfUpdate: true });
		const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
		const errors = [];
		page.on("pageerror", (e) => errors.push(e.message));
		await openCard(page, panel.B);
		await page.getByText(`${NEW} available`).waitFor({ timeout: 20_000 });
		const button = page.getByRole("button", { name: /^Update now/ });
		await button.waitFor({ timeout: 10_000 });
		const label = await button.textContent();
		check("a new version offers Update now, with the size of the small download", /Update now \(\d+(\.\d+)? (KB|MB)\)/.test(label ?? ""), label);
		await shot(page, "update-1-card");

		await button.click();
		const dialog = page.getByRole("dialog");
		await dialog.getByText(`Update GodlyPanel to ${NEW}?`).waitFor({ timeout: 10_000 });
		check("the confirmation says only what changed is downloaded", await dialog.getByText(/Only what changed is downloaded/).isVisible());
		check("and that game servers keep running and nothing of yours is touched", (await dialog.getByText("Your game servers keep running").isVisible()) && (await dialog.getByText(/settings, accounts and backups are not touched/).isVisible()));
		check("and that the old version comes back if the new one doesn't start", await dialog.getByText(/the old one is put back automatically/).isVisible());
		await sleep(600);
		await shot(page, "update-2-confirm");
		await dialog.getByRole("button", { name: "Cancel" }).click();
		await dialog.waitFor({ state: "hidden" });
		check("cancelling hands nothing to the app", panel.messages.filter((m) => m.type === "apply-update").length === 0);

		await button.click();
		await page.getByRole("dialog").getByRole("button", { name: "Yes, update now" }).click();
		await page.getByText("Updating GodlyPanel", { exact: true }).waitFor({ timeout: 30_000 });
		check("pressing it shows the updating screen once the app has the files", true);
		const handed = panel.messages.find((m) => m.type === "apply-update");
		check("the app was handed a checked, unpacked update", Boolean(handed) && handed.mode === "app" && handed.version === NEW && fs.existsSync(path.join(handed.stageDir, "resources", "app.asar")));
		check("and the screen says game servers keep running", await page.getByText(/Your game servers keep running/).first().isVisible());
		await shot(page, "update-3-updating");

		// The app says no: the screen goes and the reason is shown.
		panel.api.send({ type: "update-refused", reason: "Something is still running." });
		await page.getByText("Updating GodlyPanel", { exact: true }).waitFor({ state: "hidden", timeout: 20_000 });
		check("if the app refuses, the updating screen goes away", true);
		await page.getByTestId("update-failed").waitFor({ timeout: 10_000 });
		check("and says why, and that nothing was changed", /Something is still running\./.test(await page.getByTestId("update-failed").textContent()) && /Nothing was changed/.test(await page.getByTestId("update-failed").textContent()));
		check("the button is there to try again", await page.getByRole("button", { name: /^Update now/ }).isEnabled());
		await shot(page, "update-4-refused");
		check("no script errors", errors.length === 0, errors.join(" | "));
		panel.stop();
	}

	// ---- how an update went, on the dashboard, the first thing seen after the page reloads
	for (const [name, result, pattern, severity] of [
		["worked", { ok: true, version: NEW, from: OLD, message: `Updated from ${OLD} to ${NEW}.`, rolledBack: false }, new RegExp(`Updated from ${OLD} to ${NEW}`), "success"],
		["was undone", { ok: false, version: NEW, from: OLD, message: `Version ${NEW} didn't start properly (it closed again straight after starting), so ${OLD} was put back.`, rolledBack: true }, /didn't work and was undone: Version .* was put back/, "error"],
	]) {
		const panel = await boot({ ipc: false, selfUpdate: false, result });
		const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
		await page.goto(panel.B, { waitUntil: "domcontentloaded" });
		await page.getByLabel(/username/i).fill("admin");
		await page.getByLabel(/password/i).fill("TestAdmin!2345");
		await page.getByRole("button", { name: /sign in/i }).click();
		const banner = page.getByTestId("update-result-banner");
		await banner.waitFor({ timeout: 30_000 });
		check(`an update that ${name} is the first thing the dashboard says`, pattern.test(await banner.textContent()), (await banner.textContent()).slice(0, 120));
		check(`and is shown as ${severity === "success" ? "good news" : "a problem"}`, (await banner.getAttribute("class")).includes(severity === "success" ? "MuiAlert-colorSuccess" : "MuiAlert-colorError") || (await banner.getAttribute("class")).includes(severity === "success" ? "MuiAlert-standardSuccess" : "MuiAlert-standardError"));
		await shot(page, `update-6-banner-${name.replace(" ", "-")}`);
		await banner.getByRole("button", { name: "Close" }).click();
		await banner.waitFor({ state: "hidden", timeout: 10_000 });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);
		check("dismissing it keeps it dismissed", (await page.getByTestId("update-result-banner").count()) === 0);
		panel.stop();
	}

	// ---- a copy that can't update itself
	{
		const panel = await boot({ ipc: false, selfUpdate: false });
		const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
		await openCard(page, panel.B);
		await page.getByText(`${NEW} available`).waitFor({ timeout: 20_000 });
		check("a copy running from source says it can't update itself, and why", await page.getByText(/running from source/).first().isVisible());
		check("and offers no Update now, but the download", (await page.getByRole("button", { name: /^Update now/ }).count()) === 0 && (await page.getByRole("button", { name: /^Download/ }).count()) === 1);
		await shot(page, "update-5-cannot");
		panel.stop();
	}
} catch (e) {
	check("the run completed", false, String(e.stack || e).split("\n").slice(0, 3).join(" | "));
} finally {
	await browser.close();
	gh.close();
	await sleep(800);
	try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
