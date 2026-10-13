import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { addSseClient, broadcastSseEvent, clientCount, dropClientsWhere } from "../../src/server/services/sseHub.js";

// A browser that stops reading without closing its connection must not make the panel hold every update for it in memory.

const fakeStream = (writableLength = 0) => {
	const req = new EventEmitter();
	const written = [];
	let ended = false;
	const res = {
		writableLength,
		setHeader() {},
		flushHeaders() {},
		write(chunk) {
			written.push(chunk);
			return true;
		},
		end() {
			ended = true;
		},
	};
	return { req, res, written, isEnded: () => ended };
};

describe("live streams that stop reading", () => {
	it("are cut once too much is waiting to be sent, and the others carry on", () => {
		const healthy = fakeStream();
		const stalled = fakeStream();
		addSseClient(healthy.req, healthy.res, { id: "u1", role: "admin" });
		addSseClient(stalled.req, stalled.res, { id: "u2", role: "admin" });
		assert.equal(clientCount(), 2);

		stalled.res.writableLength = 5 * 1024 * 1024;
		broadcastSseEvent({ type: "ping" });

		assert.equal(clientCount(), 1, "the stalled one was dropped");
		assert.ok(stalled.isEnded());
		assert.ok(healthy.written.some((w) => w.includes('"ping"')), "the healthy one still got the update");
		assert.ok(!stalled.written.some((w) => w.includes('"ping"')), "nothing more was queued for the stalled one");

		dropClientsWhere(() => true);
		assert.equal(clientCount(), 0);
	});

	it("remember which servers a limited moderator may see", () => {
		const s = fakeStream();
		const seen = [];
		addSseClient(s.req, s.res, { id: "m", role: "moderator", servers: ["Alpha"] });
		broadcastSseEvent({ type: "x" }, (client) => {
			seen.push(client.servers);
			return true;
		});
		assert.deepEqual(seen, [["Alpha"]]);
		dropClientsWhere(() => true);
	});
});
