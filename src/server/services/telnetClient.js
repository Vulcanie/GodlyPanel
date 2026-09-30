import net from "node:net";

/**
 * Send one console command over a plain Telnet connection (7 Days to Die's admin
 * console) and return what it printed. The connection is closed once output has gone
 * quiet for `quietMs`, or after `maxMs`. A password prompt is answered when one is given.
 */
export function sendTelnetCommand(server, command, { quietMs = 1200, maxMs = 8000, password = server.telnetPassword } = {}) {
	return new Promise((resolve, reject) => {
		let output = "";
		let sent = false;
		let quietTimer = null;
		const socket = net.createConnection({ host: server.host || "127.0.0.1", port: server.telnetPort });
		const finish = (err) => {
			clearTimeout(quietTimer);
			clearTimeout(overall);
			socket.destroy();
			if (err) reject(err);
			else resolve(output);
		};
		const overall = setTimeout(() => finish(), maxMs);
		const armQuiet = () => {
			clearTimeout(quietTimer);
			if (sent) quietTimer = setTimeout(() => finish(), quietMs);
		};
		const send = () => {
			if (sent) return;
			sent = true;
			socket.write(`${command}\n`);
			armQuiet();
		};
		socket.on("data", (chunk) => {
			output += chunk.toString("utf8");
			if (!sent && /password/i.test(output) && password) socket.write(`${password}\n`);
			if (!sent && (!/password/i.test(output) || password)) setTimeout(send, 300);
			armQuiet();
		});
		socket.on("connect", () => {
			// Some servers print nothing until spoken to.
			setTimeout(send, 1500);
		});
		socket.on("error", (err) => finish(new Error(`Couldn't reach the Telnet console on port ${server.telnetPort}: ${err.code ?? err.message}`)));
		socket.on("close", () => {
			if (sent) finish();
		});
	});
}
