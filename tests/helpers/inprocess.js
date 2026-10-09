import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { Api, ADMIN, GUEST, ROOT, tempDir, removeDir, freePort, sleep } from "./instance.js";
import { sweepProcessesUnder } from "./fakeGame.js";

// The panel's real routes, in the test's own process: the Express app from src/server/app.js, driven with supertest. No
// child process, no port of ours to pick, no waiting for a server to boot (supertest listens on a throw-away loopback
// port for each request, which is why this isn't quite "no socket", just nothing to manage).
//
// It is the Spring MockMvc idea: the whole stack above the network (middleware, auth, routes, services, the stores on disk)
// runs for real, and a failure is an ordinary stack trace in the test. What it can't be is a stand-in for tests that need
// the panel as a separate Windows process (starting and killing games, the desktop shell, a crash): those stay on
// startInstance(), which really spawns it.
//
// `startInProcess()` has the same shape as `startInstance()` (panel.api, panel.dir, panel.stop(); the same options), so a test
// moves over by changing the import and the call. Two differences:
//   - one panel per test file. The data folder is read from the environment when the server's modules load, and node's test
//     runner gives every file its own process, so a file gets exactly one;
//   - environment is set in this process (the `env` option), so it applies for the rest of the file.

let started = false;

/** The same cookie-keeping client as Api, but each request goes straight to the app. */
export class InProcessApi extends Api {
	constructor(app) {
		super("http://in-process");
		this.app = app;
	}

	/**
	 * @param {string} method
	 * @param {string} url
	 * @param {unknown} [body]  an object is sent as JSON; a string is sent exactly as given (to send broken JSON)
	 * @param {{ cookie?: string, headers?: Record<string, string> }} [options]  `cookie: ""` sends none and keeps this client's session
	 */
	async call(method, url, body, { cookie, headers } = {}) {
		const useCookie = cookie ?? this.cookie;
		let req = request(this.app)[method.toLowerCase()](url);
		if (useCookie) req = req.set("Cookie", useCookie);
		for (const [name, value] of Object.entries(headers ?? {})) req = req.set(name, value);
		if (typeof body === "string") req = req.set("Content-Type", "application/json").send(body);
		else if (body !== undefined) req = req.send(body);
		const res = await req;
		const set = res.headers["set-cookie"]?.[0];
		if (set && cookie === undefined) this.cookie = set.split(";")[0];
		const out = new Headers();
		for (const [name, value] of Object.entries(res.headers)) for (const v of [].concat(value)) out.append(name, v);
		const isJson = /(^|[/+])json$/.test(res.type ?? "");
		return { status: res.status, json: isJson ? res.body : res.text, headers: out };
	}

	/**
	 * Like the global fetch(), against the app: a path instead of a URL, nothing added to the request (no cookie unless the
	 * headers carry one), and a real Response back, so a test can read headers and raw bytes (an image, say).
	 */
	async fetch(url, { method = "GET", headers = {}, body } = {}) {
		let req = request(this.app)[method.toLowerCase()](url);
		for (const [name, value] of Object.entries(headers)) req = req.set(name, value);
		if (body !== undefined) req = req.send(body);
		const res = await req.buffer(true).parse((stream, done) => {
			const chunks = [];
			stream.on("data", (chunk) => chunks.push(chunk));
			stream.on("end", () => done(null, Buffer.concat(chunks)));
		});
		const out = new Headers();
		for (const [name, value] of Object.entries(res.headers)) for (const v of [].concat(value)) out.append(name, v);
		return new Response([204, 205, 304].includes(res.status) ? null : res.body, { status: res.status, headers: out });
	}

	async upload(url, field, filename, bytes) {
		let req = request(this.app).post(url).attach(field, Buffer.from(bytes), filename);
		if (this.cookie) req = req.set("Cookie", this.cookie);
		const res = await req;
		return { status: res.status, json: /(^|[/+])json$/.test(res.type ?? "") ? res.body : res.text };
	}

	async cookieFor({ username, password }) {
		const res = await request(this.app).post("/api/auth/login").send({ username, password });
		return res.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
	}
}

/**
 * @param {object} [options]  as for startInstance(): `servers`, `config`, `admin`, `prepare`, `env`
 */
export async function startInProcess({ servers = [], config = {}, admin = true, prepare, env = {} } = {}) {
	if (started) throw new Error("One in-process panel per test file: its data folder is fixed when the server's modules are loaded.");
	started = true;

	const dir = tempDir("inproc");
	prepare?.(dir);
	const list = typeof servers === "function" ? servers(dir) : servers;
	fs.writeFileSync(path.join(dir, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: list }));
	const port = await freePort();
	fs.writeFileSync(
		path.join(dir, "config.json"),
		JSON.stringify({ http: { port, bindAll: false }, polling: { serversMs: 3000, enableBuildCheck: false, enableServerStats: false }, ...config }),
	);

	// Before the server's modules load: they read these once.
	process.env.GHP_DATA_DIR = dir;
	process.env.GHP_RESOURCE_ROOT = path.join(ROOT, "resources");
	Object.assign(process.env, env);

	// The data folder is fixed the first time paths.js loads. If a test file imported any server module before this ran, it
	// loaded with the wrong folder and the app would be reading and writing somewhere real. Refuse rather than carry on.
	const { paths } = await import("../../src/server/paths.js");
	if (path.resolve(paths.dataDir) !== path.resolve(dir)) {
		throw new Error(
			`The server modules were loaded before startInProcess() ran, with the data folder ${paths.dataDir} instead of ${dir}. ` +
				"Don't import anything from src/server at the top of a test file that uses startInProcess(); import it inside the test, or from a module with no side effects (like src/server/util).",
		);
	}

	const { createApp } = await import("../../src/server/app.js");
	const app = await createApp({ quiet: true, serveUi: false });
	const api = new InProcessApi(app);

	if (admin) {
		const made = await api.post("/api/setup/admin", ADMIN);
		if (made.status !== 200) throw new Error(`Couldn't create the admin: ${JSON.stringify(made.json)}`);
		await api.post("/api/users", { ...GUEST, role: "guest" });
	}

	return {
		dir,
		port,
		app,
		api,
		messages: [],
		async stop() {
			// A test that started a game through the app leaves it running; it lives in this folder, so end it with the folder.
			if (sweepProcessesUnder(dir) > 0) {
				await sleep(700);
				sweepProcessesUnder(dir);
			}
			removeDir(dir);
		},
	};
}
