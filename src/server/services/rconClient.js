import { Rcon } from "rcon-client";
import { withTimeout } from "../util/async.js";

/**
 * Run `fn(rcon)` against a server's RCON port and always clean up afterwards.
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
