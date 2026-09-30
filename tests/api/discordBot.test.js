import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";
import { startFakeDiscord } from "../helpers/fakeDiscord.js";

// The Discord bot against a stand-in Discord: it connects and says who it is, registers
// its slash commands, answers the viewing commands for anyone in the Discord server,
// changes servers only for the admin role, ignores other Discord servers and private
// messages, never pings anyone, gives up on a bad token instead of hammering Discord, and
// reconnects when the connection drops.

async function until(check, { timeoutMs = 30_000, everyMs = 200 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("Discord bot", () => {
	let discord;
	let panel;
	let api;
	let folder;

	const ADMIN_ROLE = "777";
	const member = (roles = []) => ({ user: { username: "Pat", id: "5" }, roles, permissions: "0" });
	const command = (name, options = {}, who = member()) => ({ type: 2, data: { name, options: Object.entries(options).map(([n, value]) => ({ name: n, type: 3, value })) }, member: who });
	const ask = async (name, options, who) => (await discord.interact(command(name, options, who))).data;
	const state = async () => (await api.get("/api/settings/discord-bot")).json;
	const online = async () => (await api.get("/api/status")).json["Fake Conan"]?.online === true;
	const idle = async () => !(await api.get("/api/operations")).json["Fake Conan"];

	before(async () => {
		discord = await startFakeDiscord({ token: "bot-token", applicationId: "111", guildId: "222" });
		const rconPort = await freePort();
		panel = await startInstance({
			env: { GHP_DISCORD_API: discord.api, GHP_DISCORD_GATEWAY: discord.gateway },
			servers: (dir) => {
				folder = path.join(dir, "fake-conan");
				return [makeFakeGame(folder, { name: "Fake Conan", rconPort, exe: "gp-fake-dcbot.exe" })];
			},
		});
		api = panel.api;
		fs.writeFileSync(path.join(folder, "players.txt"), "Steve\nAlex\n");
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
		await discord.stop();
	});

	it("is off until it is turned on", async () => {
		assert.equal((await state()).status, "off");
		assert.equal(discord.connected(), false);
	});

	it("says what is still needed instead of half-connecting", async () => {
		await api.put("/api/settings", { discord: { botEnabled: true } });
		const s = await state();
		assert.equal(s.status, "error");
		assert.match(s.detail, /bot token.*application ID.*guild\) ID/);
		assert.equal(discord.connected(), false);
	});

	it("keeps the token out of the settings it shows", async () => {
		await api.put("/api/settings/secrets", { discordBotToken: "bot-token" });
		const all = JSON.stringify((await api.get("/api/settings")).json);
		assert.equal(all.includes("bot-token"), false);
		assert.equal((await api.get("/api/settings")).json.secrets.discordBotToken, true);
	});

	it("connects, says who it is, and registers its commands in the one Discord server", async () => {
		await api.put("/api/settings", { discord: { botEnabled: true, botApplicationId: "111", botGuildId: "222" } });
		assert.equal(await until(async () => (await state()).status === "online"), true, JSON.stringify(await state()));
		assert.equal((await state()).user, "GodlyBot");
		assert.equal(await until(async () => (await state()).registered === true), true);
		const names = discord.registered[0].map((c) => c.name).sort();
		assert.deepEqual(names, ["backup", "players", "restart", "say", "servers", "start", "status", "stop"]);
		assert.ok(discord.registered[0].filter((c) => c.options).every((c) => c.options[0].autocomplete === true || c.name === "servers"));
	});

	describe("looking", () => {
		it("lists the servers", async () => {
			const d = await ask("servers");
			assert.match(d.content, /⚫ \*\*Fake Conan\*\* is offline/);
			assert.deepEqual(d.allowed_mentions, { parse: [] }, "never pings anyone");
		});

		it("suggests server names as you type", async () => {
			const r = (await discord.interact({ type: 4, data: { name: "status", options: [{ name: "server", type: 3, value: "conA", focused: true }] }, member: member() })).data;
			assert.deepEqual(r.choices, [{ name: "Fake Conan", value: "Fake Conan" }]);
			const none = (await discord.interact({ type: 4, data: { name: "status", options: [{ name: "server", type: 3, value: "zzz", focused: true }] }, member: member() })).data;
			assert.deepEqual(none.choices, []);
		});

		it("says when it can't find a server, privately", async () => {
			const d = await ask("status", { server: "Nope" });
			assert.match(d.content, /couldn't find a server called "Nope"/);
			assert.equal(d.flags, 64);
		});

		it("finds a server by a part of its name, but not when that is ambiguous", async () => {
			assert.match((await ask("status", { server: "conan" })).content, /Fake Conan/);
		});

		it("reports offline status and players", async () => {
			assert.match((await ask("status", { server: "Fake Conan" })).content, /is offline/);
			assert.match((await ask("players", { server: "Fake Conan" })).content, /is offline/);
		});
	});

	describe("changing things", () => {
		it("is refused for everyone while no admin role is chosen", async () => {
			const d = await ask("start", { server: "Fake Conan" }, member([ADMIN_ROLE]));
			assert.match(d.content, /off: choose an admin role/);
			assert.equal(d.flags, 64);
			assert.equal(await online(), false);
		});

		it("is refused for someone without the role", async () => {
			await api.put("/api/settings", { discord: { adminRoleId: ADMIN_ROLE } });
			const d = await ask("start", { server: "Fake Conan" }, member(["1", "2"]));
			assert.match(d.content, /need the admin role/);
			assert.equal(await online(), false);
			const admin = { ...member([]), permissions: "8" };
			assert.match((await ask("stop", { server: "Fake Conan" }, admin)).content, /need the admin role/, "Discord's own Administrator permission isn't enough");
		});

		it("starts a server for the admin role, and shows it online", async () => {
			const d = await ask("start", { server: "Fake Conan" }, member([ADMIN_ROLE]));
			assert.match(d.content, /Starting \*\*Fake Conan\*\*/);
			assert.equal(await until(online), true);
			await until(idle);
			assert.match((await ask("servers")).content, /🟢 \*\*Fake Conan\*\* is online · 2 players/);
			assert.match((await ask("players", { server: "Fake Conan" })).content, /Fake Conan\*\* \(2\): `Steve`, `Alex`/);
			assert.match((await api.get("/api/activity")).json.find((e) => e.type === "discord.command").message, /Pat used \/start on Fake Conan from Discord/);
		});

		it("says something in the game's chat, with the speaker's name, and no line breaks", async () => {
			const d = await ask("say", { server: "Fake Conan", message: "restart in 5\nminutes @everyone" }, member([ADMIN_ROLE]));
			assert.match(d.content, /Sent to \*\*Fake Conan\*\*/);
			assert.match(gameLog(folder), /rcon: broadcast \[Discord\] Pat: restart in 5 minutes @everyone/);
			assert.doesNotMatch(gameLog(folder), /rcon: minutes/);
		});

		it("backs it up", async () => {
			const d = await ask("backup", { server: "Fake Conan" }, member([ADMIN_ROLE]));
			assert.match(d.content, /Backing up/);
			await until(idle);
			const backups = (await api.get("/api/server/Fake%20Conan/backups")).json.backups;
			assert.equal(backups.length, 1);
			assert.match(backups[0].reason, /Asked for on Discord by Pat/);
		});

		it("restarts it, and refuses a second command while one is under way", async () => {
			const d = await ask("restart", { server: "Fake Conan" }, member([ADMIN_ROLE]));
			assert.match(d.content, /Restarting/);
			const busy = await ask("stop", { server: "Fake Conan" }, member([ADMIN_ROLE]));
			assert.match(busy.content, /restarting|busy|already/i);
			assert.equal(busy.flags, 64);
			assert.equal(await until(async () => (await idle()) && (await online()), { timeoutMs: 90_000 }), true);
		});

		it("stops it", async () => {
			assert.match((await ask("stop", { server: "Fake Conan" }, member([ADMIN_ROLE]))).content, /Stopping/);
			assert.equal(await until(async () => (await idle()) && !(await online()), { timeoutMs: 60_000 }), true);
		});
	});

	describe("where it answers", () => {
		it("ignores other Discord servers and private messages", async () => {
			const other = (await discord.interact({ ...command("servers"), guild_id: "999" })).data;
			assert.match(other.content, /only works in the Discord server it was set up for/);
			const dm = (await discord.interact({ ...command("servers"), guild_id: undefined })).data;
			assert.match(dm.content, /only works in the Discord server/);
		});
	});

	describe("the connection", () => {
		it("reconnects by itself after being dropped", async () => {
			const before = discord.identifies;
			discord.dropConnections();
			assert.equal(await until(async () => discord.identifies > before && discord.connected(), { timeoutMs: 20_000 }), true);
			assert.equal((await state()).status, "online");
			assert.match((await ask("servers")).content, /Fake Conan/);
		});

		it("stops when turned off", async () => {
			await api.put("/api/settings", { discord: { botEnabled: false } });
			assert.equal(await until(async () => !discord.connected()), true);
			assert.equal((await state()).status, "off");
		});

		it("gives up on a token Discord rejects, and says so, rather than retrying forever", async () => {
			await api.put("/api/settings/secrets", { discordBotToken: "wrong-token" });
			const before = discord.identifies;
			await api.put("/api/settings", { discord: { botEnabled: true } });
			assert.equal(await until(async () => (await state()).status === "error"), true, JSON.stringify(await state()));
			assert.match((await state()).detail, /rejected the token/);
			await sleep(3500);
			assert.equal(discord.identifies, before + 1, "it didn't try again");
		});
	});
});
