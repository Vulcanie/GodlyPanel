import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { withRcon } from "../../src/server/services/rconClient.js";

// Palworld's RCON (seen on a real server): the login is answered normally, but every
// command is answered with id 0 and type 0 instead of the request's id. A client that
// matches replies to requests by id waits for an answer that never matches, so every
// command "timed out" while the game did what it was told. Save, stop and broadcast were
// all failing.

const packet = (id, type, body) => {
	const text = Buffer.from(body);
	const b = Buffer.alloc(14 + text.length);
	b.writeInt32LE(10 + text.length, 0);
	b.writeInt32LE(id, 4);
	b.writeInt32LE(type, 8);
	text.copy(b, 12);
	return b;
};

describe("RCON against Palworld's way of answering", () => {
	let server;
	let port;
	const seen = [];

	before(async () => {
		server = net.createServer((socket) => {
			let pending = Buffer.alloc(0);
			socket.on("error", () => {});
			socket.on("data", (chunk) => {
				pending = Buffer.concat([pending, chunk]);
				while (pending.length >= 4 && pending.length >= 4 + pending.readInt32LE(0)) {
					const length = pending.readInt32LE(0);
					const id = pending.readInt32LE(4);
					const type = pending.readInt32LE(8);
					const body = pending.subarray(12, 4 + length - 2).toString();
					pending = pending.subarray(4 + length);
					if (type === 3) socket.write(body === "secret" ? packet(id, 2, "") : packet(-1, 2, ""));
					else {
						seen.push(body);
						socket.write(packet(0, 0, body === "Save" ? "Complete Save\n" : `Failed to Kick: ${body}\n`));
					}
				}
			});
		});
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		port = server.address().port;
	});
	after(() => new Promise((resolve) => server.close(resolve)));

	const palworld = (password = "secret") => ({ name: "Pal", type: "Palword", host: "127.0.0.1", rconPort: port, rconPassword: password });

	it("gets the answer to a command", async () => {
		assert.equal(await withRcon(palworld(), (_r, send) => send("Save")), "Complete Save\n");
	});

	it("runs several commands on one connection, each getting its own answer", async () => {
		const out = await withRcon(palworld(), async (_r, send) => [await send("Save"), await send("KickPlayer 1")]);
		assert.deepEqual(out, ["Complete Save\n", "Failed to Kick: KickPlayer 1\n"]);
	});

	it("says so when the password is wrong", async () => {
		await assert.rejects(() => withRcon(palworld("nope"), (_r, send) => send("Save")), /wrong password/);
	});
});
