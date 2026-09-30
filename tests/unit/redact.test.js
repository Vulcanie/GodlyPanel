import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactSecrets } from "../../src/server/services/logService.js";

describe("hiding passwords in log lines", () => {
	const cases = [
		["LogInit: Command Line: -ServerPassword=hunter2 -Port=8892", "LogInit: Command Line: -ServerPassword=******** -Port=8892"],
		["-RCONPassword=swordfish -RCONPort=8895", "-RCONPassword=******** -RCONPort=8895"],
		["AdminPassword = letmein", "AdminPassword = ********"],
		['"password": "s3cret!"', '"password": "********"'],
		["rcon.password=abc123", "rcon.password=********"],
		["api_key: abcdef123456", "api_key: ********"],
		["start valheim_server.exe -name x -password bob", "start valheim_server.exe -name x -password bob"],
		["Player joined: Alice", "Player joined: Alice"],
		["No secrets here, only a port 8892 and a path C:\Games", "No secrets here, only a port 8892 and a path C:\Games"],
	];
	for (const [input, expected] of cases) {
		it(JSON.stringify(input).slice(0, 50), () => assert.equal(redactSecrets(input), expected));
	}
});
