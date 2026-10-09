import { describe, it } from "node:test";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import net from "node:net";
import { portBusy } from "../../src/server/util/portProbe.js";

// A server that isn't in the panel (or another program) holding a port must be
// noticed, so a new or cloned server isn't placed on top of it.

// What binding a port does, on TCP and on UDP, as an error code (or "free"): the facts behind a failure, so a flaky machine says what it saw.
const tryTcp = (port) =>
	new Promise((resolve) => {
		const s = net.createServer();
		s.once("error", (e) => resolve(e.code ?? String(e)));
		s.listen(port, "0.0.0.0", () => s.close(() => resolve("free")));
	});
const tryUdp = (port) =>
	new Promise((resolve) => {
		const s = dgram.createSocket("udp4");
		s.once("error", (e) => {
			try {
				s.close();
			} catch {
				// Already closed.
			}
			resolve(e.code ?? String(e));
		});
		s.bind(port, "0.0.0.0", () => s.close(() => resolve("free")));
	});

// A port that is free right now on both TCP and UDP (a game may use either, and the probe looks at both).
async function free() {
	for (let attempt = 0; attempt < 20; attempt++) {
		const port = await new Promise((resolve) => {
			const s = net.createServer();
			s.listen(0, "0.0.0.0", () => {
				const { port: p } = s.address();
				s.close(() => resolve(p));
			});
		});
		if ((await tryUdp(port)) === "free") return port;
	}
	throw new Error("couldn't find a port that is free on both TCP and UDP");
}

// Other test files run at the same time and take ports from the same pool, so a port that was
// free a moment ago can be taken by someone else before it is asked about again. Whatever is
// being asserted about a port that should be free is tried on several ports, with a short pause
// between, before it counts. If it never works, the failure says what each port looked like.
async function eventually(check) {
	const seen = [];
	for (let attempt = 0; attempt < 10; attempt++) {
		const port = await free();
		if ((await check(port)) === true) return;
		seen.push(`port ${port}: tcp ${await tryTcp(port)}, udp ${await tryUdp(port)}`);
		await new Promise((r) => setTimeout(r, 100));
	}
	assert.fail(`never saw a port as free, after ten tries on different ports. What each looked like afterwards: ${seen.join("; ")}`);
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
