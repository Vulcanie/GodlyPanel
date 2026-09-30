// Installs a real Conan Exiles dedicated server into the testbed, through the panel
// (SteamCMD download, start script, config), on the ports given. Takes a while: the
// download is about 10 GB. Safe to re-run: it does nothing if the server exists.
//
//   node tests/real/install-conan.mjs
import fs from "node:fs";
import path from "node:path";
import { TESTBED, startPanel, get, post, check, summary, sleep, freeGB, dirGB } from "./lib.mjs";

const NAME = "Real Conan";
const PORTS = { port: 8892, queryPort: 8894, rconPort: 8895 }; // the community's own Conan ports

console.log(`Testbed ${TESTBED}, ${freeGB().toFixed(1)} GB free`);
const panel = await startPanel();
try {
	const existing = (await get("/api/settings/servers")).json.find((s) => s.name === NAME);
	if (existing) {
		console.log("Already installed.");
	} else {
		const started = await post("/api/servers", { templateId: "conan", name: NAME, sessionName: "GodlyTest", serverPassword: "TestJoin1", ...PORTS, acceptSteamCmdDownload: true });
		check("creating is accepted", started.status === 200, JSON.stringify(started.json));
		const jobId = started.json.jobId;
		let last = "";
		const began = Date.now();
		for (;;) {
			const job = (await get(`/api/servers/create/${jobId}`)).json;
			const line = `${job.status}${job.step ? ` — ${job.step}` : ""}`;
			if (line !== last) console.log(`[${Math.round((Date.now() - began) / 1000)}s] ${line}  (server folder ${dirGB(path.join(TESTBED, "servers")).toFixed(1)} GB)`);
			last = line;
			if (job.status === "done") break;
			if (job.status === "error") throw new Error(job.error);
			if (Date.now() - began > 90 * 60_000) throw new Error("Took over 90 minutes.");
			await sleep(15_000);
		}
		const entry = (await get("/api/settings/servers")).json.find((s) => s.name === NAME);
		check("the server is registered", Boolean(entry));
		check("its start script uses the intended ports", /-Port=8892 -QueryPort=8894/.test(fs.readFileSync(entry.startScriptPath, "utf8")));
		check("it is well inside the disk budget", dirGB(path.join(TESTBED, "servers")) < 25, `${dirGB(path.join(TESTBED, "servers")).toFixed(1)} GB`);
	}
} finally {
	await panel.stop();
}
process.exit(summary() ? 0 : 1);
