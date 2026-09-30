import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanTelnetOutput } from "../../src/server/services/telnetClient.js";

// Transcripts captured from a real 7 Days to Die server (V 3.2.0): the console prints a
// banner, then its own log lines between and around a command's answer.

const BANNER =
	"*** Connected with 7DTD server.\r\n*** Server version: V 3.2.0 (b10) Compatibility Version: V 3.2.0\r\n*** Dedicated server only build\r\n\r\nServer IP:   50.82.40.142\r\nServer port: 8892\r\nMax players: 8\r\nGame mode:   GameModeSurvival\r\nWorld:       Navezgane\r\nGame name:   World\r\nDifficulty:  1\r\n\r\nPress 'help' to get a list of all commands. Press 'exit' to end session.\r\n\r\n";

describe("reading a 7 Days to Die Telnet answer", () => {
	it("picks out the answer to a command that failed", () => {
		const raw = `${BANNER}2026-09-30T17:49:28 38.491 INF [NM] DataReceived: bad!\r\n2026-09-30T17:49:29 39.592 INF Executing command 'kick GpNobody' by Telnet from 127.0.0.1:65289\r\n"GpNobody" is not a valid entity id, player name or user id.\r\n2026-09-30T17:49:30 40.908 INF [NM] DataReceived: bad!\r\n`;
		assert.equal(cleanTelnetOutput(raw, "kick GpNobody"), '"GpNobody" is not a valid entity id, player name or user id.');
	});

	it("keeps a multi-line answer", () => {
		const raw = `${BANNER}2026-09-30T17:49:41 51.592 INF Executing command 'ban list' by Telnet from 127.0.0.1:65348\r\nBan list entries:\r\n  Banned until - UserID (name) - Reason\r\n2026-09-30T17:49:42 53.001 INF [NM] DataReceived: bad!\r\n`;
		assert.equal(cleanTelnetOutput(raw, "ban list"), "Ban list entries:\n  Banned until - UserID (name) - Reason");
	});

	it("leaves out the stack trace a failing command writes to the log", () => {
		const raw = `${BANNER}2026-09-30T17:49:47 57.592 INF Executing command 'ban remove GpNobody' by Telnet from 127.0.0.1:65379\r\n2026-09-30T17:49:47 57.593 ERR Missing separator '_' in string: GpNobody\nFrom: UnityEngine.StackTraceUtility:ExtractStackTrace ()\nPlatformUserIdentifierAbs:FromCombinedString (string,bool)\nConsoleHelper:ParseParamUserId (string)\nConsoleCmdBan:ExecuteRemove (System.Collections.Generic.List\`1<string>)\nSdtdConsole:Update ()\n\r\n"GpNobody" is not a valid user id.\r\n2026-09-30T17:49:50 60.812 INF [NM] DataReceived: bad!\r\n`;
		assert.equal(cleanTelnetOutput(raw, "ban remove GpNobody"), '"GpNobody" is not a valid user id.');
	});

	it("gives nothing for a command that prints nothing itself, and for one it never saw", () => {
		const raw = `${BANNER}2026-09-30T17:50:35 105.644 INF Executing command 'say hello' by Telnet from 127.0.0.1:49198\r\n2026-09-30T17:50:35 105.649 INF Chat (from '-non-player-', entity id '-1', to 'Global'): hello\r\n`;
		assert.equal(cleanTelnetOutput(raw, "say hello"), "");
		assert.equal(cleanTelnetOutput(BANNER, "say hello"), "");
		assert.equal(cleanTelnetOutput("", "x"), "");
	});

	it("doesn't mistake the welcome banner for an answer", () => {
		const raw = `${BANNER}2026-09-30T17:50:29 99.644 INF Executing command 'listplayers' by Telnet from 127.0.0.1:49190\r\nTotal of 0 in the game\r\n`;
		const out = cleanTelnetOutput(raw, "listplayers");
		assert.equal(out, "Total of 0 in the game");
		assert.doesNotMatch(out, /Connected|Server IP|invalid/);
	});
});
