import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { steamBranchArgs, steamModArgs } from "../../src/server/util/steamBranch.js";

describe("steamBranchArgs", () => {
	it("gives -beta <name> for a plain branch name", () => {
		assert.deepEqual(steamBranchArgs("evrima"), ["-beta", "evrima"]);
		assert.deepEqual(steamBranchArgs("spiro0.11.59.04"), ["-beta", "spiro0.11.59.04"]);
	});

	it("gives nothing for no branch or one that is not a plain name", () => {
		for (const bad of [undefined, null, "", "a b", "x;y", "evrima +quit", "../x", "a".repeat(41)]) {
			assert.deepEqual(steamBranchArgs(bad), [], String(bad));
		}
	});
});

describe("steamModArgs", () => {
	it("gives +app_set_config <app> mod <name> for a plain mod name", () => {
		assert.deepEqual(steamModArgs("90", "cstrike"), ["+app_set_config", "90", "mod", "cstrike"]);
	});

	it("gives nothing for no mod, a bad mod name or a bad app id", () => {
		for (const bad of [undefined, null, "", "a b", "x;y", "cstrike +quit", "../x", "a".repeat(41)]) {
			assert.deepEqual(steamModArgs("90", bad), [], String(bad));
		}
		assert.deepEqual(steamModArgs("90 +quit", "cstrike"), []);
	});
});
