import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { runStandIn, stopStandIns, startInstance, serverEntry, freePort, GUEST, sleep } from "../helpers/instance.js";

// Changing a server's ports: checked against this server's own other ports, the
// ports the game takes for itself, every other server, the panel's own port and
// Settings' reserved list, and applied to the start script, the game's config
// and the panel's record together. Ports here are in a private range (9000s) so
// nothing real can collide.

const runningImage = "gp-running-ports.exe";

describe("changing a server's ports", () => {
	let panel;
	let api;
	let dir;
	let guestCookie;

	const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
	const entry = (name) => JSON.parse(fs.readFileSync(path.join(panel.dir, "servers.json"), "utf8")).servers.find((s) => s.name === name);
	const check = (name, ports) => api.post(`/api/server/${encodeURIComponent(name)}/ports/check`, { ports });
	const save = (name, ports) => api.put(`/api/server/${encodeURIComponent(name)}/ports`, { ports });

	before(async () => {
		panel = await startInstance({
			config: { portAllocation: { step: 10, reservedPorts: [9999] } },
			prepare: (folder) => {
				dir = path.join(folder, "srv");
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(path.join(dir, "conan.bat"), '@echo off\r\nstart /MIN "T" ConanSandboxServer.exe -log -ServerName=X -Port=9000 -QueryPort=9002\r\n');
				fs.writeFileSync(path.join(dir, "Game.ini"), "[RconPlugin]\r\nRconEnabled=1\r\nRconPort=9003\r\nRconMaxKarma=60\r\n");
				fs.writeFileSync(path.join(dir, "ServerSettings.ini"), "[ServerSettings]\r\nMaxPlayers=40\r\n");
				fs.writeFileSync(path.join(dir, "other.bat"), "@echo off\r\n");
				fs.writeFileSync(path.join(dir, "Start_A.bat"), '@echo off\r\nstart /MIN "A" ArkServer.exe Map?x=1 -RCONPort=9200 -Port=9201 -QueryPort=9202 -log\r\n');
				fs.writeFileSync(path.join(dir, "Start_B.bat"), '@echo off\r\nstart /MIN "B" ArkServer.exe Map?x=1 -RCONPort=9210 -Port=9211 -QueryPort=9212 -log\r\n');
				fs.writeFileSync(path.join(dir, "imported.bat"), "@echo off\r\nstart /MIN x.exe -Port=9300 -QueryPort=9302\r\n");
				fs.writeFileSync(path.join(dir, "server.properties"), "motd=Hi\r\nserver-port=9400\r\nrcon.port=9401\r\nquery.port=9400\r\n");
				fs.writeFileSync(path.join(dir, "run.bat"), "@echo off\r\n");
				runStandIn(dir, runningImage);
			},
			servers: (folder) => {
				const d = path.join(folder, "srv");
				const made = { source: "created", installDir: d, workingDir: d };
				return [
					serverEntry(d, { ...made, name: "Conan", type: "conan", port: 9000, queryPort: 9002, rconPort: 9003, processName: "nope-c.exe", startScriptPath: path.join(d, "conan.bat"), configPath: path.join(d, "ServerSettings.ini"), launch: { exe: process.execPath, args: "-log -ServerName=X -Port=9000 -QueryPort=9002", cwd: d } }),
					serverEntry(d, { ...made, name: "Other Conan", type: "conan", port: 9100, queryPort: 9102, rconPort: 9103, processName: "nope-o.exe", startScriptPath: path.join(d, "other.bat") }),
					serverEntry(d, { ...made, name: "ArkA", type: "ark", rconPort: 9200, method: "rcon", processName: undefined, startScriptPath: path.join(d, "Start_A.bat") }),
					serverEntry(d, { ...made, name: "ArkB", type: "ark", rconPort: 9210, method: "rcon", processName: undefined, startScriptPath: path.join(d, "Start_B.bat") }),
					serverEntry(d, { name: "Imported", type: "custom", source: "imported", installDir: d, workingDir: d, port: 9300, queryPort: 9302, processName: "nope-i.exe", startScriptPath: path.join(d, "imported.bat") }),
					serverEntry(d, { ...made, name: "Mc", type: "minecraft", method: "gamedig", port: 9400, rconPort: 9401, startScriptPath: path.join(d, "run.bat"), configPath: path.join(d, "server.properties") }),
					serverEntry(d, { ...made, name: "Running", type: "custom", port: 9500, processName: runningImage, startScriptPath: path.join(d, "run.bat") }),
				];
			},
		});
		api = panel.api;
		guestCookie = await api.cookieFor(GUEST);
		await sleep(4500);
	});
	after(() => {
		stopStandIns();
		return panel.stop();
	});

	describe("what the panel knows", () => {
		it("lists a server's ports, the ones the game takes for itself, and the panel's own", async () => {
			const r = (await api.get("/api/server/Conan/ports")).json;
			assert.deepEqual(r.current, { port: 9000, queryPort: 9002, rconPort: 9003 });
			assert.deepEqual(r.implicit, [{ offset: 1, label: "its raw UDP socket" }]);
			assert.equal(r.panelPort, panel.port);
			assert.equal(r.canEditFiles, true);
			assert.equal(r.running, false);
		});

		it("reads ports the entry doesn't record from the start script (ARK)", async () => {
			const r = (await api.get("/api/server/ArkA/ports")).json;
			assert.deepEqual(r.current, { port: 9201, queryPort: 9202, rconPort: 9200 });
		});

		it("only an admin can see or change them", async () => {
			assert.equal((await api.get("/api/server/Conan/ports", { cookie: guestCookie })).status, 403);
			assert.equal((await api.put("/api/server/Conan/ports", { ports: { port: 9010 } }, { cookie: guestCookie })).status, 403);
		});
	});

	describe("refusing conflicts", () => {
		it("a port outside 1024-65535, or not a number", async () => {
			for (const bad of [80, 70000, "abc", 9000.5]) {
				const r = (await check("Conan", { queryPort: bad })).json;
				assert.equal(r.ok, false, String(bad));
				assert.match(r.errors[0], /1024 to 65535/);
			}
		});

		it("a port this server doesn't have", async () => {
			const r = (await check("Conan", { telnetPort: 9010 })).json;
			assert.equal(r.ok, false);
			assert.match(r.errors[0], /no telnet port/i);
		});

		it("two of its own ports the same", async () => {
			const r = (await check("Conan", { queryPort: 9003 })).json;
			assert.equal(r.ok, false);
			assert.match(r.errors.join(" "), /both 9003/);
		});

		it("a port the game takes for itself (game port + 1)", async () => {
			for (const ports of [{ queryPort: 9001 }, { rconPort: 9001 }]) {
				const r = (await check("Conan", ports)).json;
				assert.equal(r.ok, false);
				assert.match(r.errors.join(" "), /game port \+ 1/);
				assert.match(r.errors.join(" "), /raw UDP socket/);
			}
		});

		it("moving the game port onto a spot where its own reserved port would hit another port", async () => {
			const r = (await check("Conan", { port: 9001 })).json; // implied 9002 = its query port
			assert.equal(r.ok, false);
			assert.match(r.errors.join(" "), /game port \+ 1/);
		});

		it("the panel's own port", async () => {
			const r = (await check("Conan", { queryPort: panel.port })).json;
			assert.equal(r.ok, false);
			assert.match(r.errors.join(" "), /port GodlyPanel itself uses/);
		});

		it("another server's ports, including the ones it takes for itself", async () => {
			const explicit = (await check("Conan", { queryPort: 9102 })).json;
			assert.equal(explicit.ok, false);
			assert.match(explicit.errors.join(" "), /already used by another server/);
			const raw = (await check("Conan", { queryPort: 9101 })).json; // Other Conan's raw port
			assert.equal(raw.ok, false, "9101 is Other Conan's game port + 1");
			const impliedOfMine = (await check("Conan", { port: 9099 })).json; // my raw 9100 = Other Conan's game port
			assert.equal(impliedOfMine.ok, false);
		});

		it("a sibling's ports on a shared install, which are only in its script", async () => {
			const r = (await check("ArkA", { queryPort: 9212 })).json;
			assert.equal(r.ok, false);
			assert.match(r.errors.join(" "), /already used by another server/);
		});

		it("a port on Settings' reserved list", async () => {
			const r = (await check("Conan", { queryPort: 9999 })).json;
			assert.equal(r.ok, false);
			assert.match(r.errors.join(" "), /reserved/);
		});

		it("but only warns when something on this PC is listening on it right now", async () => {
			const held = await freePort();
			const listener = net.createServer().listen(held, "0.0.0.0");
			await new Promise((r) => listener.once("listening", r));
			try {
				const r = (await check("Conan", { queryPort: held })).json;
				assert.equal(r.ok, true);
				assert.match(r.warnings.join(" "), /already using port/);
			} finally {
				listener.close();
			}
		});

		it("accepts a clean change, and reports an unchanged one as no change", async () => {
			const ok = (await check("Conan", { port: 9010, queryPort: 9012 })).json;
			assert.equal(ok.ok, true);
			assert.deepEqual(ok.changes, { port: { from: 9000, to: 9010 }, queryPort: { from: 9002, to: 9012 } });
			assert.deepEqual((await check("Conan", { port: 9000 })).json.changes, {});
		});
	});

	describe("applying a change", () => {
		it("refuses while the server is running, and changes nothing", async () => {
			const r = await save("Running", { port: 9510 });
			assert.equal(r.status, 409);
			assert.equal(r.json.code, "server_running");
			assert.equal(entry("Running").port, 9500);
		});

		it("refuses a conflicting save with the same reasons as the check", async () => {
			const r = await save("Conan", { queryPort: 9001 });
			assert.equal(r.status, 400);
			assert.match(r.json.error, /game port \+ 1/);
			assert.match(read("conan.bat"), /-QueryPort=9002/);
		});

		it("updates the start script, the panel's launch line and its record together, keeping a backup", async () => {
			const r = await save("Conan", { port: 9010, queryPort: 9012 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.match(read("conan.bat"), /-Port=9010 -QueryPort=9012/);
			assert.match(read("conan.bat.bak"), /-Port=9000 -QueryPort=9002/, "the previous script is kept");
			const e = entry("Conan");
			assert.deepEqual([e.port, e.queryPort], [9010, 9012]);
			assert.equal(e.launch.args, "-log -ServerName=X -Port=9010 -QueryPort=9012", "the no-window launch follows");
			assert.match(read("Game.ini"), /RconPort=9003/, "what wasn't changed is left alone");
		});

		it("updates the game's own config for ports that live there (Conan's RCON port)", async () => {
			const r = await save("Conan", { rconPort: 9013 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.match(read("Game.ini"), /RconPort=9013/);
			assert.equal(entry("Conan").rconPort, 9013);
			assert.equal(r.json.current.rconPort, 9013);
		});

		it("updates Minecraft's server.properties, including the query port that mirrors the game port", async () => {
			const r = await save("Mc", { port: 9410, rconPort: 9412 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			const props = read("server.properties");
			assert.match(props, /server-port=9410/);
			assert.match(props, /query\.port=9410/);
			assert.match(props, /rcon\.port=9412/);
			assert.match(props, /motd=Hi/, "nothing else was touched");
		});

		it("updates an ARK map's own script, and the RCON port in its record", async () => {
			const r = await save("ArkA", { port: 9231, rconPort: 9230 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.match(read("Start_A.bat"), /-RCONPort=9230 -Port=9231 -QueryPort=9202/);
			assert.equal(entry("ArkA").rconPort, 9230);
			assert.match(read("Start_B.bat"), /-Port=9211/, "the sibling's script is untouched");
		});

		it("for an imported server changes only the panel's record, and says so", async () => {
			const r = await save("Imported", { port: 9310, queryPort: 9312 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.equal(entry("Imported").port, 9310);
			assert.match(read("imported.bat"), /-Port=9300 -QueryPort=9302/, "its own script is not rewritten");
			assert.match(r.json.warnings.join(" "), /imported/);
		});

		it("says when a port wasn't found in the server's files, rather than pretending it changed them", async () => {
			// "Other Conan" has a script with no ports in it and no settings file.
			const r = await save("Other Conan", { queryPort: 9122 });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.equal(entry("Other Conan").queryPort, 9122, "the panel's record did change");
			assert.match(r.json.warnings.join(" "), /wasn't found in this server's files/);
			assert.deepEqual(r.json.filesChanged, []);
		});
	});
});
