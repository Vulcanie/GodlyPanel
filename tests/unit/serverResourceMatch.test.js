import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findMatches } from "../../src/server/services/serverResourceStats.js";

// Which running program is a Minecraft server, for its CPU and RAM readings.

const java = (ProcessId, ListeningPorts, CommandLine = "java -jar server.jar --installer-force --installer 26.1.2.122 nogui") => ({
	ProcessId,
	Name: "java",
	CommandLine,
	ListeningPorts,
});

describe("finding a Minecraft server's process", () => {
	it("finds it by its own ports even when the command line's loader version differs from its files", () => {
		const server = { name: "BMC6", type: "minecraft", port: 8030, rconPort: 25990, workingDir: "C:\\does-not-exist" };
		const found = findMatches(server, [java(1, [25565]), java(2, [25990, 8030])]);
		assert.deepEqual(found.map((p) => p.ProcessId), [2]);
	});

	it("tells two identical Java programs apart by port", () => {
		const a = { type: "minecraft-vanilla", port: 25565, rconPort: 25566, processName: "java.exe" };
		const found = findMatches(a, [java(1, [25565]), java(2, [25567])]);
		assert.deepEqual(found.map((p) => p.ProcessId), [1]);
	});

	it("finds it by its RCON port alone when the game port isn't the one it listens on", () => {
		const server = { type: "minecraft", port: 25565, rconPort: 25566 };
		const found = findMatches(server, [java(1, [25566])]);
		assert.deepEqual(found.map((p) => p.ProcessId), [1]);
	});

	it("keeps several servers' programs separate when many run at once", () => {
		const servers = [
			{ type: "minecraft", port: 25565, rconPort: 25566 },
			{ type: "minecraft", port: 25567, rconPort: 25568 },
			{ type: "minecraft", port: 25569, rconPort: 25570 },
		];
		const running = [java(10, [25565, 25566]), java(20, [25567, 25568]), java(30, [25569, 25570])];
		assert.deepEqual(servers.map((s) => findMatches(s, running).map((p) => p.ProcessId)), [[10], [20], [30]]);
	});

	it("ignores a program that isn't Java even if it listens on the server's port", () => {
		const server = { type: "minecraft", port: 25565, rconPort: 25566 };
		const other = { ProcessId: 5, Name: "nginx", CommandLine: "nginx", ListeningPorts: [25565] };
		assert.deepEqual(findMatches(server, [other]), []);
	});

	it("falls back to the loader version in the command line when no port is reported", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "mc-"));
		try {
			writeFileSync(path.join(dir, "variables.txt"), "MODLOADER_VERSION=26.1.2.122\n");
			const server = { type: "minecraft", port: 25565, rconPort: 25566, workingDir: dir };
			const found = findMatches(server, [java(1, []), java(2, undefined, "java -jar server.jar --installer 1.0.0 nogui")]);
			assert.deepEqual(found.map((p) => p.ProcessId), [1]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("takes nothing when no Java program listens on its ports and nothing else identifies it", () => {
		const server = { type: "minecraft", port: 8030, rconPort: 25990, workingDir: "C:\\does-not-exist" };
		assert.deepEqual(findMatches(server, [java(1, [25565])]), []);
	});
});
