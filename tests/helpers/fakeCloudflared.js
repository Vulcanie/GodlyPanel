// A stand-in for cloudflared in tests: says what the real one says, then stays running until stopped.
// Used through GHP_CLOUDFLARED_EXE (node) and GHP_CLOUDFLARED_PREARGS (this file).
import fs from "node:fs";

const args = process.argv.slice(2);
const say = (line) => process.stderr.write(`${new Date().toISOString()} INF ${line}\n`);

if (args.includes("--version")) {
	console.log("cloudflared version 0.0.0-test");
	process.exit(0);
}

const urlIndex = args.indexOf("--url");
const configIndex = args.indexOf("--config");
if (urlIndex !== -1) {
	say("Requesting new quick Tunnel on trycloudflare.com...");
	say("+--------------------------------------------------------------------------------------------+");
	say("|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |");
	say(`|  https://fake-test-name.trycloudflare.com ${" ".repeat(10)}|`);
	say(`serving to ${args[urlIndex + 1]}`);
}
if (configIndex !== -1) {
	say(`config file: ${args[configIndex + 1]}`);
	for (const line of fs.readFileSync(args[configIndex + 1], "utf8").split(/\r?\n/)) if (line.trim()) say(`config> ${line.trim()}`);
}
say(process.env.TUNNEL_TOKEN ? `token present, ${process.env.TUNNEL_TOKEN.length} characters` : "no token in the environment");
say(`command line had a token: ${args.some((a) => a.includes("TOKEN") || a.length > 60)}`);
say("Registered tunnel connection connIndex=0 connection=abc location=test01 protocol=quic");
setInterval(() => {}, 60_000);
// If a test run is killed without stopping this, it still goes away by itself.
setTimeout(() => process.exit(0), 10 * 60_000);
process.on("SIGTERM", () => process.exit(0));
