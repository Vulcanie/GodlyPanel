import net from "net";

export function checkPort(host, port, timeout = 1500) {
	return new Promise((resolve) => {
		const socket = new net.Socket();

		const done = (result) => {
			socket.destroy();
			resolve(result);
		};

		socket.setTimeout(timeout);

		socket.once("connect", () => done(true));
		socket.once("timeout", () => done(false));
		socket.once("error", () => done(false));

		socket.connect(port, host);
	});
}
