import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, sleep } from "../helpers/instance.js";

// A modded Minecraft world can carry tens of gigabytes of Distant Horizons data (a rebuildable cache of
// far-away terrain, in a database next to each dimension). Backups leave it out, wherever it is nested,
// and keep everything that is actually the world.

async function until(check, { timeoutMs = 30_000 } = {}) {
	const end = Date.now() + timeoutMs;
	while (Date.now() < end) {
		const v = await check();
		if (v) return v;
		await sleep(250);
	}
	return check();
}

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

describe("backups of a modded Minecraft world", () => {
	let panel;
	let api;
	let folder;

	before(async () => {
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "mc");
				const w = (rel, text = "x") => {
					const full = path.join(folder, "world", rel);
					fs.mkdirSync(path.dirname(full), { recursive: true });
					fs.writeFileSync(full, text);
				};
				w("level.dat");
				w("dimensions/minecraft/overworld/region/r.0.0.mca", "the world");
				w("dimensions/minecraft/overworld/DistantHorizons.sqlite", "big cache");
				w("dimensions/minecraft/overworld/DistantHorizons.sqlite-wal", "big cache");
				w("dimensions/minecraft/the_nether/DistantHorizons.sqlite", "big cache");
				w("DistantHorizons.sqlite", "big cache");
				w("data/chunky.dat", "kept");
				fs.writeFileSync(path.join(folder, "server.properties"), "motd=hello\n");
				return [serverEntry(folder, { name: "Modded MC", type: "minecraft", processName: "nope-mc.exe", workingDir: folder, installDir: folder })];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("lists the exclusion with the world", async () => {
		const o = (await api.get("/api/server/Modded%20MC/backups")).json;
		const world = o.specs.find((s) => s.label === "World");
		assert.ok(world.exclude.includes("*DistantHorizons*"));
	});

	it("leaves the Distant Horizons databases out and keeps the world", async () => {
		const r = await api.post("/api/server/Modded%20MC/backups", {});
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(async () => !(await api.get("/api/operations")).json["Modded MC"]);
		const done = await until(async () => (await api.get("/api/server/Modded%20MC/backups")).json.backups.length === 1);
		assert.ok(done, "a backup was made");

		const zip = walk(path.join(panel.dir, "backups")).find((f) => f.endsWith(".zip"));
		assert.ok(zip, "its zip is on disk");
		const names = execFileSync(path.join(process.env.SystemRoot ?? "C:\Windows", "System32", "tar.exe"), ["-tf", zip], { encoding: "utf8" }).split(/\r?\n/).filter((n) => n && !n.endsWith("/"));
		assert.ok(names.some((n) => n.endsWith("level.dat")), names.join(", "));
		assert.ok(names.some((n) => n.endsWith("overworld/region/r.0.0.mca")), "the region files are in it");
		assert.ok(names.some((n) => n.endsWith("data/chunky.dat")));
		assert.ok(names.some((n) => n.endsWith("server.properties")));
		assert.deepEqual(names.filter((n) => /DistantHorizons/i.test(n)), [], "no Distant Horizons file, at any depth");
	});
});
