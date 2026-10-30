import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Same setup as permissions.test.js: point the data folder at a throw-away folder before anything from src/server loads.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sse-filters-"));
process.env.GHP_DATA_DIR = dir;
const { activityVisibleTo } = await import("../../src/server/services/activityLog.js");
const { backupProgressVisibleTo } = await import("../../src/server/services/backupService.js");
const roleStore = await import("../../src/server/data/roleStore.js");

const watch = await roleStore.create({ name: "Watcher", permissions: ["activity.view"] });
const backer = await roleStore.create({ name: "Backer", permissions: ["server.backup"] });
const logsOnly = await roleStore.create({ name: "Logs only", permissions: ["server.logs"] });

// The shape a live-update client has (see sseHub.addSseClient): the role, the server limit and the per-server roles.
const client = (role, extra = {}) => ({ role, servers: null, serverRoles: null, ...extra });

describe("activityVisibleTo", () => {
	const onAlpha = { type: "server.crashed", server: "Alpha" };
	const onBeta = { type: "server.crashed", server: "Beta" };
	const noServer = { type: "panel.started", server: null };

	it("admin and moderator see everything they are allowed to", () => {
		for (const event of [onAlpha, onBeta, noServer]) {
			assert.equal(activityVisibleTo(client("admin"), event), true);
			assert.equal(activityVisibleTo(client("moderator"), event), true);
		}
	});

	it("a guest sees none of it", () => {
		for (const event of [onAlpha, onBeta, noServer]) assert.equal(activityVisibleTo(client("guest"), event), false);
	});

	it("a custom role sees activity only while it holds activity.view", () => {
		assert.equal(activityVisibleTo(client(watch.id), onAlpha), true);
		assert.equal(activityVisibleTo(client(watch.id), noServer), true);
		assert.equal(activityVisibleTo(client(logsOnly.id), onAlpha), false);
	});

	it("a moderator limited to Alpha sees Alpha's events, not Beta's, and keeps the ones about no server", () => {
		const limited = client("moderator", { servers: ["Alpha"] });
		assert.equal(activityVisibleTo(limited, onAlpha), true);
		assert.equal(activityVisibleTo(limited, onBeta), false);
		assert.equal(activityVisibleTo(limited, noServer), true);
	});

	it("a guest with a per-server role sees only the server that role applies to", () => {
		const guest = client("guest", { serverRoles: { Alpha: watch.id } });
		assert.equal(activityVisibleTo(guest, onAlpha), true);
		assert.equal(activityVisibleTo(guest, onBeta), false);
		assert.equal(activityVisibleTo(guest, noServer), false, "the per-server role gives no access beyond its server");
	});

	it("an unknown role id sees nothing", () => {
		assert.equal(activityVisibleTo(client("r-00000000"), onAlpha), false);
		assert.equal(activityVisibleTo(client("r-00000000"), noServer), false);
	});
});

describe("backupProgressVisibleTo", () => {
	it("admin and moderator see progress on any server", () => {
		assert.equal(backupProgressVisibleTo(client("admin"), "Alpha"), true);
		assert.equal(backupProgressVisibleTo(client("moderator"), "Alpha"), true);
	});

	it("a guest sees none", () => {
		assert.equal(backupProgressVisibleTo(client("guest"), "Alpha"), false);
	});

	it("a custom role sees progress only while it holds server.backup", () => {
		assert.equal(backupProgressVisibleTo(client(backer.id), "Alpha"), true);
		assert.equal(backupProgressVisibleTo(client(logsOnly.id), "Alpha"), false);
	});

	it("a role limited to some servers sees progress only on those", () => {
		const limited = client(backer.id, { servers: ["Alpha"] });
		assert.equal(backupProgressVisibleTo(limited, "Alpha"), true);
		assert.equal(backupProgressVisibleTo(limited, "Beta"), false);
	});

	it("a guest with a per-server role sees progress on that server only", () => {
		const guest = client("guest", { serverRoles: { Alpha: backer.id } });
		assert.equal(backupProgressVisibleTo(guest, "Alpha"), true);
		assert.equal(backupProgressVisibleTo(guest, "Beta"), false);
	});

	it("an unknown role id sees nothing", () => {
		assert.equal(backupProgressVisibleTo(client("r-00000000"), "Alpha"), false);
	});
});
