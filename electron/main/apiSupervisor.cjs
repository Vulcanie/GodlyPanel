const { fork, execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASHES_IN_WINDOW = 5;
const STABLE_UPTIME_MS = 60_000;
const FATAL_EXIT_CODE = 17;
const LOG_TAIL_LINES = 200;

/**
 * Owns the lifecycle of the API child process — the job PM2 used to do.
 *
 * The API is a forked child rather than running in this process because its
 * uncaughtException handler deliberately exits so a supervisor can restart it
 * clean; that behaviour is right for the server but fatal in Electron's main
 * process, which would take the whole window down with it.
 */
class ApiSupervisor extends EventEmitter {
	constructor({ serverEntry, dataDir, resourceRoot, port, env = {} }) {
		super();
		this.serverEntry = serverEntry;
		this.dataDir = dataDir;
		this.resourceRoot = resourceRoot;
		this.port = port;
		this.extraEnv = env;

		this.child = null;
		this.state = "stopped";
		this.crashTimes = [];
		this.backoffIndex = 0;
		this.startedAt = 0;
		this.stopping = false;
		this.restartTimer = null;
		this.logTail = [];

		this.logPath = path.join(dataDir, "logs", "api.log");
		fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
		this.logStream = fs.createWriteStream(this.logPath, { flags: "a" });
	}

	getState() {
		return this.state;
	}

	getLogTail() {
		return this.logTail.join("");
	}

	#setState(next, detail) {
		this.state = next;
		this.emit("state", next, detail);
	}

	#log(chunk) {
		const text = chunk.toString();
		this.logStream.write(text);
		this.logTail.push(text);
		if (this.logTail.length > LOG_TAIL_LINES) {
			this.logTail.splice(0, this.logTail.length - LOG_TAIL_LINES);
		}
	}

	start() {
		if (this.child) return;
		this.stopping = false;
		this.#setState("starting");

		this.child = fork(this.serverEntry, [], {
			// ELECTRON_RUN_AS_NODE makes the Electron binary behave as plain
			// Node, so the packaged app needs no separate Node install. asar
			// reads still work in this mode.
			execPath: process.execPath,
			env: {
				...process.env,
				...this.extraEnv,
				ELECTRON_RUN_AS_NODE: "1",
				GHP_DATA_DIR: this.dataDir,
				GHP_RESOURCE_ROOT: this.resourceRoot,
				GHP_PORT: String(this.port),
			},
			stdio: ["ignore", "pipe", "pipe", "ipc"],
		});

		this.startedAt = Date.now();
		this.child.stdout?.on("data", (d) => this.#log(d));
		this.child.stderr?.on("data", (d) => this.#log(d));

		this.child.on("message", (msg) => {
			if (msg?.type === "ready") {
				this.backoffIndex = 0;
				this.#setState("ready", msg);
			}
			if (msg?.type === "bind-error") this.emit("bind-error", msg);
			if (msg?.type === "active-jobs") this.emit("active-jobs", msg.jobs);
			if (msg?.type === "first-run-credentials") this.emit("first-run-credentials", msg);
		});

		this.child.on("exit", (code, signal) => {
			const child = this.child;
			this.child = null;
			if (this.stopping) {
				this.#setState("stopped");
				return;
			}
			this.#log(`\n[supervisor] API exited (code=${code} signal=${signal})\n`);
			this.#handleUnexpectedExit(code);
			void child;
		});
	}

	#handleUnexpectedExit(code) {
		// A long stable run means whatever just happened is a fresh problem,
		// not a restart loop — reset the backoff so we recover promptly.
		if (Date.now() - this.startedAt > STABLE_UPTIME_MS) {
			this.crashTimes = [];
			this.backoffIndex = 0;
		}

		const now = Date.now();
		this.crashTimes = this.crashTimes.filter((t) => now - t < CRASH_WINDOW_MS);
		this.crashTimes.push(now);

		if (this.crashTimes.length >= MAX_CRASHES_IN_WINDOW) {
			this.#setState("crashed", {
				reason: `API crashed ${this.crashTimes.length} times in under a minute.`,
				code,
				logTail: this.getLogTail(),
			});
			return;
		}

		const delay = BACKOFF_MS[Math.min(this.backoffIndex, BACKOFF_MS.length - 1)];
		this.backoffIndex += 1;
		this.#setState("restarting", { delay, code });
		this.restartTimer = setTimeout(() => this.start(), delay);
	}

	/** Ask the API to shut down cleanly, escalating if it doesn't. */
	async stop({ timeoutMs = 8000 } = {}) {
		if (this.restartTimer) clearTimeout(this.restartTimer);
		this.restartTimer = null;
		if (!this.child) {
			this.#setState("stopped");
			return;
		}

		this.stopping = true;
		const child = this.child;
		const pid = child.pid;

		// Windows has no meaningful SIGTERM for a forked child, so ask over IPC.
		try {
			child.send({ type: "shutdown" });
		} catch {
			// Channel already gone; fall through to the kill path.
		}

		const exited = await new Promise((resolve) => {
			const timer = setTimeout(() => resolve(false), timeoutMs);
			child.once("exit", () => {
				clearTimeout(timer);
				resolve(true);
			});
		});

		if (!exited) {
			try {
				child.kill();
			} catch {}
			// Last resort: the tree, since child.kill() doesn't reach grandchildren.
			if (pid) {
				execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => {});
			}
		}

		this.child = null;
		this.#setState("stopped");
	}

	async restart() {
		await this.stop();
		this.crashTimes = [];
		this.backoffIndex = 0;
		this.start();
	}

	/** Resolves with the API's in-flight jobs, or [] if it can't answer. */
	requestActiveJobs({ timeoutMs = 1500 } = {}) {
		if (!this.child || this.state !== "ready") return Promise.resolve([]);
		return new Promise((resolve) => {
			const timer = setTimeout(() => resolve([]), timeoutMs);
			this.once("active-jobs", (jobs) => {
				clearTimeout(timer);
				resolve(Array.isArray(jobs) ? jobs : []);
			});
			try {
				this.child.send({ type: "query-active-jobs" });
			} catch {
				clearTimeout(timer);
				resolve([]);
			}
		});
	}
}

module.exports = { ApiSupervisor };
