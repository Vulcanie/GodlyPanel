import crypto from "node:crypto";
import http from "node:http";

// A stand-in for Discord: the gateway (a WebSocket, written out by hand since Node has no
// WebSocket server) and the few web calls a bot makes. It says hello, checks the bot's
// token when it identifies, answers heartbeats, can push a slash command to the bot, and
// records the commands the bot registered and the answers it gave.

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function frame(opcode, payload) {
	const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
	const head = body.length < 126 ? Buffer.from([0x80 | opcode, body.length]) : Buffer.concat([Buffer.from([0x80 | opcode, 126]), Buffer.from([body.length >> 8, body.length & 255])]);
	return Buffer.concat([head, body]);
}

function readFrames(state, chunk, onFrame) {
	state.buffer = Buffer.concat([state.buffer, chunk]);
	for (;;) {
		const b = state.buffer;
		if (b.length < 2) return;
		const opcode = b[0] & 0x0f;
		let length = b[1] & 0x7f;
		let offset = 2;
		if (length === 126) {
			if (b.length < 4) return;
			length = b.readUInt16BE(2);
			offset = 4;
		} else if (length === 127) {
			if (b.length < 10) return;
			length = Number(b.readBigUInt64BE(2));
			offset = 10;
		}
		const masked = (b[1] & 0x80) !== 0;
		const total = offset + (masked ? 4 : 0) + length;
		if (b.length < total) return;
		let data = b.subarray(offset + (masked ? 4 : 0), total);
		if (masked) {
			const mask = b.subarray(offset, offset + 4);
			data = Buffer.from(data.map((byte, i) => byte ^ mask[i % 4]));
		}
		state.buffer = b.subarray(total);
		onFrame(opcode, data);
	}
}

export async function startFakeDiscord({ token = "bot-token", applicationId = "111", guildId = "222", heartbeatMs = 300 } = {}) {
	const registered = [];
	const answers = [];
	const sockets = new Set();
	const log = [];
	let identifies = 0;
	let onAnswer = null;

	const server = http.createServer((req, res) => {
		const chunks = [];
		req.on("data", (c) => chunks.push(c));
		req.on("end", () => {
			const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
			log.push(`${req.method} ${req.url}`);
			if (req.headers.authorization !== `Bot ${token}`) {
				res.writeHead(401, { "content-type": "application/json" });
				return res.end('{"message":"401: Unauthorized"}');
			}
			let m = /^\/api\/v10\/applications\/([^/]+)\/guilds\/([^/]+)\/commands$/.exec(req.url);
			if (m && req.method === "PUT") {
				if (m[1] !== applicationId || m[2] !== guildId) {
					res.writeHead(404);
					return res.end("{}");
				}
				registered.push(body);
				res.writeHead(200, { "content-type": "application/json" });
				return res.end(JSON.stringify(body));
			}
			m = /^\/api\/v10\/interactions\/([^/]+)\/([^/]+)\/callback$/.exec(req.url);
			if (m && req.method === "POST") {
				const answer = { interactionId: m[1], ...body };
				answers.push(answer);
				onAnswer?.(answer);
				res.writeHead(204);
				return res.end();
			}
			res.writeHead(404);
			res.end("{}");
		});
	});

	server.on("upgrade", (req, socket) => {
		const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + GUID).digest("base64");
		socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
		sockets.add(socket);
		const state = { buffer: Buffer.alloc(0), seq: 0, identified: false };
		socket.state = state;
		const send = (op, d, t = null) => socket.writable && socket.write(frame(1, JSON.stringify({ op, d, t, s: t ? ++state.seq : null })));
		socket.sendJson = send;
		socket.closeWith = (code) => {
			const payload = Buffer.alloc(2);
			payload.writeUInt16BE(code);
			socket.write(frame(8, payload));
			socket.end();
		};
		send(10, { heartbeat_interval: heartbeatMs });
		socket.on("data", (chunk) =>
			readFrames(state, chunk, (opcode, data) => {
				if (opcode === 8) return socket.end();
				if (opcode === 9) return socket.write(frame(10, data));
				if (opcode !== 1) return;
				const msg = JSON.parse(data.toString());
				if (msg.op === 1) return send(11, null);
				if (msg.op === 2) {
					identifies += 1;
					if (msg.d.token !== token) return socket.closeWith(4004);
					state.identified = true;
					return send(0, { user: { username: "GodlyBot", id: "999" }, session_id: "s" }, "READY");
				}
			}),
		);
		socket.on("close", () => sockets.delete(socket));
		socket.on("error", () => sockets.delete(socket));
	});

	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;

	const current = () => [...sockets].find((s) => s.state.identified);
	return {
		api: `http://127.0.0.1:${port}/api/v10`,
		gateway: `ws://127.0.0.1:${port}/`,
		registered,
		answers,
		log,
		get identifies() {
			return identifies;
		},
		connected: () => Boolean(current()),
		/** Send a slash command (or autocomplete) to the bot and wait for what it answers. */
		async interact(payload, { timeoutMs = 10_000 } = {}) {
			const socket = current();
			if (!socket) throw new Error("the bot isn't connected");
			const id = String(Math.floor(Math.random() * 1e15));
			const before = answers.length;
			const got = new Promise((resolve, reject) => {
				const timer = setTimeout(() => {
					onAnswer = null;
					reject(new Error("the bot didn't answer"));
				}, timeoutMs);
				onAnswer = (a) => {
					if (a.interactionId !== id) return;
					clearTimeout(timer);
					onAnswer = null;
					resolve(a);
				};
			});
			socket.sendJson(0, { id, token: `tok-${id}`, application_id: applicationId, guild_id: guildId, ...payload }, "INTERACTION_CREATE");
			void before;
			return got;
		},
		dropConnections: () => sockets.forEach((s) => s.destroy()),
		stop: async () => {
			sockets.forEach((s) => s.destroy());
			await new Promise((resolve) => server.close(resolve));
		},
	};
}
