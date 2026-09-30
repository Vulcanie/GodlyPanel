import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry } from "../helpers/instance.js";

// Creating a server: port validation happens before anything is downloaded, and
// SteamCMD is never fetched without asking. These all stop short of installing
// anything: a request that passes validation is met with the "download SteamCMD?"
// prompt (a 409), which is also the proof that nothing was fetched.

describe("creating a server", () => {
	let panel;
	let api;

	const create = (templateId, body) => api.post("/api/servers", { templateId, sessionName: "Test", serverPassword: "abcdef", ...body });

	before(async () => {
		panel = await startInstance({
			servers: (dir) => {
				const arkScript = path.join(dir, "Start_ASE.bat");
				fs.writeFileSync(arkScript, '@echo off\r\nstart /MIN "T" ShooterGameServer.exe TheIsland?listen -RCONPort=9503 -Port=9500 -QueryPort=9502 -server -log\r\n');
				return [
				serverEntry(dir, { name: "Existing ARK", type: "ark", updateAppId: "376030", startScriptPath: arkScript, rconPort: 9503, processName: "nope3.exe" }),
				serverEntry(dir, { name: "Existing 7 Days", type: "7days", port: 9400, processName: "nope4.exe" }),
				// An existing Conan server: it owns 9000, 9002, 9003, and 9001 (its raw socket).
				serverEntry(dir, { name: "Existing Conan", type: "conan", port: 9000, queryPort: 9002, rconPort: 9003, processName: "nope.exe" }),
				serverEntry(dir, { name: "Existing Valheim", type: "valheim", port: 9200, processName: "nope2.exe" }),
				];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("tells the interface which ports a game takes for itself", async () => {
		const templates = (await api.get("/api/templates")).json;
		assert.deepEqual(templates.find((t) => t.id === "conan").implicitPorts, [{ offset: 1, label: "its raw UDP socket" }]);
		assert.equal(templates.find((t) => t.id === "valheim").implicitPorts.length, 2);
		assert.deepEqual(templates.find((t) => t.id === "palworld").implicitPorts, []);
		assert.deepEqual(templates.find((t) => t.id === "ark-ase").implicitPorts, [{ offset: 1, label: "its raw UDP socket" }]);
		assert.deepEqual(templates.find((t) => t.id === "ark-asa").implicitPorts, [], "Ascended dropped the raw socket");
		assert.deepEqual(templates.find((t) => t.id === "7days").implicitPorts.map((i) => i.offset), [1, 2, 3]);
	});

	describe("Conan Exiles ports", () => {
		it("refuses a query port one above the game port: the exact mistake that left a server unreachable", async () => {
			// -Port=8892 -QueryPort=8893 is what a tester's start script ended up with.
			const r = await create("conan", { name: "T1", port: 8892, queryPort: 8893, rconPort: 8895 });
			assert.equal(r.status, 400);
			assert.match(r.json.error, /Query Port 8893 is the game port \+ 1/);
			assert.match(r.json.error, /raw UDP socket/);
		});

		it("refuses the same for the RCON port", async () => {
			const r = await create("conan", { name: "T2", port: 8892, queryPort: 8894, rconPort: 8893 });
			assert.equal(r.status, 400);
			assert.match(r.json.error, /RCON Port 8893 is the game port \+ 1/);
		});

		it("refuses two ports the same", async () => {
			const r = await create("conan", { name: "T3", port: 8892, queryPort: 8894, rconPort: 8894 });
			assert.equal(r.status, 400);
			assert.match(r.json.error, /both 8894/);
		});

		it("counts an existing server's raw port as taken", async () => {
			// Existing Conan is on 9000, so 9001 is spoken for.
			const asQuery = await create("conan", { name: "T4", port: 8892, queryPort: 9001, rconPort: 8895 });
			assert.equal(asQuery.status, 400);
			assert.match(asQuery.json.error, /already used by another server/);
			// And a new game port right below it would put the new raw port on 9000.
			const rawOnGame = await create("conan", { name: "T5", port: 8999, queryPort: 8994, rconPort: 8995 });
			assert.equal(rawOnGame.status, 400);
			assert.match(rawOnGame.json.error, /also needs port 9000/);
		});

		it("accepts the panel's own defaults, and gets as far as asking to download SteamCMD", async () => {
			const r = await create("conan", { name: "Fine", port: 8892, queryPort: 8894, rconPort: 8895 });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "steamcmd-not-installed");
			const registered = JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.map((s) => s.name);
			assert.equal(registered.includes("Fine"), false, "nothing was created");
			assert.equal(fs.existsSync(path.join(panel.dir, "tools", "steamcmd")), false, "and nothing was downloaded");
		});
	});

	describe("7 Days to Die's ports after the server port", () => {
		it("counts the three above an existing server as taken, and the three below as running into it", async () => {
			for (const port of [9401, 9402, 9403, 9399, 9398, 9397]) {
				const r = await create("7days", { name: `D${port}`, port });
				assert.equal(r.status, 400, String(port));
			}
		});

		it("accepts a clear spot", async () => {
			const r = await create("7days", { name: "D-ok", port: 9410 });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "steamcmd-not-installed");
		});
	});

	describe("ARK: Survival Evolved's raw socket", () => {
		const ark = (port, extra = {}) => create("ark-ase", { name: `A${port}`, port, queryPort: 9610, rconPort: 9611, rconPassword: "abcdef", mapCode: "TheIsland", ...extra });

		it("refuses a query or RCON port one above the game port", async () => {
			const asQuery = await ark(9600, { queryPort: 9601 });
			assert.equal(asQuery.status, 400);
			assert.match(asQuery.json.error, /Query Port 9601 is the game port \+ 1/);
			const asRcon = await ark(9600, { rconPort: 9601 });
			assert.equal(asRcon.status, 400);
			assert.match(asRcon.json.error, /RCON Port 9601 is the game port \+ 1/);
		});

		it("reads an existing server's start script, so its raw socket is counted too", async () => {
			// Existing ARK runs -Port=9500, so 9501 is its raw socket.
			assert.equal((await ark(9501)).status, 400);
			// And 9499 would put a new raw socket on 9500.
			const r = await ark(9499);
			assert.equal(r.status, 400);
			assert.match(r.json.error, /also needs port 9500/);
		});

		it("is what the ports editor reports too, not Ascended's (they share a type)", async () => {
			const info = (await api.get("/api/server/Existing%20ARK/ports")).json;
			assert.equal(info.gameName, "ARK: Survival Evolved");
			assert.deepEqual(info.implicit, [{ offset: 1, label: "its raw UDP socket" }]);
			assert.equal(info.current.port, 9500);
		});

		it("accepts a clear spot", async () => {
			const r = await ark(9600);
			assert.equal(r.status, 409, JSON.stringify(r.json));
		});
	});

	describe("Valheim's three consecutive ports", () => {
		it("counts the two above the game port as taken", async () => {
			for (const port of [9201, 9202, 9199, 9198]) {
				const r = await create("valheim", { name: `V${port}`, port });
				// 9201 and 9202 are Existing Valheim's; 9199 and 9198 would run into 9200 when they take their own.
				assert.equal(r.status, 400, String(port));
			}
		});

		it("accepts a clear spot", async () => {
			const r = await create("valheim", { name: "V-ok", port: 9300 });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "steamcmd-not-installed");
		});
	});
});
