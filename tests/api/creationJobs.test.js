import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN, sleep } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// A creation job says which job it is, is only found by an id the panel made, and a server can't be created on a port that
// isn't one (or that is the panel's own, or reserved in Settings). SteamCMD is replaced by the node program itself, which
// refuses the install at once, so the job ends quickly without touching the network.

describe("creation jobs", () => {
	let panel;
	let api;
	let root;

	const create = (body) => api.post("/api/servers", { templateId: "valheim", sessionName: "Test", serverPassword: "abcdef", ...body });

	before(async () => {
		panel = await startInProcess({
			prepare: (dir) => {
				root = path.join(dir, "servers");
				fs.mkdirSync(root, { recursive: true });
			},
			config: { portAllocation: { reservedPorts: [9999] } },
			env: {},
		});
		api = panel.api;
		await api.put("/api/settings", { paths: { steamCmdPath: process.execPath, serversRoot: root } });
	});
	after(() => panel.stop());

	it("refuses ports that aren't ports, the panel's own, and reserved ones", async () => {
		for (const [port, pattern] of [
			[70000, /whole number from 1024 to 65535/],
			[80, /whole number from 1024 to 65535/],
			[1234.5, /whole number from 1024 to 65535/],
			[65535, /also needs port 65536/],
			[9999, /reserved list/],
			[(await api.get("/api/settings/access")).json.port, /port GodlyPanel itself uses/],
		]) {
			const r = await create({ name: `Bad ${port}`, port });
			assert.equal(r.status, 400, `${port}: ${JSON.stringify(r.json)}`);
			assert.match(r.json.error, pattern, String(port));
		}
	});

	it("refuses a server name that is already on every object", async () => {
		for (const name of ["__proto__", "constructor", "toString"]) {
			const r = await create({ name, port: 9701 });
			assert.equal(r.status, 400, name);
			assert.match(r.json.error, /can't be used as a server name/);
		}
	});

	it("refuses a value with a line break in it", async () => {
		const r = await create({ name: "Broken", sessionName: "One\r\necho hacked" });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /sessionName.*line break/);
	});

	it("refuses a value that isn't text or a number (it would be written into the script as [object Object])", async () => {
		const r = await create({ name: "Objecty", sessionName: { a: 1 } });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /sessionName.*text or a number/);
	});

	it("carries its own id, and is found only by an id the panel made", async () => {
		const made = await create({ name: "Job Test", port: 9700 });
		assert.equal(made.status, 200, JSON.stringify(made.json));
		const { jobId } = made.json;
		assert.match(jobId, /^job-test-\d+$/);

		let job;
		for (let i = 0; i < 100; i += 1) {
			job = (await api.get(`/api/servers/create/${jobId}`)).json;
			if (["error", "done"].includes(job.status)) break;
			await sleep(100);
		}
		assert.equal(job.jobId, jobId, "the job says which job it is");
		assert.equal(job.status, "error", "the stand-in SteamCMD installed nothing");

		// The copy kept for after a restart carries it too.
		const kept = JSON.parse(fs.readFileSync(path.join(panel.dir, "jobs", "creation", `${jobId}.json`), "utf8"));
		assert.equal(kept.jobId, jobId);

		// A path is not a job id: this used to read any .json file the panel could reach.
		const sneaky = await api.get(`/api/servers/create/${encodeURIComponent("../../state/server-options")}`);
		assert.equal(sneaky.status, 404);
		assert.equal((await api.get("/api/servers/create/nope")).status, 404);
	});
});
