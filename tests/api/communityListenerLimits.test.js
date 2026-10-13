import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The community listener faces the internet, so a visitor who sends a request a byte at a time must not be able to hold a
// connection open for ever. The limit is on receiving the request: a live-update stream (a GET that is complete as soon as its
// headers are in) goes on as long as the visitor stays.

const PUBLIC = "limits-test.example.com";

describe("the community listener's request time limit", () => {
	let panel;
	let listener;
	let port;
	let guestCookie;

	before(async () => {
		panel = await startInProcess({});
		guestCookie = await panel.api.cookieFor(GUEST);
		listener = await import("../../src/server/services/communityListener.js");
		port = await listener.startListener({ port: 0, hostRule: () => ({ exact: PUBLIC }), requestTimeoutMs: 600, checkEveryMs: 100 });
	});
	after(async () => {
		await listener.stopListener();
		await panel.stop();
	});

	it("closes a connection that sends its body too slowly", async () => {
		const socket = net.connect(port, "127.0.0.1");
		let answer = "";
		socket.on("data", (d) => (answer += d));
		const closed = new Promise((resolve) => socket.on("close", resolve));
		socket.write(`POST /api/auth/login HTTP/1.1\r\nHost: ${PUBLIC}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{"user`);
		const result = await Promise.race([closed.then(() => "closed"), new Promise((r) => setTimeout(() => r("open"), 4000))]);
		socket.destroy();
		assert.equal(result, "closed", "the half-sent request did not hold the connection");
		assert.match(answer, /408/);
	});

	it("leaves a live-update stream open for longer than that", async () => {
		const socket = net.connect(port, "127.0.0.1");
		let answer = "";
		socket.on("data", (d) => (answer += d));
		let closed = false;
		socket.on("close", () => (closed = true));
		socket.write(`GET /api/events HTTP/1.1\r\nHost: ${PUBLIC}\r\nCookie: ${guestCookie}\r\n\r\n`);
		await new Promise((r) => setTimeout(r, 2000));
		const stillOpen = !closed;
		socket.destroy();
		assert.match(answer, /200/);
		assert.match(answer, /connected/);
		assert.equal(stillOpen, true);
	});
});
