import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

// The desktop app's supervisor of the panel's process: asking it what is still running must not leave a listener behind when it
// doesn't answer in time, or the answer to the next question would go to the one nobody waited for.

const require = createRequire(import.meta.url);
const { ApiSupervisor } = require("../../electron/main/apiSupervisor.cjs");

describe("asking the panel what is still running", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-supervisor-"));
	const supervisor = new ApiSupervisor({ serverEntry: "unused", dataDir: dir, resourceRoot: dir, getPort: () => 8765 });
	supervisor.state = "ready";
	const asked = [];
	supervisor.child = { send: (message) => asked.push(message) };

	after(() => {
		supervisor.logStream.end();
		fs.rmSync(dir, { recursive: true, force: true });
	});

	it("gives up quietly when there is no answer, leaving nothing listening", async () => {
		assert.deepEqual(await supervisor.requestActiveJobs({ timeoutMs: 20 }), []);
		assert.equal(supervisor.listenerCount("active-jobs"), 0);
		assert.equal(asked.length, 1);
	});

	it("gives the next question its own answer", async () => {
		const answer = supervisor.requestActiveJobs({ timeoutMs: 1000 });
		supervisor.emit("active-jobs", [{ id: "create", label: "Creating Valheim" }]);
		assert.deepEqual(await answer, [{ id: "create", label: "Creating Valheim" }]);
		assert.equal(supervisor.listenerCount("active-jobs"), 0);
	});
});
