import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

// Boots the real API in a throwaway data folder, on a free port, and gives back
// a client for it. Every API test file starts its own, so they can't affect each
// other, your real GodlyPanel data, or your real game servers: the servers a
// test sees are only the ones it writes into that folder.

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const ADMIN = { username: "admin", password: "TestAdmin!2345" };
export const GUEST = { username: "viewer", password: "TestGuest!2345" };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function tempDir(label) {
	return fs.mkdtempSync(path.join(os.tmpdir(), `gp-test-${label}-`));
}

export function removeDir(dir) {
	// Windows can hold a just-closed log open for a moment.
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			fs.rmSync(dir, { recursive: true, force: true });
			return;
		} catch {
			Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
		}
	}
}

export function freePort() {
	return new Promise((resolve, reject) => {
		const probe = net.createServer();
		probe.once("error", reject);
		probe.listen(0, "127.0.0.1", () => {
			const { port } = probe.address();
			probe.close(() => resolve(port));
		});
	});
}

/** Cookie-keeping HTTP client for the panel's API. */
export class Api {
	constructor(base) {
		this.base = base;
		this.cookie = "";
	}

	async call(method, url, body, { cookie, headers } = {}) {
		const useCookie = cookie ?? this.cookie;
		const res = await fetch(this.base + url, {
			method,
			headers: {
				"Content-Type": "application/json",
				...(useCookie ? { Cookie: useCookie } : {}),
				...headers,
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const set = res.headers.get("set-cookie");
		if (set && cookie === undefined) this.cookie = set.split(";")[0];
		const text = await res.text();
		let json;
		try {
			json = JSON.parse(text);
		} catch {
			json = text;
		}
		return { status: res.status, json, headers: res.headers };
	}

	get = (url, opts) => this.call("GET", url, undefined, opts);
	post = (url, body, opts) => this.call("POST", url, body, opts);
	put = (url, body, opts) => this.call("PUT", url, body, opts);
	del = (url, opts) => this.call("DELETE", url, undefined, opts);

	/** A multipart upload; the cookie rides along like any other call. */
	async upload(url, field, filename, bytes) {
		const form = new FormData();
		form.append(field, new Blob([bytes]), filename);
		const res = await fetch(this.base + url, {
			method: "POST",
			headers: this.cookie ? { Cookie: this.cookie } : {},
			body: form,
		});
		const text = await res.text();
		let json;
		try {
			json = JSON.parse(text);
		} catch {
			json = text;
		}
		return { status: res.status, json };
	}

	/** A cookie for another account, without disturbing this client's own session. */
	async cookieFor({ username, password }) {
		const res = await fetch(this.base + "/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password }),
		});
		const set = res.headers.get("set-cookie");
		return set ? set.split(";")[0] : "";
	}
}

/**
 * @param {object} [options]
 * @param {object[]|((dir: string) => object[])} [options.servers]  entries written to
 *   servers.json; a function gets the instance's folder, for entries that point into it
 * @param {object}   [options.config]   merged over the minimal test config
 * @param {boolean}  [options.admin]    create the admin (and a guest) account
 * @param {(dir: string) => void} [options.prepare]  runs before boot, e.g. to make files
 */
export async function startInstance({ servers = [], config = {}, admin = true, prepare } = {}) {
	const dir = tempDir("api");
	const port = await freePort();
	prepare?.(dir);

	const list = typeof servers === "function" ? servers(dir) : servers;
	fs.writeFileSync(path.join(dir, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: list }));
	fs.writeFileSync(
		path.join(dir, "config.json"),
		JSON.stringify({
			http: { port, bindAll: false },
			polling: { serversMs: 3000, enableBuildCheck: false, enableServerStats: false },
			...config,
		}),
	);

	const logPath = path.join(dir, "api-test.log");
	const logFd = fs.openSync(logPath, "w");
	const child = spawn(process.execPath, [path.join(ROOT, "src", "server", "index.js")], {
		env: {
			...process.env,
			GHP_DATA_DIR: dir,
			GHP_PORT: String(port),
			GHP_RESOURCE_ROOT: path.join(ROOT, "resources"),
		},
		stdio: ["ignore", logFd, logFd],
	});

	const base = `http://127.0.0.1:${port}`;
	const api = new Api(base);

	let ready = false;
	for (let i = 0; i < 80 && !ready; i += 1) {
		try {
			ready = (await fetch(`${base}/api/setup/status`)).ok;
		} catch {
			await sleep(250);
		}
	}
	if (!ready) {
		child.kill();
		throw new Error(`The API didn't start.\n${fs.readFileSync(logPath, "utf8").slice(-1500)}`);
	}

	if (admin) {
		const made = await api.post("/api/setup/admin", ADMIN);
		if (made.status !== 200) throw new Error(`Couldn't create the admin: ${JSON.stringify(made.json)}`);
		await api.post("/api/users", { ...GUEST, role: "guest" });
	}

	return {
		dir,
		port,
		base,
		api,
		log: () => fs.readFileSync(logPath, "utf8"),
		async stop() {
			child.kill();
			await new Promise((resolve) => (child.exitCode !== null ? resolve() : child.once("exit", resolve)));
			fs.closeSync(logFd);
			removeDir(dir);
		},
	};
}

/** A server entry with sensible defaults, rooted in `dir` so file access is allowed. */
export function serverEntry(dir, overrides = {}) {
	return {
		host: "127.0.0.1",
		type: "custom",
		method: "process",
		installDir: dir,
		workingDir: dir,
		...overrides,
	};
}
