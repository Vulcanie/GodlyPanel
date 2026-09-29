import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { withRcon } from "../../src/server/services/rconClient.js";

// Conan Exiles' RCON accepts the login and runs commands, but stamps every reply
// with the request id minus one (a command sent as id 2 is answered as id 1, and
// the login reply comes back as id 0). Standard clients match a reply to its
// request by id, so against Conan every command "times out" even though the
// server did what it was asked. That is why Stop, save and broadcast all failed
// on Conan until it got its own client.
//
// This fake reproduces that behaviour exactly, as observed on a real server.

const EXEC = 2;
const AUTH = 3;

function packet(id, type, body) {
	const text = Buffer.from(body, "utf8");
	const buf = Buffer.alloc(14 + text.length);
	buf.writeInt32LE(10 + text.length, 0);
	buf.writeInt32LE(id, 4);
	buf.writeInt32LE(type, 8);
	text.copy(buf, 12);
	return buf;
}

function fakeConan({ password, silentOn = [] }) {
	const received = [];
	const server = net.createServer((socket) => {
		let pending = Buffer.alloc(0);
		socket.on("error", () => {});
		socket.on("data", (chunk) => {
			pending = Buffer.concat([pending, chunk]);
			while (pending.length >= 4) {
				const length = pending.readInt32LE(0);
				if (pending.length < 4 + length) break;
				const id = pending.readInt32LE(4);
				const type = pending.readInt32LE(8);
				const body = pending.subarray(12, 4 + length - 2).toString("utf8");
				pending = pending.subarray(4 + length);

				if (type === AUTH) {
					// A wrong password is answered with id -1; a right one with id 0.
					socket.write(body === password ? packet(0, 2, "Authenticated.") : packet(-1, 2, ""));
				} else if (type === EXEC) {
					received.push(body);
					if (body === "Shutdown") return socket.end(); // ends the process; no reply
					if (silentOn.includes(body)) return; // never answers
					socket.write(packet(id - 1, 2, `ran:${body}`)); // the quirk: id - 1
				}
			}
		});
	});
	return new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () =>
			resolve({ server, port: server.address().port, received }),
		);
	});
}

describe("Conan RCON", () => {
	let fake;
	const entry = (overrides = {}) => ({
		name: "Conan Test",
		type: "conan",
		host: "127.0.0.1",
		rconPort: fake.port,
		rconPassword: "secret",
		...overrides,
	});

	before(async () => {
		fake = await fakeConan({ password: "secret", silentOn: ["ignored"] });
	});
	after(() => new Promise((resolve) => fake.server.close(resolve)));

	it("gets each command's answer despite the shifted reply ids", async () => {
		const answers = await withRcon(entry(), async (_r, send) => [await send("listplayers"), await send("broadcast hi"), await send("help")], { timeoutMs: 2000 });
		assert.deepEqual(answers, ["ran:listplayers", "ran:broadcast hi", "ran:help"]);
	});

	it("rejects a wrong password with a clear message", async () => {
		await assert.rejects(withRcon(entry({ rconPassword: "nope" }), (_r, send) => send("listplayers"), { timeoutMs: 2000 }), /authentication failed/i);
	});

	it("treats the server closing the connection on Shutdown as done", async () => {
		const result = await withRcon(entry(), (_r, send) => send("Shutdown"), { timeoutMs: 2000 });
		assert.equal(result, "");
		assert.ok(fake.received.includes("Shutdown"), "the command was actually sent");
	});

	it("gives up on a command that is never answered", async () => {
		await assert.rejects(withRcon(entry(), (_r, send) => send("ignored"), { timeoutMs: 400 }), /timed out/);
	});

	it("reports a server that isn't listening", async () => {
		await assert.rejects(withRcon(entry({ rconPort: 1 }), (_r, send) => send("x"), { timeoutMs: 1000 }));
	});

	it("is only used for Conan: the standard client, by contrast, times out on the same server", async () => {
		// This is the failure the dedicated client exists to avoid.
		await assert.rejects(withRcon(entry({ type: "ark" }), (_r, send) => send("listplayers"), { timeoutMs: 600 }), /timed out|timeout/i);
	});
});
