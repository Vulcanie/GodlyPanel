import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MOTD_ADAPTERS } from "../../src/server/services/motdService.js";

// Reading and changing the message of the day in each game's own file format, leaving
// everything else in the file exactly as it was.

describe("Minecraft: server.properties", () => {
	const { get, set } = MOTD_ADAPTERS["minecraft-modpack"];
	const file = "#Minecraft server properties\r\nserver-port=25565\r\nmotd=A Minecraft Server\r\npvp=true\r\n";

	it("reads it", () => assert.equal(get(file), "A Minecraft Server"));

	it("changes only that line, keeping the line endings", () => {
		assert.equal(set(file, "Welcome!"), "#Minecraft server properties\r\nserver-port=25565\r\nmotd=Welcome!\r\npvp=true\r\n");
	});

	it("escapes line breaks and non-ASCII the way the file needs, and reads them back", () => {
		const out = set(file, "Line one\nCafé ☕");
		assert.match(out, /motd=Line one\\nCaf\\u00e9 \\u2615\r\n/);
		assert.equal(get(out), "Line one\nCafé ☕");
	});

	it("adds the line when there isn't one", () => {
		assert.equal(set("pvp=true\n", "Hi"), "pvp=true\nmotd=Hi\n");
		assert.equal(get("pvp=true\n"), "");
	});

	it("isn't fooled by a setting with motd in its name", () => {
		assert.equal(set("xmotd=keep\nmotd=old\n", "new"), "xmotd=keep\nmotd=new\n");
	});
});

describe("ARK: the [MessageOfTheDay] section of GameUserSettings.ini", () => {
	const { get, set } = MOTD_ADAPTERS["ark-ase"];
	const file = "[ServerSettings]\r\nMessage=not this one\r\nDifficultyOffset=1\r\n\r\n[MessageOfTheDay]\r\nMessage=Old message\r\nDuration=20\r\n\r\n[Other]\r\nMessage=nor this\r\n";

	it("reads the one in its own section", () => assert.equal(get(file), "Old message"));

	it("changes that one and no other", () => {
		const out = set(file, "New message");
		assert.equal(get(out), "New message");
		assert.match(out, /\[ServerSettings\]\r\nMessage=not this one/);
		assert.match(out, /\[Other\]\r\nMessage=nor this/);
		assert.match(out, /Duration=20/);
	});

	it("adds the section when it isn't there, and a line when the section has none", () => {
		const added = set("[ServerSettings]\r\nX=1\r\n", "Hello");
		assert.match(added, /\[MessageOfTheDay\]\r\nMessage=Hello\r\nDuration=20/);
		assert.equal(get(added), "Hello");
		const inserted = set("[MessageOfTheDay]\r\nDuration=30\r\n[Z]\r\n", "Hey");
		assert.equal(get(inserted), "Hey");
		assert.match(inserted, /Duration=30/);
	});
});

describe("Palworld: ServerDescription inside OptionSettings", () => {
	const { get, set } = MOTD_ADAPTERS.palworld;
	const file = '[/Script/Pal.PalGameWorldSettings]\nOptionSettings=(Difficulty=None,ServerName="Mine",ServerDescription="Old \\"quoted\\" text",AdminPassword="x",PublicPort=8211)\n';

	it("reads it, with quotes", () => assert.equal(get(file), 'Old "quoted" text'));

	it("changes only that setting, escaping quotes", () => {
		const out = set(file, 'Say "hi"');
		assert.equal(get(out), 'Say "hi"');
		assert.match(out, /ServerName="Mine"/);
		assert.match(out, /AdminPassword="x",PublicPort=8211\)/);
	});

	it("leaves a file without the setting alone", () => assert.equal(set("OptionSettings=(Difficulty=None)", "x"), "OptionSettings=(Difficulty=None)"));
});

describe("7 Days to Die: the ServerDescription property", () => {
	const { get, set } = MOTD_ADAPTERS["7days"];
	const file = '<?xml version="1.0"?>\r\n<ServerSettings>\r\n\t<property name="ServerName" value="Mine"/>\r\n\t<property name="ServerDescription" value="Old &amp; tired"/>\r\n</ServerSettings>\r\n';

	it("reads it, unescaped", () => assert.equal(get(file), "Old & tired"));

	it("changes it, escaping what XML needs, and nothing else", () => {
		const out = set(file, 'Tom & "Jerry" <3');
		assert.equal(get(out), 'Tom & "Jerry" <3');
		assert.match(out, /ServerName" value="Mine"/);
	});

	it("adds the property when it isn't there", () => {
		const out = set('<ServerSettings>\r\n\t<property name="A" value="1"/>\r\n</ServerSettings>', "Hi");
		assert.equal(get(out), "Hi");
		assert.match(out, /name="A" value="1"/);
	});
});
