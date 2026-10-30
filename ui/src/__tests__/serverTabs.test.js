import { describe, it, expect } from "vitest";
import { serverTabs, DEFAULT_TAB } from "../serverTabs.js";

// Which tabs of a server's page a person sees. An administrator sees them all. Everyone else sees the tabs their permissions reach
// on that server, and never the administrator-only ones.

const keys = (list) => list.map((t) => t.key);

describe("serverTabs", () => {
	it("shows every tab to an administrator, whatever the server permissions say", () => {
		expect(keys(serverTabs(true, () => false))).toEqual(["overview", "settings", "players", "backups", "schedules", "logs", "network", "mods", "activity", "automation", "advanced"]);
	});

	it("shows a moderator's permissions as the same tabs it saw before", () => {
		const moderator = new Set(["server.control", "server.console", "server.update", "server.backup", "server.logs", "server.players", "players.kick", "players.ban", "activity.view", "schedules.view", "metrics.view"]);
		expect(keys(serverTabs(false, (p) => moderator.has(p)))).toEqual(["overview", "players", "backups", "schedules", "logs", "network", "activity"]);
	});

	it("never shows admin-only tabs to someone who is not an administrator", () => {
		const everything = keys(serverTabs(false, () => true));
		for (const key of ["settings", "mods", "automation", "advanced"]) expect(everything).not.toContain(key);
	});

	it("gives a guest with no permissions no tabs", () => {
		expect(serverTabs(false, () => false)).toEqual([]);
	});

	it("shows a custom role only the tabs its permissions reach", () => {
		const helper = new Set(["server.logs", "activity.view"]);
		expect(keys(serverTabs(false, (p) => helper.has(p)))).toEqual(["logs", "activity"]);
	});

	it("asks for each tab's own permission, using the route names", () => {
		const asked = [];
		serverTabs(false, (p) => {
			asked.push(p);
			return false;
		});
		expect(asked).toEqual(["server.control", "server.players", "server.backup", "schedules.view", "server.logs", "server.control", "activity.view"]);
	});

	it("keeps the overview as the default tab", () => {
		expect(DEFAULT_TAB).toBe("overview");
	});
});
