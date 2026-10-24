import { describe, it, expect } from "vitest";
import wurmUi from "../catalog/games/wurmunlimited.js";
import wurmServer from "../../../src/server/data/games/wurmunlimited.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Wurm Unlimited's catalog, held to the rules of catalogs.test.js (it is not registered in the index yet, so the rules are repeated here):
// every setting explained and grouped, every argument explained and unique, and the launch line the server side writes is found and read.

const def = wurmUi.launch;
const ini = wurmUi.files["wurm.ini"];
const params = { name: "Test", sessionName: "Our Server", mapCode: "Creative", serverPassword: "", adminPassword: "", port: 3724, queryPort: 27020, maxPlayers: 20, instanceSlug: "test" };
const script = wurmServer.template.buildStartScript(params);
const byKey = (parsed) => Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));

describe("Wurm Unlimited module", () => {
	it("is under the type the server side records", () => {
		expect(wurmUi.type).toBe("wurmunlimited");
		expect(wurmUi.type).toBe(wurmServer.template.type);
		expect(wurmUi.title).toBe("Wurm Unlimited");
		expect(wurmUi.guide.name).toBe("Wurm Unlimited");
		expect(wurmUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers wurm.ini as the one settings file, at the path the server side records", () => {
		expect(Object.keys(wurmUi.files)).toEqual(["wurm.ini"]);
		expect(Object.keys(wurmUi.guide.files)).toEqual(["wurm.ini"]);
		const entry = wurmServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\wurm", startScriptFilename: "Start_WurmUnlimited.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(["wurm.ini"]);
		expect(ini.parser).toBe("properties");
		expect(ini.mayBeMissing).toMatch(/first start copies it in/);
	});

	it("says in the guide that there is no clean stop from the panel and that the world must exist first", () => {
		const text = wurmUi.guide.notes.join(" ");
		expect(text).toMatch(/cannot stop the server cleanly/);
		expect(text).toMatch(/Shutdown server/);
		expect(text).toMatch(/The world is made on the first start/);
		expect(text).toMatch(/Remote control is not used/);
	});
});

describe("Wurm Unlimited wurm.ini settings", () => {
	const settings = Object.entries(ini.settings);

	it("has a plain label, an explanation of more than 10 characters and a group for every setting", () => {
		expect(settings.length).toBeGreaterThan(0);
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("keys every setting by its section (root) and writes the key exactly as the research spells it", () => {
		for (const [key] of settings) {
			expect(key.startsWith("root::"), key).toBe(true);
			expect(key.slice("root::".length), key).toMatch(/^[A-Z][A-Z0-9_]*$/);
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("only names groups in groupOrder that exist, and every group is in the order", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of ini.groupOrder) expect(groups.has(g), g).toBe(true);
		for (const g of groups) expect(ini.groupOrder).toContain(g);
	});
});

describe("Wurm Unlimited launch arguments", () => {
	it("gives every argument a label, a description and a group, and every flag once", () => {
		const flags = def.args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
		for (const a of def.args) {
			expect(a.label?.trim(), a.flag).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), a.flag).toBeTruthy();
		}
	});

	it("gives each dropdown of an argument its choices once", () => {
		for (const a of def.args) {
			if (!a.options) continue;
			const values = a.options.map((o) => (Array.isArray(o) ? o[0] : o));
			expect(new Set(values).size, a.flag).toBe(values.length);
		}
	});

	it("uses the equals form (key=value, no dash) and no argument has a space in its name", () => {
		expect(def.style).toBe("equals");
		expect(def.program.test(script)).toBe(true);
		for (const a of def.args) expect(a.flag, a.flag).not.toMatch(/\s/);
	});

	it("finds the launch line the server side writes, and reads the panel's arguments from it", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		// The managed arguments (edit: false) are not offered by the form, so the reader keeps them as they are, untouched.
		const raws = parsed.items.map((it) => it.raw);
		for (const token of ["start=Creative", "externalport=3724", "queryport=27020", "maxplayers=20", 'servername="Our Server"']) {
			expect(raws, token).toContain(token);
		}
	});

	it("keeps the panel's managed arguments out of the form, and offers the optional ones", () => {
		const parsed = parseLaunchArgs(script, def);
		const keys = launchArgsEntries(parsed).map((e) => e.key);
		for (const managed of ["start", "externalport", "queryport", "maxplayers", "servername", "serverpassword", "adminpwd"]) {
			expect(keys, managed).not.toContain(managed);
		}
		expect(keys).toContain("homekingdom");
		expect(keys).toContain("pvp");
	});

	it("writes an optional argument at the end of the line, and takes it off again when cleared", () => {
		const parsed = parseLaunchArgs(script, def);
		const on = serializeLaunchArgs(parsed, { "Rules::pvp": "true" });
		expect(on.trimEnd().endsWith(" pvp=true"), on).toBe(true);
		const off = serializeLaunchArgs(parseLaunchArgs(on, def), { "Rules::pvp": "" });
		expect(off).not.toContain("pvp=");
		expect(off).toContain("servername=");
	});

	it("keeps the Launch options reader's dash word on the title line", () => {
		expect(script.split("\r\n").find((l) => l.startsWith("start ")) ?? "").toMatch(/-Wurm"/);
	});
});
