import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, FIELD_SPECS, coerceConfig } from "../../src/server/config/configSchema.js";

// The settings file is edited by hand and by the settings page. It's clamped and
// repaired rather than rejected, so a typo can't stop the panel from starting.

const valueAt = (obj, dotted) => dotted.split(".").reduce((o, k) => o?.[k], obj);

describe("config coercion", () => {
	it("fills every missing setting from the defaults", () => {
		const { config, issues } = coerceConfig(null);
		assert.deepEqual(issues, []);
		for (const spec of FIELD_SPECS) {
			assert.notEqual(valueAt(config, spec.path), undefined, `${spec.path} has a default`);
		}
	});

	it("keeps valid values and merges partial sections", () => {
		const { config } = coerceConfig({ http: { port: 9000 }, network: { allowCgnat: false } });
		assert.equal(config.http.port, 9000);
		assert.equal(config.http.bindAll, DEFAULTS.http.bindAll, "the rest of the section keeps its default");
		assert.equal(config.network.allowCgnat, false);
	});

	it("clamps a number outside its limits instead of refusing", () => {
		const high = coerceConfig({ http: { port: 99999 } });
		assert.equal(high.config.http.port, 65535);
		assert.ok(high.issues.some((i) => /http\.port/.test(i)), "and says so");

		const low = coerceConfig({ http: { port: 80 } });
		assert.equal(low.config.http.port, 1024);
	});

	it("falls back to the default for the wrong type", () => {
		const { config } = coerceConfig({ http: { port: "not a number" }, network: { allowCgnat: "yes" } });
		assert.equal(config.http.port, DEFAULTS.http.port);
		assert.equal(typeof config.network.allowCgnat, "boolean");
	});

	it("falls back for an enum value that isn't one of the choices", () => {
		const { config, issues } = coerceConfig({ servers: { defaultWindowMode: "rainbow" } });
		assert.equal(config.servers.defaultWindowMode, DEFAULTS.servers.defaultWindowMode);
		assert.ok(issues.length > 0);
	});

	it("every setting the form generates has a label and a valid type", () => {
		const types = new Set(["int", "bool", "string", "enum", "intArray", "stringArray"]);
		for (const spec of FIELD_SPECS) {
			assert.ok(spec.label, `${spec.path} needs a label`);
			assert.ok(types.has(spec.type), `${spec.path} has type ${spec.type}`);
			if (spec.type === "enum") assert.ok(spec.values?.length > 1, `${spec.path} lists its choices`);
			if (spec.type === "int") assert.ok(spec.min === undefined || spec.max === undefined || spec.min <= spec.max);
		}
	});

	it("the default window mode is one of its own choices", () => {
		const spec = FIELD_SPECS.find((s) => s.path === "servers.defaultWindowMode");
		assert.ok(spec.values.includes(DEFAULTS.servers.defaultWindowMode));
	});
});
