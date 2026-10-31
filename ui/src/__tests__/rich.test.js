import { describe, it, expect } from "vitest";
import React from "react";
import { rich } from "../i18n/rich";

describe("rich()", () => {
	it("returns plain text as one piece", () => {
		expect(rich("hello")).toEqual(["hello"]);
	});

	it("turns <b>, <i> and <code> into elements", () => {
		const nodes = rich("a <b>bold</b> and <i>it</i> and <code>x</code>.");
		expect(nodes.map((n) => (typeof n === "string" ? n : n.type))).toEqual(["a ", "b", " and ", "i", " and ", "code", "."]);
		expect(nodes[1].props.children).toBe("bold");
	});

	it("uses the code part in place of the plain tag", () => {
		const Code = () => null;
		expect(rich("<code>x</code>", { code: Code })[0].type).toBe(Code);
	});

	it("fills {name} from parts and leaves an unknown one as written", () => {
		const nodes = rich("see {link} or {other}", { link: "HERE" });
		expect(nodes[0]).toBe("see ");
		expect(nodes[1].type).toBe(React.Fragment);
		expect(nodes[1].props.children).toBe("HERE");
		expect(nodes[3]).toBe("{other}");
	});

	it("does not throw on garbage and never builds markup from other tags", () => {
		expect(rich(undefined)).toEqual([]);
		expect(rich(null)).toEqual([]);
		expect(rich("<script>x</script>")).toEqual(["<script>x</script>"]);
		expect(rich("{constructor}")).toEqual(["{constructor}"]);
	});
});
