import { describe, it } from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import net from "node:net";
import { portBusy } from "../../src/server/util/portProbe.js";

// A server that isn't in the panel (or another program) holding a port must be
// noticed, so a new or cloned server isn't placed on top of it.

const free = () =>
	new Promise((resolve) => {
		const s = net.createServer();
		s.listen(0, "0.0.0.0", () => {
			const { port } = s.address();
			s.close(() => resolve(port));
		});
	});

describe("noticing a port that something is using", () => {
	it("sees a TCP listener", async () => {
		const port = await free();
		const s = net.createServer();
		await new Promise((r) => s.listen(port, "0.0.0.0", r));
		assert.equal(await portBusy(port), true);
		await new Promise((r) => s.close(r));
		assert.equal(await portBusy(port), false, "and sees it free again");
	});

	it("sees a UDP socket", async () => {
		const port = await free();
		const s = dgram.createSocket("udp4");
		await new Promise((r) => s.bind(port, "0.0.0.0", r));
		assert.equal(await portBusy(port), true);
		await new Promise((r) => s.close(r));
	});

	it("says a free port is free", async () => {
		assert.equal(await portBusy(await free()), false);
	});
});
