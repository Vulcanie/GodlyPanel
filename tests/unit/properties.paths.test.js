import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { check, fc } from "../helpers/fc.js";
import { isWithinAllowedRoots } from "../../src/server/util/safePath.js";
import { unsafeEntries } from "../../src/server/util/tarZip.js";

// Rules about paths that must hold for every input of a shape, not just the examples someone thought of. They are checked
// against an independent rule (path.win32.relative) rather than by restating the code under test.

const onWindows = process.platform === "win32";

// What allowedRoots() produces: resolved, lower-case, no trailing separator.
const normalise = (p) => path.resolve(p).toLowerCase().replace(/[\\/]+$/, "");

const ROOTS = ["C:\\Games", "D:\\a\\b", "C:\\Servers\\Minecraft Pack", "E:\\x"];
const root = fc.constantFrom(...ROOTS);
const separator = fc.constantFrom("\\", "/", "\\\\", "/\\");
const segment = fc.constantFrom("a", "B", "game files", "x.y", "..", ".", "", "Games", "b", "a.b", "..a", "a..");

// A path under (or climbing out of) a root: the root, then separators and segments in any mix.
const wander = fc.tuple(root, fc.array(fc.tuple(separator, segment), { maxLength: 8 }), fc.constantFrom("", "\\", "/"));
const build = ([r, steps, tail]) => r + steps.map(([sep, seg]) => sep + seg).join("") + tail;

// Inside, by the standard library's own reckoning (case-insensitive on win32).
const inside = (r, candidate) => {
	const rel = path.win32.relative(r, path.win32.resolve(candidate));
	// A folder called "..a" is inside; only a ".." segment climbs out.
	return rel === "" || (rel !== ".." && !rel.startsWith("..\\") && !path.win32.isAbsolute(rel));
};

describe("a path is inside a managed folder", { skip: !onWindows && "Windows paths" }, () => {
	it("exactly when it resolves to the folder or something below it, however it is written", () => {
		check(
			fc.property(wander, (parts) => {
				const candidate = build(parts);
				const r = parts[0];
				assert.equal(isWithinAllowedRoots(candidate, [normalise(r)]), inside(r, candidate), candidate);
			}),
		);
	});

	it("is never fooled by a sibling folder whose name merely starts with the folder's", () => {
		check(
			fc.property(root, fc.stringMatching(/^[a-z0-9]{1,8}$/), (r, extra) => {
				assert.equal(isWithinAllowedRoots(r + extra, [normalise(r)]), false, r + extra);
				assert.equal(isWithinAllowedRoots(`${r}${extra}\\file.txt`, [normalise(r)]), false);
			}),
		);
	});

	it("is never fooled by climbing out and back in under another name", () => {
		check(
			fc.property(root, fc.stringMatching(/^[a-z]{1,6}$/), (r, other) => {
				const parent = path.win32.dirname(r);
				const sibling = `${parent}\\${other}x`;
				// Out through .., into a folder that isn't the root.
				assert.equal(isWithinAllowedRoots(`${r}\\..\\${other}x\\file`, [normalise(r)]), false, `${r}\\..\\${other}x\\file`);
				assert.equal(isWithinAllowedRoots(sibling, [normalise(r)]), false);
			}),
		);
	});

	it("does not care about letter case or which slash is used", () => {
		check(
			fc.property(wander, (parts) => {
				const candidate = build(parts);
				const r = normalise(parts[0]);
				const base = isWithinAllowedRoots(candidate, [r]);
				assert.equal(isWithinAllowedRoots(candidate.toUpperCase(), [r]), base, "upper case");
				assert.equal(isWithinAllowedRoots(candidate.replaceAll("\\", "/"), [r]), base, "forward slashes");
			}),
		);
	});

	it("refuses the same path on another drive", () => {
		check(
			fc.property(root, fc.constantFrom("F", "G", "Z"), (r, drive) => {
				const other = `${drive}:${r.slice(2)}\\file.txt`;
				assert.equal(isWithinAllowedRoots(other, [normalise(r)]), false, other);
			}),
		);
	});

	it("answers false, and never throws, for empty or odd input", () => {
		assert.equal(isWithinAllowedRoots("", ["c:\\games"]), false);
		assert.equal(isWithinAllowedRoots(null, ["c:\\games"]), false);
		assert.equal(isWithinAllowedRoots(undefined, ["c:\\games"]), false);
		check(
			fc.property(fc.string({ unit: "binary" }), (junk) => {
				const answer = isWithinAllowedRoots(junk, ["c:\\games"]);
				assert.equal(typeof answer, "boolean");
			}),
		);
	});

	it("refuses everything when there are no folders to be inside of", () => {
		check(fc.property(wander, (parts) => assert.equal(isWithinAllowedRoots(build(parts), []), false)));
	});
});

describe("names inside an archive that would land outside its folder", () => {
	const safeSegment = fc.stringMatching(/^[A-Za-z0-9_][A-Za-z0-9_ .-]{0,10}$/).filter((s) => s !== "." && s !== ".." && !s.endsWith(" ") && !s.endsWith("."));
	const safeName = fc.array(safeSegment, { minLength: 1, maxLength: 5 }).chain((segments) => fc.constantFrom("/", "\\").map((sep) => segments.join(sep)));

	it("never flags an ordinary relative name", () => {
		check(fc.property(fc.array(safeName, { maxLength: 6 }), (names) => assert.deepEqual(unsafeEntries(names), [])));
	});

	it("always flags a name with a .. segment, whatever it is separated by or surrounded with", () => {
		check(
			fc.property(fc.array(safeSegment, { maxLength: 3 }), fc.array(safeSegment, { maxLength: 3 }), fc.constantFrom("/", "\\"), (before, after, s1) => {
				const name = [...before, "..", ...after].join(s1);
				assert.deepEqual(unsafeEntries([name]), [name], name);
			}),
		);
	});

	it("always flags an absolute name: rooted, a drive letter, or a network share", () => {
		check(
			fc.property(safeName, fc.constantFrom("/", "\\", "C:\\", "c:/", "D:", "\\\\server\\share\\", "//server/share/"), (name, prefix) => {
				const absolute = prefix + name;
				assert.deepEqual(unsafeEntries([absolute]), [absolute], absolute);
			}),
		);
	});

	it("keeps only the offending names, in their order, and never throws", () => {
		check(
			fc.property(fc.array(fc.string({ unit: "binary" }), { maxLength: 8 }), (names) => {
				const flagged = unsafeEntries(names);
				assert.ok(flagged.every((n) => names.includes(n)));
				let last = -1;
				for (const n of flagged) {
					const at = names.indexOf(n, last + 1);
					assert.ok(at > last, "in order");
					last = at;
				}
			}),
		);
	});
});
