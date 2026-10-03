import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";

// "No window" mode hands the game's command line to a hidden cmd, which must pass it on exactly as written.
// Text where cmd would read something different goes the other way (a direct launch).

describe("command lines that cmd passes on unchanged", () => {
	it("accepts the ordinary game command lines, quoted values included", () => {
		for (const ok of [
			"",
			"-log -Port=8892 -QueryPort=8894",
			'-ServerName="My Server" -Password=abc123',
			'Map?SessionName="A & B"?Port=1 -server',
			'-ClusterDirOverride="C:\Users\me\Desktop\Cluster Data" -NoBattlEye',
			'-adminpassword "pa|ss^word" -x',
			"?listen?SessionName=Name?ServerPassword=x",
		]) assert.equal(cmdSafe(ok), true, ok);
	});

	it("refuses what cmd would act on itself", () => {
		for (const bad of [
			"-log & calc",
			"-a | more",
			"-a > out.txt",
			"-a < in.txt",
			"-pw=ab^cd",
			"-path=%USERPROFILE%",
			'-Name="100%"',
			'-Name="unbalanced -x',
			'-Name="ok" & echo hi',
			"-a\n-b",
		]) assert.equal(cmdSafe(bad), false, JSON.stringify(bad));
	});
});
