// Changing passwords through the real interface, in a real browser, against a throwaway data folder:
// your own (with the current one asked for), and an administrator setting someone else's. Not part of
// `npm test` (it needs a Chromium); run with `node tests/ui/passwords.mjs`. Set GP_CHROME to a chrome.exe.
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
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-pw-"));
const PORT = await freePort();
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }

const ADMIN = { username: "admin", password: "First-Admin-Pass-1" };
const call = async (method, url, body, cookie) => {
	const r = await fetch(B + url, { method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
	return { status: r.status, json: await r.json().catch(() => null), cookie: r.headers.get("set-cookie")?.split(";")[0] };
};
await call("POST", "/api/setup/admin", ADMIN);
const adminSession = (await call("POST", "/api/auth/login", ADMIN)).cookie;
await call("POST", "/api/users", { username: "friend-one", password: "Friend-Start-Pass-1", role: "guest" }, adminSession);
const canSignIn = async (username, password) => (await call("POST", "/api/auth/login", { username, password })).status === 200;

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	const settle = () => page.waitForTimeout(500);
	const signIn = async (username, password) => {
		await page.getByLabel(/username/i).fill(username);
		await page.getByLabel(/password/i).fill(password);
		await page.getByRole("button", { name: /sign in/i }).click();
		await page.waitForLoadState("networkidle");
	};

	await page.goto(B, { waitUntil: "networkidle" });
	await signIn(ADMIN.username, ADMIN.password);
	await page.getByRole("button", { name: "Expand All" }).waitFor();

	// ---- your own password -----------------------------------------------------------------
	await page.getByRole("button", { name: "Password", exact: true }).click();
	const dialog = page.getByRole("dialog");
	check("a Password button opens the change-password dialog", await dialog.getByText("Change your password").isVisible());
	const submit = dialog.getByRole("button", { name: "Change password" });
	check("it can't be sent empty", await submit.isDisabled());

	await dialog.getByLabel("Current password").fill(ADMIN.password);
	await dialog.getByLabel("New password", { exact: true }).fill("Second-Admin-Pass-2");
	await dialog.getByLabel("New password again").fill("Something-different-3");
	check("two passwords that don't match are called out and can't be sent", (await dialog.getByText("These two don't match.").isVisible()) && (await submit.isDisabled()));

	await dialog.getByLabel("New password again").fill("Second-Admin-Pass-2");
	await dialog.getByLabel("Current password").fill("not-my-password");
	await submit.click();
	check("a wrong current password is refused, in words", await dialog.getByText("Your current password is incorrect.").waitFor({ timeout: 8000 }).then(() => true, () => false));
	check("and nothing changed", await canSignIn(ADMIN.username, ADMIN.password));

	await dialog.getByLabel("New password", { exact: true }).fill("password123");
	await dialog.getByLabel("New password again").fill("password123");
	await dialog.getByLabel("Current password").fill(ADMIN.password);
	await submit.click();
	check("a very common password is refused, with advice", await dialog.getByText(/most common/i).waitFor({ timeout: 8000 }).then(() => true, () => false));

	await dialog.getByLabel("New password", { exact: true }).fill("Second-Admin-Pass-2");
	await dialog.getByLabel("New password again").fill("Second-Admin-Pass-2");
	await submit.click();
	check("the right current password and a good new one succeeds", await dialog.getByText("Your password is changed").waitFor({ timeout: 8000 }).then(() => true, () => false));
	await dialog.getByRole("button", { name: "Done" }).click();
	await settle();
	check("this browser stays signed in", await page.getByRole("button", { name: "Expand All" }).isVisible());
	check("the old password no longer works, the new one does", !(await canSignIn(ADMIN.username, ADMIN.password)) && (await canSignIn(ADMIN.username, "Second-Admin-Pass-2")));

	// ---- an administrator sets someone else's -------------------------------------------------
	await page.getByRole("button", { name: "People" }).click();
	await settle();
	// The edit button of the one account that isn't your own (yours is disabled).
	await page.locator('[aria-label="Change access"] button').last().click();
	const edit = page.getByRole("dialog");
	check("an administrator's edit dialog for that person offers a new password", (await edit.getByText("friend-one: access and password").isVisible()) && (await edit.getByLabel("Set a new password (optional)").isVisible()));
	await edit.getByLabel("Set a new password (optional)").fill("short");
	check("a short one is flagged and can't be saved", (await edit.getByText("At least 8 characters.").first().isVisible()) && (await edit.getByRole("button", { name: "Save" }).isDisabled()));
	await edit.getByLabel("Set a new password (optional)").fill("Friend-New-Pass-2");
	await edit.getByRole("button", { name: "Save" }).click();
	await settle();
	check("their old password stops working and the new one works", !(await canSignIn("friend-one", "Friend-Start-Pass-1")) && (await canSignIn("friend-one", "Friend-New-Pass-2")));

	check("no script errors during any of it", errors.length === 0, errors.join(" | "));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
