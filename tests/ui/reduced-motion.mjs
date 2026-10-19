// For someone whose system asks for less motion (Windows: "Show animations in Windows" off), the page must not run its endless
// animations at the fastest speed (the online dot and the spinners once flickered like that in a browser; the desktop app does not
// apply the setting, so it looked fine there). Not part of `npm test` (it needs a Chromium); run it with `node tests/ui/reduced-motion.mjs`.
// Set GP_CHROME to a chrome.exe.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
import { EXE } from "./_chrome.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-motion-"));
const PORT = 8792;
fs.writeFileSync(path.join(root, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [] }));
fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ http: { port: PORT, bindAll: false }, polling: { serversMs: 3000, enableServerStats: false } }));
const api = spawn(process.execPath, [path.join(repo, "src/server/index.js")], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: root, GHP_PORT: String(PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") }, stdio: "ignore" });
const B = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/api/setup/status")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 250)); }
await fetch(B + "/api/setup/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "TestAdmin!2345" }) });

let ok = 0, bad = 0;
const check = (name, cond, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const browser = await chromium.launch({ executablePath: EXE });
try {
	const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
	await page.goto(B, { waitUntil: "networkidle" });
	await page.getByLabel(/username/i).fill("admin");
	await page.getByLabel(/password/i).fill("TestAdmin!2345");
	await page.getByRole("button", { name: /sign in|log in/i }).click();
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(1200);

	// Two stand-ins that run the page's own pulse animation endlessly: one outside a progress indicator, one inside.
	await page.evaluate(() => {
		document.body.insertAdjacentHTML("beforeend", '<div id="plain" style="animation: gp-pulse 2s infinite; width:10px; height:10px"></div><div class="MuiCircularProgress-root"><i id="spin" style="display:block; animation: gp-pulse 1.4s infinite; width:10px; height:10px"></i></div>');
	});
	const read = (id) => page.evaluate((i) => { const s = getComputedStyle(document.getElementById(i)); return { duration: s.animationDuration, count: s.animationIterationCount }; }, id);

	await page.emulateMedia({ reducedMotion: "no-preference" });
	let plain = await read("plain");
	check("with no preference, an endless animation keeps its own speed", plain.count === "infinite" && plain.duration === "2s", JSON.stringify(plain));

	await page.emulateMedia({ reducedMotion: "reduce" });
	plain = await read("plain");
	check("asking for less motion stops an endless animation from looping", plain.count === "1", JSON.stringify(plain));
	check("and makes it instant rather than fast", plain.duration === "0.00001s" || plain.duration === "1e-05s", JSON.stringify(plain));
	const spin = await read("spin");
	check("but a spinner keeps moving at its own speed", spin.count === "infinite" && spin.duration === "1.4s", JSON.stringify(spin));
} finally {
	await browser.close();
	api.kill();
	await new Promise((r) => setTimeout(r, 1000));
	try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
