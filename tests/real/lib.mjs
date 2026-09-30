// Shared bits for the tests that run against a REAL game install. These are run by
// hand (they download about 10 GB and take a while), in a test area that is kept
// apart from everything else:
//
//   GP_TESTBED   where to work (default C:\gp-testbed); all panel data and every
//                server installed here stay inside it
//   GP_PANEL_PORT  the panel's own port (default 7100)
//
// Nothing here touches any other folder, and the real servers' own ports are
// whatever the test is told to use.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TESTBED = process.env.GP_TESTBED || "C:/gp-testbed";
export const PANEL_PORT = Number(process.env.GP_PANEL_PORT || 7100);
// A conformance run for one game gets a panel of its own (data-<game>, servers-<game>),
// so the ports it is given don't clash with servers registered in another run.
const gameArg = process.argv.includes("--game") ? process.argv[process.argv.indexOf("--game") + 1] : null;
export const DATA = path.join(TESTBED, gameArg ? `data-${gameArg}` : "data");
const SERVERS_DIR = gameArg ? `servers-${gameArg}` : "servers";
export const BASE = `http://127.0.0.1:${PANEL_PORT}`;
export const ADMIN = { username: "admin", password: "TestAdmin!2345" };

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let cookie = "";
export async function call(method, url, body) {
	const res = await fetch(BASE + url, {
		method,
		headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const set = res.headers.get("set-cookie");
	if (set) cookie = set.split(";")[0];
	const text = await res.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		json = text;
	}
	return { status: res.status, json };
}
/** A multipart upload as the signed-in admin. */
export async function upload(url, field, filename, bytes) {
	const form = new FormData();
	form.append(field, new Blob([bytes]), filename);
	const res = await fetch(BASE + url, { method: "POST", headers: cookie ? { Cookie: cookie } : {}, body: form });
	const text = await res.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		json = text;
	}
	return { status: res.status, json };
}
export const get = (u) => call("GET", u);
export const post = (u, b) => call("POST", u, b ?? {});
export const put = (u, b) => call("PUT", u, b);
export const del = (u, b) => call("DELETE", u, b);

export async function until(check, { timeoutMs = 120_000, everyMs = 2000, label = "" } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const v = await check();
		if (v) return v;
		await sleep(everyMs);
	}
	throw new Error(`Timed out waiting for ${label || "a condition"}`);
}

/** Start the panel (Node, not Electron) on the testbed's data folder, and sign in. */
export async function startPanel() {
	fs.mkdirSync(DATA, { recursive: true });
	const configFile = path.join(DATA, "config.json");
	if (!fs.existsSync(configFile)) {
		fs.writeFileSync(
			configFile,
			JSON.stringify({
				http: { port: PANEL_PORT, bindAll: false },
				paths: { serversRoot: path.join(TESTBED, SERVERS_DIR).replaceAll("/", "\\") },
				polling: { serversMs: 4000, enableServerStats: false },
				recovery: { graceSec: 20, startupGraceMin: 6, maxRestarts: 3, windowMin: 30 },
			}),
		);
	}
	const log = fs.openSync(path.join(TESTBED, "panel.log"), "a");
	const child = spawn(process.execPath, [path.join(repo, "src/server/index.js")], {
		env: { ...process.env, ELECTRON_RUN_AS_NODE: "", GHP_DATA_DIR: DATA, GHP_PORT: String(PANEL_PORT), GHP_RESOURCE_ROOT: path.join(repo, "resources") },
		stdio: ["ignore", log, log],
	});
	for (let i = 0; i < 80; i += 1) {
		try {
			if ((await fetch(`${BASE}/api/setup/status`)).ok) break;
		} catch {
			await sleep(250);
		}
	}
	const status = await (await fetch(`${BASE}/api/setup/status`)).json();
	if (status.setupRequired) await post("/api/setup/admin", ADMIN);
	const login = await post("/api/auth/login", ADMIN);
	if (login.status !== 200) throw new Error(`Couldn't sign in: ${JSON.stringify(login.json)}`);
	return {
		child,
		async stop() {
			child.kill();
			await new Promise((r) => (child.exitCode !== null ? r() : child.once("exit", r)));
		},
	};
}

let passed = 0;
let failed = 0;
export function check(name, cond, detail = "") {
	cond ? (passed += 1) : (failed += 1);
	console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
	return cond;
}
export function summary() {
	console.log(`\n${passed} passed, ${failed} failed`);
	return failed === 0;
}

/** Free space on the testbed's drive, in GB. */
export function freeGB() {
	const s = fs.statfsSync(TESTBED);
	return (Number(s.bavail) * Number(s.bsize)) / 1024 ** 3;
}

/** Size of a folder in GB (a rough walk; fine for a budget check). */
export function dirGB(dir) {
	let total = 0;
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.isFile()) total += fs.statSync(p).size;
		}
	};
	try {
		walk(dir);
	} catch {
		// Not there yet.
	}
	return total / 1024 ** 3;
}
