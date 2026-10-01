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

// Other test files run at the same time and take ports from the same pool, so a port that was
// free a moment ago can be taken by someone else before it is asked about again. Whatever is
// being asserted about a port that should be free is tried on a few ports before it counts.
async function eventually(check) {
	let last;
	for (let attempt = 0; attempt < 6; attempt++) {
		last = await check(await free());
		if (last === true) return;
	}
	assert.fail("never saw a port as free, after six tries on different ports");
}

describe("noticing a port that something is using", () => {
	it("sees a TCP listener", async () => {
		await eventually(async (port) => {
			const s = net.createServer();
			try {
				await new Promise((resolve, reject) => {
					s.once("error", reject);
					s.listen(port, "0.0.0.0", resolve);
				});
			} catch {
				return false; // taken by someone else already; try another
			}
			assert.equal(await portBusy(port), true);
			await new Promise((r) => s.close(r));
			return (await portBusy(port)) === false;
		});
	});

	it("sees a UDP socket", async () => {
		await eventually(async (port) => {
			const s = dgram.createSocket("udp4");
			try {
				await new Promise((resolve, reject) => {
					s.once("error", reject);
					s.bind(port, "0.0.0.0", resolve);
				});
			} catch {
				s.close();
				return false;
			}
			assert.equal(await portBusy(port), true);
			await new Promise((r) => s.close(r));
			return true;
		});
	});

	it("says a free port is free", async () => {
		await eventually(async (port) => (await portBusy(port)) === false);
	});
});
