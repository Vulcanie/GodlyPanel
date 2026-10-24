import { describe, it, expect } from "vitest";
import game from "../catalog/games/warfork.js";
import server from "../../../src/server/data/games/warfork.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. Warfork has no settings file the panel can
// read and no verified launch argument, so the checks are on its shape, its guide and the launch line the server module writes.

describe("Warfork module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("warfork");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Warfork");
		expect(server.launchOptions).toBe(false);
		expect(game.guide.name).toBe("Warfork");
	});

	it("offers no settings file and no launch form, since the shipped file's console lines have no parser", () => {
		expect(game.files).toEqual({});
		expect(game.launch).toBeNull();
	});

	it("explains the launch-line name and ports, the hand-edited settings, the home folder and the stop", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/44400/);
		expect(notes).toMatch(/sv_http_port/);
		expect(notes).toMatch(/dedicated_autoexec\.cfg/);
		expect(notes).toMatch(/fs_usehomedir/);
		expect(notes).toMatch(/15 seconds/);
	});
});

describe("Warfork guide", () => {
	it("names the program and the shipped settings file", () => {
		expect(game.guide.summary).toMatch(/wf_server_x64\.exe/);
		expect(game.guide.summary).toMatch(/dedicated_autoexec\.cfg/);
	});
});
