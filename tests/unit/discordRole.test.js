import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { roleIdOf, roleMention } from "../../src/server/util/discordRole.js";
import { isAdminMember } from "../../src/server/services/discordCommands.js";

describe("the Discord admin role, saved either way", () => {
	it("takes the id out of a mention or a bare id", () => {
		assert.equal(roleIdOf("<@&123456789012345678>"), "123456789012345678");
		assert.equal(roleIdOf("123456789012345678"), "123456789012345678");
		assert.equal(roleIdOf(" 123456789012345678 "), "123456789012345678");
	});

	it("says nothing when no role is set", () => {
		assert.equal(roleIdOf(""), "");
		assert.equal(roleIdOf(undefined), "");
		assert.equal(roleMention(""), "");
	});

	it("always pings in the mention form", () => {
		assert.equal(roleMention("123456789012345678"), "<@&123456789012345678>");
		assert.equal(roleMention("<@&123456789012345678>"), "<@&123456789012345678>");
	});

	it("recognises a member with the role whichever way it was saved", () => {
		const member = { member: { roles: ["999999999999999999", "123456789012345678"] } };
		assert.equal(isAdminMember(member, "<@&123456789012345678>"), true);
		assert.equal(isAdminMember(member, "123456789012345678"), true);
		assert.equal(isAdminMember(member, "<@&555555555555555555>"), false);
		assert.equal(isAdminMember(member, ""), false);
	});
});
