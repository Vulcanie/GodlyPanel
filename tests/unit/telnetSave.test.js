import { describe, it } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { sendTelnetSave } from "../../src/server/services/serverControl.js";

// Before a stop, the panel asks some games to save over their local text console. 7 Days to Die understands `saveworld`; Soulmask wants
// `saveworld 1` (checked on a real install), so the command comes from the server's entry.

function listen() {
	return new Promise((resolve) => {
		const received = [];
		const server = net.createServer((socket) => socket.on("data", (d) => received.push(d.toString())));
		server.listen(0, "127.0.0.1", () => resolve({ server, received, port: server.address().port }));
	});
}

describe("the save command sent before a stop", () => {
	it("is `saveworld` unless the server says otherwise", async () => {
		const { server, received, port } = await listen();
		await sendTelnetSave({ name: "t", host: "127.0.0.1", telnetPort: port }, 3000, 150);
		server.close();
		assert.equal(received.join(""), "saveworld\n");
	});

	it("is the one the server's entry gives", async () => {
		const { server, received, port } = await listen();
		await sendTelnetSave({ name: "t", host: "127.0.0.1", telnetPort: port, telnetSaveCommand: "saveworld 1" }, 3000, 150);
		server.close();
		assert.equal(received.join(""), "saveworld 1\n");
	});

	it("does not let a command with a line break send a second one", async () => {
		const { server, received, port } = await listen();
		await sendTelnetSave({ name: "t", host: "127.0.0.1", telnetPort: port, telnetSaveCommand: "save\nshutdown" }, 3000, 150);
		server.close();
		assert.equal(received.join(""), "saveworld\n");
	});
});
