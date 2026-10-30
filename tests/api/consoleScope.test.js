import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { serverEntry, GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The console's command scope at the RCON route, through real sign-ins against an in-process panel. The game is a small RCON
// stand-in in this process that records every command it is sent, so "refused" can be told from "never sent".
// The role and account stores are imported inside `before`, after startInProcess has set the data folder.

const PASSWORD = "ConsoleScope!2345";
const RCON_PASSWORD = "rcon-pass";

// Source RCON packets: length, id, type, body, two zero bytes. Just enough for the panel's client.
function packet(id, type, body) {
	const text = Buffer.from(body, "utf8");
	const out = Buffer.alloc(14 + text.length);
	out.writeInt32LE(10 + text.length, 0);
	out.writeInt32LE(id, 4);
	out.writeInt32LE(type, 8);
	text.copy(out, 12);
	return out;
}

// A stand-in game console. `received` holds every command text it was sent, in order.
function startRconStub() {
	const received = [];
	const server = net.createServer((socket) => {
		let pending = Buffer.alloc(0);
		socket.on("error", () => {});
		socket.on("data", (chunk) => {
			pending = Buffer.concat([pending, chunk]);
			while (pending.length >= 4) {
				const length = pending.readInt32LE(0);
				if (pending.length < 4 + length) break;
				const id = pending.readInt32LE(4);
				const type = pending.readInt32LE(8);
				const body = pending.subarray(12, 4 + length - 2).toString("utf8");
				pending = pending.subarray(4 + length);
				if (type === 3) {
					// Login: echo the id when the password matches, -1 when not.
					socket.write(packet(body === RCON_PASSWORD ? id : -1, 2, ""));
				} else {
					received.push(body);
					socket.write(packet(id, 0, "ok"));
				}
			}
		});
	});
	return new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve({ port: server.address().port, received, close: () => new Promise((r) => server.close(r)) }));
	});
}

describe("the console's command scope at the route", () => {
	let panel;
	let api;
	let stub;
	let adminCookie;
	let guestCookie;
	let moderatorCookie;
	let listOnlyCookie; // custom role: server.console, allowed "list" only
	let anyCookie; // custom role: server.console, scope all
	const sent = (text) => stub.received.includes(text);

	const rcon = (cookie, command) => api.post("/api/control/Alpha/rcon", { command }, { cookie });

	before(async () => {
		stub = await startRconStub();
		panel = await startInProcess({
			servers: (dir) => [serverEntry(dir, { name: "Alpha", type: "custom", rconPort: stub.port, rconPassword: RCON_PASSWORD })],
		});
		api = panel.api;
		adminCookie = api.cookie;
		guestCookie = await api.cookieFor(GUEST);
		await api.post("/api/users", { username: "modconsole", password: PASSWORD, role: "moderator" });
		moderatorCookie = await api.cookieFor({ username: "modconsole", password: PASSWORD });

		const roleStore = await import("../../src/server/data/roleStore.js");
		const userStore = await import("../../src/server/data/userStore.js");
		const account = async (username, role) => {
			await userStore.createUser({ username, password: PASSWORD, role });
			return api.cookieFor({ username, password: PASSWORD });
		};
		const listOnly = await roleStore.create({ name: "List only", permissions: ["server.console"], commandScope: { mode: "allow", patterns: ["list"] } });
		const anything = await roleStore.create({ name: "Anything", permissions: ["server.console"], commandScope: { mode: "all", patterns: [] } });
		listOnlyCookie = await account("listonly", listOnly.id);
		anyCookie = await account("anyconsole", anything.id);
	});

	after(async () => {
		await panel.stop();
		await stub.close();
	});

	it("a command the role's list allows reaches the game", async () => {
		const r = await rcon(listOnlyCookie, "list");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.success, true);
		assert.ok(sent("list"), "the stand-in received the command");
	});

	it("a command outside the list is refused, and never sent", async () => {
		const r = await rcon(listOnlyCookie, "stop");
		assert.equal(r.status, 403);
		assert.equal(r.json.code, "command_denied");
		assert.ok(!sent("stop"));
	});

	it("two commands in one line are refused, and neither is sent", async () => {
		const r = await rcon(listOnlyCookie, "list\nstop");
		assert.equal(r.status, 403);
		assert.equal(r.json.code, "command_denied");
		assert.ok(!sent("list\nstop"));
		assert.ok(!sent("stop"));
	});

	it("a refused command leaves a console.denied entry with the command name but not its arguments", async () => {
		const r = await rcon(listOnlyCookie, "say hunter2 is my password");
		assert.equal(r.status, 403);
		const entries = (await api.get("/api/activity?limit=500")).json.filter((e) => e.type === "console.denied");
		const entry = entries.find((e) => e.message.includes('"say"'));
		assert.ok(entry, "an entry names the command");
		assert.match(entry.message, /listonly/, "it names who tried");
		assert.match(entry.message, /Alpha/, "it names the server");
		assert.ok(!entry.message.includes("hunter2"), "the arguments are not in the message");
		assert.ok(!JSON.stringify(entry).includes("hunter2"), "the arguments are not anywhere in the entry");
	});

	it("a role with scope 'all' still sends anything, a second line included", async () => {
		assert.equal((await rcon(anyCookie, "stop")).status, 200);
		assert.equal((await rcon(anyCookie, "list\nsave")).status, 200);
		assert.ok(sent("stop"));
	});

	it("a moderator, a built-in role, is unaffected", async () => {
		assert.equal((await rcon(moderatorCookie, "stop")).status, 200);
	});

	it("an admin is unaffected", async () => {
		assert.equal((await rcon(adminCookie, "list")).status, 200);
	});

	it("a viewer without the console permission is still refused as forbidden", async () => {
		const r = await rcon(guestCookie, "list");
		assert.equal(r.status, 403);
		assert.equal(r.json.code, "forbidden");
	});

	it("an empty or blank command is a 400", async () => {
		assert.equal((await rcon(adminCookie, "")).status, 400);
		const blank = await rcon(listOnlyCookie, "   ");
		assert.equal(blank.status, 400);
	});

	it("GET /api/roles lists the command presets", async () => {
		const r = await api.get("/api/roles", { cookie: adminCookie });
		assert.equal(r.status, 200);
		assert.deepEqual(r.json.commandPresets.map((p) => p.id), ["read-only", "moderation", "no-destructive"]);
	});
});
