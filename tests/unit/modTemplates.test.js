import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MOD_TEMPLATES, MOD_ADAPTERS, validateModBlock, collectModBlocks } from "../../src/server/data/modTemplates.js";
import { modSupport, modContextFor, contextFromSpec } from "../../src/server/services/modService.js";
import { KNOWN_SOURCES } from "../../src/server/services/modSources/index.js";

// The mod support each game declares: the shape of every block, the checks that refuse a bad one, the
// collection of game modules' blocks, and what modSupport reports for each game.

const folderBlock = () => ({ adapter: "folder", label: "Mods", dir: { base: "working", rel: "mods" } });

describe("MOD_TEMPLATES", () => {
	it("every entry passes validateModBlock", () => {
		for (const [id, block] of Object.entries(MOD_TEMPLATES)) {
			assert.deepEqual(validateModBlock(block, KNOWN_SOURCES), [], `${id} is invalid`);
		}
	});

	it("keeps the seven built-in keys", () => {
		for (const id of ["minecraft-modpack", "7days", "palworld", "conan", "valheim", "ark-ase", "ark-asa"]) {
			assert.ok(Object.hasOwn(MOD_TEMPLATES, id), `${id} is missing`);
		}
	});
});

describe("the mods blocks game modules declare", () => {
	// Each folder is one the game reads with no extra step, as the research vault documents it (docs/research/games/<id>/04-mods.md).
	// The base is the one each module's backup block uses for the same folder, so the folder is the one the server runs from.
	const added = [
		["garrysmod", "Add-ons", { base: "working", rel: "garrysmod/addons" }, ["archive"]],
		["l4d", "Add-ons", { base: "working", rel: "left4dead/addons" }, [".vpk"]],
		["l4d2", "Add-ons", { base: "working", rel: "left4dead2/addons" }, [".vpk"]],
		["humanitz", "Mods", { base: "working", rel: "HumanitZServer/Content/Paks/~mods" }, [".pak"]],
	];
	for (const [id, label, dir, accepts] of added) {
		it(`${id} takes its files from ${dir.rel}, with github and url as the sources`, () => {
			const block = MOD_TEMPLATES[id];
			assert.ok(block, `${id} is not in MOD_TEMPLATES`);
			assert.equal(block.adapter, "folder");
			assert.equal(block.label, label);
			assert.deepEqual(block.dir, dir);
			assert.deepEqual(block.accepts, accepts);
			assert.deepEqual(block.sources, ["github", "url"]);
		});
	}

});

describe("validateModBlock", () => {
	it("accepts a valid fixture with every optional field", () => {
		const block = {
			adapter: "thunderstore",
			label: "Mods (BepInEx)",
			dir: { base: "install", rel: "BepInEx/plugins" },
			accepts: [".dll", "archive"],
			sources: ["thunderstore", "github"],
			loader: "fabric",
			gameVersionFrom: "mcVersion",
			note: "A note.",
			appId: "1",
			community: "valheim",
			framework: { owner: "denikson", name: "BepInExPack_Valheim" },
		};
		assert.deepEqual(validateModBlock(block, KNOWN_SOURCES), []);
	});

	it("accepts a script-ids block with a flag and no dir", () => {
		assert.deepEqual(validateModBlock({ adapter: "script-ids", label: "Mods", flag: "-mods=", sources: [] }, KNOWN_SOURCES), []);
	});

	it("knows the four adapters", () => {
		assert.deepEqual(MOD_ADAPTERS, ["folder", "workshop", "thunderstore", "script-ids"]);
	});

	const bad = [
		["unknown adapter", { ...folderBlock(), adapter: "bukkit" }],
		["rel with ../", { ...folderBlock(), dir: { base: "working", rel: "../x" } }],
		["rel with a/../b", { ...folderBlock(), dir: { base: "working", rel: "a/../b" } }],
		["rel with ..\\x", { ...folderBlock(), dir: { base: "working", rel: "..\\x" } }],
		["rel absolute /abs", { ...folderBlock(), dir: { base: "working", rel: "/abs" } }],
		["rel with C:\\x", { ...folderBlock(), dir: { base: "working", rel: "C:\\x" } }],
		["rel with C:/x", { ...folderBlock(), dir: { base: "working", rel: "C:/x" } }],
		["rel empty", { ...folderBlock(), dir: { base: "working", rel: "" } }],
		["dir.base elsewhere", { ...folderBlock(), dir: { base: "elsewhere", rel: "mods" } }],
		["missing dir for folder", { adapter: "folder", label: "Mods" }],
		["script-ids without flag", { adapter: "script-ids", label: "Mods" }],
		["accepts jar without dot", { ...folderBlock(), accepts: ["jar"] }],
		["accepts with a number", { ...folderBlock(), accepts: [".jar", 5] }],
		["unknown source", { ...folderBlock(), sources: ["nope"] }],
		["duplicate sources", { ...folderBlock(), sources: ["github", "github"] }],
		["unknown loader", { ...folderBlock(), loader: "bukkit" }],
		["gameVersionFrom with ..", { ...folderBlock(), gameVersionFrom: "a..b" }],
		["unknown extra key", { ...folderBlock(), bogus: 1 }],
		["block is null", null],
		["block is a string", "folder"],
		["block is an array", []],
	];
	for (const [name, block] of bad) {
		it(`reports a problem for ${name}`, () => {
			assert.ok(validateModBlock(block, KNOWN_SOURCES).length > 0);
		});
	}

	it("skips the source membership check when no known sources are given", () => {
		assert.deepEqual(validateModBlock({ ...folderBlock(), sources: ["nope"] }), []);
	});
});

describe("collectModBlocks", () => {
	const fakeModule = (id, mods) => ({ template: { id }, mods });

	it("picks up a valid block", () => {
		const target = {};
		const block = folderBlock();
		collectModBlocks(target, [fakeModule("fake-game", block)]);
		assert.equal(target["fake-game"], block);
	});

	it("throws on a clash with an existing key, and leaves the entry alone", () => {
		const target = { conan: folderBlock() };
		assert.throws(() => collectModBlocks(target, [fakeModule("conan", folderBlock())]), /conan/);
		assert.equal(target.conan.label, "Mods");
	});

	it("throws on an invalid block, naming the template id and the problems", () => {
		assert.throws(() => collectModBlocks({}, [fakeModule("fake-game", { ...folderBlock(), adapter: "bukkit" })]), /fake-game.*adapter/);
	});

	it("ignores modules without mods", () => {
		const target = {};
		collectModBlocks(target, [{ template: { id: "plain-game" } }]);
		assert.equal(Object.hasOwn(target, "plain-game"), false);
	});
});

describe("contextFromSpec and modContextFor", () => {
	it("takes a static loader from the spec", () => {
		assert.deepEqual(contextFromSpec({ ...folderBlock(), loader: "forge" }, {}), { loader: "forge", gameVersion: undefined });
	});

	it("reads a nested gameVersionFrom from the server record", () => {
		const server = { versions: { game: "1.21.1" } };
		assert.deepEqual(contextFromSpec({ ...folderBlock(), gameVersionFrom: "versions.game" }, server), { loader: undefined, gameVersion: "1.21.1" });
	});

	it("gives undefined for a missing or empty value", () => {
		assert.deepEqual(contextFromSpec({ ...folderBlock(), gameVersionFrom: "versions.game" }, { versions: {} }), { loader: undefined, gameVersion: undefined });
		assert.deepEqual(contextFromSpec({ ...folderBlock(), gameVersionFrom: "mcVersion" }, { mcVersion: "" }), { loader: undefined, gameVersion: undefined });
	});

	it("does not read inherited properties", () => {
		assert.deepEqual(contextFromSpec({ ...folderBlock(), gameVersionFrom: "constructor" }, {}), { loader: undefined, gameVersion: undefined });
	});

	it("returns {} when the server has no mod spec, and never throws", () => {
		assert.deepEqual(modContextFor({ type: "enshrouded" }), {});
		assert.deepEqual(modContextFor(null), {});
	});
});

describe("modSupport", () => {
	// Palworld's template type is spelled "Palword" in gameTemplates.js, so its fake record uses that.
	const cases = [
		[
			"minecraft-modpack",
			{ type: "minecraft" },
			{
				supported: true,
				adapter: "folder",
				label: "Mods",
				note: "Drop mod .jar files here. They must match the modpack's Minecraft and loader version.",
				accepts: [".jar"],
				sources: ["modrinth", "curseforge", "github", "url"],
			},
		],
		[
			"7days",
			{ type: "7days" },
			{
				supported: true,
				adapter: "folder",
				label: "Mods",
				note: "Each mod is a folder (with a ModInfo.xml) inside the Mods folder. Upload a mod's .zip.",
				accepts: ["archive"],
				sources: ["github", "url"],
			},
		],
		[
			"palworld",
			{ type: "Palword" },
			{
				supported: true,
				adapter: "folder",
				label: "Mods",
				note: "Pak mods go in the ~mods folder.",
				accepts: [".pak"],
				sources: ["github", "url"],
			},
		],
		[
			"conan",
			{ type: "conan" },
			{
				supported: true,
				adapter: "workshop",
				label: "Mods",
				note: "Add a Steam Workshop item by its number, or upload a .pak. The panel keeps modlist.txt for you.",
				accepts: [".pak"],
				appId: "440900",
				sources: ["workshop", "url"],
			},
		],
		[
			"valheim",
			{ type: "valheim" },
			{
				supported: true,
				adapter: "thunderstore",
				label: "Mods (BepInEx)",
				note: "Adds BepInEx if it isn't there, then installs mods from Thunderstore by name (Owner-Name).",
				accepts: [".dll", "archive"],
				community: "valheim",
				sources: ["thunderstore", "github", "url"],
			},
		],
		[
			"ark-ase",
			{ type: "ark", updateAppId: "376030" },
			{
				supported: true,
				adapter: "script-ids",
				label: "Mods",
				note: "Steam Workshop mod numbers, in the order they load.",
				accepts: [],
				sources: [],
			},
		],
		[
			"ark-asa",
			{ type: "ark", updateAppId: "2430930" },
			{
				supported: true,
				adapter: "script-ids",
				label: "Mods",
				note: "CurseForge mod numbers, in the order they load.",
				accepts: [],
				sources: [],
			},
		],
	];

	for (const [id, server, expected] of cases) {
		it(`reports exactly the expected support for ${id}`, () => {
			assert.deepEqual(modSupport(server), expected);
		});
	}

	it("reports unsupported for a game with no mod block", () => {
		assert.deepEqual(modSupport({ type: "enshrouded" }), { supported: false });
	});
});
