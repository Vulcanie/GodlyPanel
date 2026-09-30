import net from "node:net";

/**
 * What a command printed, from everything the console sent back. 7 Days to Die's Telnet
 * prints a welcome banner, then its own log lines all the time, with the command's answer
 * among them after a line "Executing command '<cmd>' by Telnet". Only that answer is
 * wanted: log lines (they start with a timestamp) and the stack-trace lines some of them
 * carry are left out. Seen on a real server.
 */
export function cleanTelnetOutput(text, command) {
	const lines = String(text).split(/\r?\n/);
	const at = lines.findIndex((l) => l.includes(`Executing command '${command}'`));
	if (at === -1) return "";
	const answer = [];
	for (const line of lines.slice(at + 1)) {
		if (/^\d{4}-\d{2}-\d{2}T/.test(line)) continue;
		if (/^From: /.test(line) || /^[A-Za-z_.`0-9]+:[A-Za-z_<>0-9.`]+ \(/.test(line)) continue;
		if (line.trim() === "") continue;
		answer.push(line.trimEnd());
	}
	return answer.join("\n");
}

/**
 * Send one console command over a plain Telnet connection (7 Days to Die's admin console)
 * and return everything it printed in the next couple of seconds (see cleanTelnetOutput for
 * picking the answer out). A console that keeps printing its own log never goes quiet, so the
 * connection is closed a fixed time after the command, not when the output stops. A password
 * prompt is answered when one is given.
 */
export function sendTelnetCommand(server, command, { maxMs = 8000, afterSendMs = 2500, password = server.telnetPassword } = {}) {
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
			if (!sent || quietTimer) return;
			quietTimer = setTimeout(() => finish(), afterSendMs);
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
