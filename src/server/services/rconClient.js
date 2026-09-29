import net from "node:net";
import { Rcon } from "rcon-client";
import { withTimeout } from "../util/async.js";

/**
 * Run `fn(rcon, send)` against a server's RCON port and always clean up afterwards.
 *
 * Three call sites used to each hand-roll this, and each had to independently
 * remember the same two easy-to-forget things:
 *
 *  - an 'error' listener, because an unhandled 'error' on the emitter is fatal
 *    to the whole process, not just to that one request;
 *  - destroying the socket rather than calling rcon.end(), which waits for the
 *    game to close its side — ARK never does for non-terminal commands, and
 *    even for "stop" it can outlast any sensible client timeout.
 *
 * @param {object} server   entry with host, rconPort, rconPassword, name
 * @param {(rcon: Rcon, send: (cmd: string) => Promise<string>) => Promise<T>} fn
 * @param {{ timeoutMs?: number }} [opts]  applies to the connect and to each send
 */
export async function withRcon(server, fn, { timeoutMs = 5000 } = {}) {
	if (repliesOutOfStep(server)) return withSequentialRcon(server, fn, timeoutMs);

	const rcon = new Rcon({
		host: server.host,
		port: server.rconPort,
		password: server.rconPassword,
	});
	rcon.on("error", (err) => {
		console.warn(`RCON error on ${server.name}:`, err.message);
	});

	try {
		await withTimeout(rcon.connect(), timeoutMs, "RCON connect");
		const send = (command) => withTimeout(rcon.send(command), timeoutMs, "RCON send");
		return await fn(rcon, send);
	} finally {
		try {
			rcon.socket?.destroy();
		} catch {
			// Never opened, or already closed.
		}
	}
}

// ---------------------------------------------------------------------------
// Conan Exiles
//
// Conan's RCON accepts the login and runs commands, but stamps every reply with
// the wrong request id — one less than the one it was sent (a command sent as
// id 2 is answered as id 1, and the login reply comes back as id 0). Standard
// clients match a reply to its request by id, so against Conan every command
// "times out" even though the server did exactly what it was asked. That's why
// Stop, save and broadcast all failed on it.
//
// This client sends one command at a time and takes the next reply as the answer
// to it, which is all Conan's behaviour allows and all these callers need.
// ---------------------------------------------------------------------------

const repliesOutOfStep = (server) => server.type === "conan";

const AUTH = 3;
const EXEC = 2;

function encode(id, type, body) {
	const text = Buffer.from(body, "utf8");
	const buf = Buffer.alloc(14 + text.length);
	buf.writeInt32LE(10 + text.length, 0);
	buf.writeInt32LE(id, 4);
	buf.writeInt32LE(type, 8);
	text.copy(buf, 12);
	return buf;
}

class SequentialRcon {
	constructor({ host, port, password }) {
		this.host = host;
		this.port = port;
		this.password = password;
		this.nextId = 1;
		this.buffer = Buffer.alloc(0);
		this.waiting = null; // { resolve, reject }
		this.closed = false;
	}

	connect() {
		return new Promise((resolve, reject) => {
			this.socket = net.connect(this.port, this.host);
			this.socket.on("data", (chunk) => this.#onData(chunk));
			this.socket.on("error", (err) => {
				console.warn(`RCON error:`, err.message);
				this.#settle(null, err);
			});
			this.socket.on("close", () => {
				this.closed = true;
				// A server that closes the connection while a command is pending has
				// usually done what it was told — "Shutdown" ends the process rather
				// than answering — so that counts as an empty reply.
				this.#settle("");
			});
			this.socket.once("error", reject);
			this.socket.once("connect", async () => {
				this.socket.off("error", reject);
				try {
					const reply = await this.#request(AUTH, this.password);
					// A wrong password is answered with id -1 and no "Authenticated".
					if (reply.id === -1) throw new Error("RCON authentication failed (wrong password)");
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	}

	async send(command) {
		return (await this.#request(EXEC, command)).body;
	}

	#request(type, body) {
		return new Promise((resolve, reject) => {
			if (this.closed) return reject(new Error("RCON connection is closed"));
			this.waiting = { resolve, reject };
			this.socket.write(encode(this.nextId++, type, body));
		});
	}

	#onData(chunk) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		while (this.buffer.length >= 4) {
			const length = this.buffer.readInt32LE(0);
			if (this.buffer.length < 4 + length) break;
			const id = this.buffer.readInt32LE(4);
			const body = this.buffer.subarray(12, 4 + length - 2).toString("utf8");
			this.buffer = this.buffer.subarray(4 + length);
			this.#settle({ id, body });
		}
	}

	#settle(value, error) {
		const waiting = this.waiting;
		if (!waiting) return;
		this.waiting = null;
		if (error) return waiting.reject(error);
		waiting.resolve(typeof value === "string" ? { id: 0, body: value } : value);
	}

	end() {
		try {
			this.socket?.destroy();
		} catch {
			// Already gone.
		}
	}
}

async function withSequentialRcon(server, fn, timeoutMs) {
	const rcon = new SequentialRcon({ host: server.host, port: server.rconPort, password: server.rconPassword });
	try {
		await withTimeout(rcon.connect(), timeoutMs, "RCON connect");
		const send = (command) => withTimeout(rcon.send(command), timeoutMs, "RCON send");
		return await fn(rcon, send);
	} finally {
		rcon.end();
	}
}
