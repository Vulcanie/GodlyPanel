import dgram from "node:dgram";
import net from "node:net";

// Is something on this PC already holding a port? Tried by actually binding it, on
// both TCP and UDP (a game may use either), so a server that isn't in the panel, or
// another program entirely, is noticed too.

const tcpBusy = (port) =>
	new Promise((resolve) => {
		const s = net.createServer();
		s.once("error", (e) => resolve(e.code === "EADDRINUSE" || e.code === "EACCES"));
		s.once("listening", () => s.close(() => resolve(false)));
		s.listen(port, "0.0.0.0");
	});

const udpBusy = (port) =>
	new Promise((resolve) => {
		const s = dgram.createSocket("udp4");
		s.once("error", (e) => {
			try {
				s.close();
			} catch {
				// Already closed.
			}
			resolve(e.code === "EADDRINUSE" || e.code === "EACCES");
		});
		s.bind(port, "0.0.0.0", () => s.close(() => resolve(false)));
	});

/** True if anything is using this port right now, over TCP or UDP. */
export async function portBusy(port) {
	return (await tcpBusy(port)) || (await udpBusy(port));
}
