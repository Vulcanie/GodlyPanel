import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { check, fc } from "../helpers/fc.js";
import { flagValue, optionValue, propertyValue } from "../../src/server/util/launchOptions.js";
import { compareVersions, checksumFromNotes } from "../../src/server/util/releaseVersions.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";
import { passwordProblem, MIN_LENGTH, MAX_BYTES } from "../../src/server/util/passwordRules.js";

// Rules that must hold for every input of a shape, for the code that reads text other people wrote: launch lines, release
// notes, version numbers, command lines, passwords.

const word = fc.stringMatching(/^[A-Za-z0-9_.\\:-]{1,12}$/);
const noise = fc.array(fc.constantFrom("-log", "-nographics", "-Port=8892", "Map_WP", '-Name="a b"', "?MaxPlayers=10"), { maxLength: 4 });

describe("reading a flag's value out of a launch line", () => {
	it("finds the value however the flag is written, wherever it sits among other arguments", () => {
		check(
			fc.property(
				fc.constantFrom("-savedir", "-UserDataFolder", "-world", "-datapath"),
				fc.stringMatching(/^[A-Za-z0-9 _.\\:/()-]{1,20}$/).filter((v) => v === v.trim()),
				noise,
				noise,
				(flag, value, before, after) => {
					const quoted = `${flag} "${value}"`;
					const equals = `${flag}=${value.replace(/ /g, "_")}`;
					const wholeQuoted = `"${flag}=${value}"`;
					const lead = before.join(" ");
					const trail = after.join(" ");
					assert.equal(flagValue(`${lead} ${quoted} ${trail}`, flag), value, quoted);
					assert.equal(flagValue(`${lead} ${equals} ${trail}`, `${flag}=`), value.replace(/ /g, "_"), equals);
					assert.equal(flagValue(`${lead} ${wholeQuoted} ${trail}`, `${flag}=`), value, wholeQuoted);
				},
			),
		);
	});

	it("answers null when the flag isn't there, and never throws, whatever the text or the flag is", () => {
		check(
			fc.property(fc.string({ unit: "binary", maxLength: 200 }), fc.string({ unit: "binary", minLength: 1, maxLength: 20 }), (text, flag) => {
				const found = flagValue(text, flag);
				assert.ok(found === null || typeof found === "string");
			}),
		);
		check(fc.property(noise, (args) => assert.equal(flagValue(args.join(" "), "-savedir"), null)));
	});
});

describe("reading a ?Name=value option out of a launch line", () => {
	it("finds the value between question marks, at the end, or before a space", () => {
		check(
			fc.property(fc.stringMatching(/^[A-Za-z]{3,12}$/), fc.stringMatching(/^[A-Za-z0-9_.-]{1,16}$/), fc.constantFrom("?", "&"), (name, value, joiner) => {
				assert.equal(optionValue(`Map_WP?SessionName=X${joiner}${name}=${value}${joiner}MaxPlayers=10 -log`, name), value);
				assert.equal(optionValue(`Map_WP?SessionName=X${joiner}${name}=${value}`, name), value, "at the end");
				assert.equal(optionValue(`Map_WP?SessionName=X ${joiner}${name}=${value} -log`, name), value, "before a space");
			}),
		);
	});

	it("is not fooled by an option whose name only ends the same way", () => {
		check(
			fc.property(fc.stringMatching(/^[A-Za-z]{3,10}$/), fc.stringMatching(/^[A-Za-z]{1,5}$/), (name, extra) => {
				assert.equal(optionValue(`Map?${extra}${name}=1`, name), null, "a longer name");
			}),
		);
	});

	it("never throws, whatever the text or the name is", () => {
		check(fc.property(fc.string({ unit: "binary", maxLength: 200 }), fc.string({ unit: "binary", maxLength: 20 }), (text, name) => {
			const found = optionValue(text, name);
			assert.ok(found === null || typeof found === "string");
		}));
	});
});

describe("reading a setting out of a .properties file", () => {
	const key = fc.stringMatching(/^[a-z][a-z.-]{1,15}$/);
	const value = fc.string({ maxLength: 30 }).filter((v) => !/[\r\n]/.test(v));
	const other = fc.array(fc.tuple(key, value), { maxLength: 6 });

	it("finds a setting among comments, blank lines, other settings and either kind of line end", () => {
		check(
			fc.property(key, value, other, other, fc.constantFrom("\n", "\r\n"), (k, v, beforeLines, afterLines, eol) => {
				const lines = (list) => list.filter(([ok]) => ok !== k).map(([ok, ov]) => `${ok}=${ov}`);
				const text = ["#Minecraft server properties", "", ...lines(beforeLines), `${k}=${v}`, "", ...lines(afterLines)].join(eol);
				assert.equal(propertyValue(text, k), v.trim());
			}),
		);
	});

	it("ignores a commented-out setting, and a missing one", () => {
		check(fc.property(key, value, (k, v) => {
			assert.equal(propertyValue(`#${k}=${v}\n`, k), null);
			assert.equal(propertyValue(`!${k}=${v}\n`, k), null);
			assert.equal(propertyValue(`${k}x=${v}\n`, k), null, "a longer key");
			assert.equal(propertyValue("", k), null);
		}));
	});

	it("never throws on any text", () => {
		check(fc.property(fc.string({ unit: "binary", maxLength: 300 }), key, (text, k) => {
			const found = propertyValue(text, k);
			assert.ok(found === null || typeof found === "string");
		}));
	});
});

describe("ordering release versions", () => {
	const ident = fc.oneof(fc.nat({ max: 30 }).map(String), fc.stringMatching(/^[a-z]{1,6}$/));
	const version = fc
		.tuple(fc.nat({ max: 12 }), fc.nat({ max: 12 }), fc.nat({ max: 12 }), fc.option(fc.array(ident, { minLength: 1, maxLength: 3 }), { nil: undefined }))
		.map(([a, b, c, pre]) => `${a}.${b}.${c}${pre ? `-${pre.join(".")}` : ""}`);
	const sign = (n) => Math.sign(n);

	it("agrees with itself: equal to itself, and the order flips when the two are swapped", () => {
		check(fc.property(version, version, (a, b) => {
			assert.equal(compareVersions(a, a), 0, a);
			assert.equal(sign(compareVersions(a, b)), -sign(compareVersions(b, a)), `${a} vs ${b}`);
		}));
	});

	it("is transitive: a sorted list never has a later one below an earlier one", () => {
		check(fc.property(fc.array(version, { minLength: 3, maxLength: 12 }), (versions) => {
			const sorted = [...versions].sort(compareVersions);
			for (let i = 0; i < sorted.length; i += 1) {
				for (let j = i + 1; j < sorted.length; j += 1) assert.ok(compareVersions(sorted[i], sorted[j]) <= 0, `${sorted[i]} then ${sorted[j]}`);
			}
		}));
	});

	it("puts a release above all of its own pre-releases, and ignores a leading v", () => {
		check(fc.property(fc.nat({ max: 20 }), fc.nat({ max: 20 }), fc.nat({ max: 20 }), fc.array(ident, { minLength: 1, maxLength: 3 }), (a, b, c, pre) => {
			const release = `${a}.${b}.${c}`;
			assert.ok(compareVersions(`${release}-${pre.join(".")}`, release) < 0);
			assert.equal(compareVersions(`v${release}`, release), 0);
		}));
	});

	it("compares the numbers as numbers, not as text (alpha.10 is after alpha.2)", () => {
		check(fc.property(fc.nat({ max: 5000 }), fc.nat({ max: 5000 }), (m, n) => {
			assert.equal(sign(compareVersions(`0.1.0-alpha.${m}`, `0.1.0-alpha.${n}`)), sign(m - n));
			assert.equal(sign(compareVersions(`${m}.0.0`, `${n}.0.0`)), sign(m - n));
		}));
	});

	it("orders semver.org's own example list correctly, however it is shuffled", () => {
		const inOrder = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0"];
		check(fc.property(fc.shuffledSubarray(inOrder, { minLength: 2 }), (some) => {
			assert.deepEqual([...some].sort(compareVersions), inOrder.filter((v) => some.includes(v)));
		}));
	});

	it("says 'no difference' rather than guessing when something isn't a version", () => {
		check(fc.property(fc.string({ maxLength: 20 }).filter((s) => !/^v?\d+\.\d+\.\d+/.test(s.trim())), version, (junk, v) => {
			assert.equal(compareVersions(junk, v), 0);
			assert.equal(compareVersions(v, junk), 0);
		}));
	});
});

describe("finding a checksum in release notes", () => {
	const hex64 = fc.stringMatching(/^[0-9a-fA-F]{64}$/);
	const filler = fc.stringMatching(/^[g-zG-Z ,.:`*\r\n-]{0,120}$/); // no hex runs, so it can't be mistaken for a checksum
	// A file name as it might be, including characters that mean something in a regular expression.
	const name = fc.stringMatching(/^[A-Za-z0-9._()[\]+*?^${}|\\-]{3,30}$/);

	it("returns the checksum written after the file's name, in lower case, whatever characters the name has", () => {
		check(fc.property(name, filler, hex64, filler, fc.string({ maxLength: 40 }), (n, between, hash, after, before) => {
			fc.pre(!before.includes(n));
			// As in real notes, whitespace or punctuation separates the name, the checksum and what surrounds them.
			const notes = `${before}${n} ${between} ${hash} ${after}`;
			assert.equal(checksumFromNotes(notes, n), hash.toLowerCase());
		}));
	});

	it("answers null, never throws, when there is nothing to find", () => {
		check(fc.property(name, fc.string({ unit: "binary", maxLength: 300 }), (n, notes) => {
			const found = checksumFromNotes(notes, n);
			assert.ok(found === null || /^[0-9a-f]{64}$/.test(found), String(found));
		}));
		check(fc.property(name, filler, (n, text) => assert.equal(checksumFromNotes(`${n} ${text}`, n), null)));
		assert.equal(checksumFromNotes("", "x.zip"), null);
		assert.equal(checksumFromNotes(null, "x.zip"), null);
	});

	it("doesn't take a longer run of hex digits for a checksum", () => {
		check(fc.property(name, hex64, fc.constantFrom("a", "0", "F"), (n, hash, extra) => {
			assert.equal(checksumFromNotes(`${n} ${hash}${extra}`, n), null, "65 digits");
		}));
	});
});

describe("command lines that cmd passes on unchanged", () => {
	// How cmd reads a line, as a small model: quotes switch quoting on and off; unquoted, & | < > ^ are operators; % is
	// expanded anywhere; a quote left open swallows the rest.
	const model = (s) => {
		if (s.includes("%") || /[\r\n]/.test(s)) return false;
		let quoted = false;
		for (const ch of s) {
			if (ch === '"') quoted = !quoted;
			else if (!quoted && "&|<>^".includes(ch)) return false;
		}
		return !quoted;
	};
	const risky = fc.array(fc.constantFrom("a", "x", " ", '"', '"', "&", "|", "<", ">", "^", "%", "\n", "=", "-", "?", "\\", "'"), { maxLength: 24 }).map((c) => c.join(""));

	it("agrees with the model on any mix of ordinary text and the characters cmd treats specially", () => {
		check(fc.property(risky, (s) => assert.equal(cmdSafe(s), model(s), JSON.stringify(s))), { numRuns: 1000 });
	});

	it("accepts any run of ordinary arguments, quoted values with anything inside included, and refuses an unquoted operator", () => {
		const plain = fc.stringMatching(/^[A-Za-z0-9_.=?:\\/-]{1,10}$/);
		const quotedValue = fc.stringMatching(/^[A-Za-z0-9 &|<>^_.-]{0,10}$/).map((v) => `-Name="${v}"`);
		check(fc.property(fc.array(fc.oneof(plain, quotedValue), { maxLength: 6 }), (args) => assert.equal(cmdSafe(args.join(" ")), true, args.join(" "))));
		check(fc.property(fc.array(plain, { maxLength: 3 }), fc.constantFrom("&", "|", "<", ">", "^"), fc.array(plain, { maxLength: 3 }), (a, op, b) => assert.equal(cmdSafe(`${a.join(" ")} ${op} ${b.join(" ")}`), false)));
	});

	it("refuses a percent sign wherever it is, even inside quotes", () => {
		check(fc.property(risky, risky, (a, b) => assert.equal(cmdSafe(`${a}%${b}`), false)));
	});
});

describe("accepting a password", () => {
	it("refuses anything shorter than the minimum, and anything that isn't text", () => {
		// Counted in characters: four emoji are four characters, though eight UTF-16 units.
		check(fc.property(fc.string({ unit: "binary", maxLength: MIN_LENGTH - 1 }), (p) => assert.notEqual(passwordProblem(p), null)));
		assert.notEqual(passwordProblem("𐀀".repeat(4)), null, "four astral characters");
		check(fc.property(fc.oneof(fc.integer(), fc.constant(null), fc.constant(undefined), fc.object()), (p) => assert.notEqual(passwordProblem(p), null)));
	});

	it("refuses anything over the 72 bytes bcrypt looks at, counting bytes rather than characters", () => {
		check(fc.property(fc.string({ unit: "binary", minLength: MIN_LENGTH, maxLength: 120 }), (p) => {
			if (Buffer.byteLength(p, "utf8") > MAX_BYTES) assert.match(passwordProblem(p), /too long/);
		}));
		// 37 two-byte characters is 74 bytes, though only 37 characters.
		assert.match(passwordProblem("é".repeat(37)), /too long/);
		assert.doesNotMatch(passwordProblem("é".repeat(18) + "ü".repeat(18)) ?? "", /too long/, "exactly 72 bytes is allowed");
	});

	it("accepts a long-enough, short-enough, mixed password that isn't the account's name, and still does with a letter added", () => {
		const strong = fc.stringMatching(/^[A-Z][a-z]{3,8}[0-9]{2}[!@#$%][a-z]{2,8}$/);
		check(fc.property(strong, (p) => {
			fc.pre(Buffer.byteLength(p) + 1 <= MAX_BYTES);
			assert.equal(passwordProblem(p), null, p);
			assert.equal(passwordProblem(p + "x"), null, p + "x");
		}));
	});

	it("refuses a password that is just the account's name, however it is cased or punctuated", () => {
		check(fc.property(fc.stringMatching(/^[A-Za-z0-9]{8,20}$/), fc.constantFrom("", "-", "_", "."), (name, glue) => {
			const password = glue ? name.slice(0, 4) + glue + name.slice(4) : name;
			fc.pre(!/^(.)\1+$/.test(password));
			assert.match(passwordProblem(password.toUpperCase(), name.toLowerCase()), /same as the username|common/);
		}));
	});

	it("refuses one character repeated", () => {
		check(fc.property(fc.string({ unit: "grapheme-ascii", minLength: 1, maxLength: 1 }), fc.integer({ min: MIN_LENGTH, max: 60 }), (ch, n) => assert.notEqual(passwordProblem(ch.repeat(n)), null)));
	});
});
