import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, fc } from "../helpers/fc.js";
import { tempDir, removeDir } from "../helpers/instance.js";
import { redactSecrets } from "../../src/server/services/logService.js";
import { sniffImage } from "../../src/server/util/imageMeta.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Rules for code that handles what it was handed by someone else: log text with secrets in it, uploaded files, a start script
// written by hand, a settings file that changed. They have to hold for any input, because the input isn't ours.

describe("hiding secrets in log text", () => {
	const KEYS = ["AdminPassword", "ServerAdminPassword", "RCONPassword", "password", "passwd", "pwd", "secret", "token", "api_key", "api-key"];
	// A password as people really choose them: printable, no spaces (a space ends a value on a command line or in a log line).
	const secret = fc.stringMatching(/^[!-~]{8,16}$/).filter((s) => !s.includes("*"));

	const forms = [
		["a command-line flag", (k, s) => `-${k}=${s}`, ["AdminPassword", "RCONPassword"]],
		["key=value", (k, s) => `${k}=${s}`, KEYS],
		["key = value", (k, s) => `${k} = ${s}`, KEYS],
		["key: value", (k, s) => `${k}: ${s}`, KEYS],
		["rcon.password=value", (_k, s) => `rcon.password=${s}`, ["x"]],
		["+password value", (_k, s) => `+password ${s}`, ["x"]],
	];
	for (const [label, make, keys] of forms) {
		it(`never leaves any of the password showing, written as ${label}`, () => {
			check(
				fc.property(fc.constantFrom(...keys), secret, fc.string({ maxLength: 20 }).filter((t) => !/[*]/.test(t)), (key, s, around) => {
					const line = `${around} ${make(key, s)} ${around}`;
					const out = redactSecrets(line);
					assert.ok(!out.includes(s), `${JSON.stringify(line)} -> ${JSON.stringify(out)}`);
				}),
			);
		});
	}

	it("never leaves a quoted JSON password showing, whatever it contains", () => {
		check(
			fc.property(fc.constantFrom(...KEYS), secret, (key, s) => {
				const line = `{"user":"bob","${key}":${JSON.stringify(s)},"port":1}`;
				const out = redactSecrets(line);
				assert.ok(!out.includes(s) && !out.includes(JSON.stringify(s).slice(1, -1)), `${line} -> ${out}`);
			}),
		);
	});

	it("is idempotent: redacting what is already redacted changes nothing", () => {
		check(fc.property(fc.string({ unit: "binary", maxLength: 300 }), (text) => assert.equal(redactSecrets(redactSecrets(text)), redactSecrets(text))));
	});

	it("leaves text alone when nothing in it looks like a secret, and never throws on any text", () => {
		const plain = fc.array(fc.constantFrom("Player", "joined", "port", "8892", "C:\\Games", "started", "ok", "-log", "Map?x=1", "ready.", "=", ":"), { maxLength: 12 }).map((w) => w.join(" "));
		check(fc.property(plain, (text) => assert.equal(redactSecrets(text), text)));
		check(fc.property(fc.string({ unit: "binary", maxLength: 400 }), (text) => assert.equal(typeof redactSecrets(text), "string")));
	});
});

describe("telling what an uploaded file is from its bytes", () => {
	const png = (width, height, tail = Buffer.alloc(0)) => {
		const head = Buffer.alloc(24);
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
		head.writeUInt32BE(13, 8);
		head.write("IHDR", 12, "ascii");
		head.writeUInt32BE(width, 16);
		head.writeUInt32BE(height, 20);
		return Buffer.concat([head, tail]);
	};
	const jpeg = (width, height, segments) => {
		const parts = [Buffer.from([0xff, 0xd8])];
		for (const [marker, payload] of segments) {
			const head = Buffer.alloc(4);
			head[0] = 0xff;
			head[1] = marker;
			head.writeUInt16BE(payload.length + 2, 2);
			parts.push(head, payload);
		}
		const sof = Buffer.alloc(19);
		sof[0] = 0xff;
		sof[1] = 0xc0;
		sof.writeUInt16BE(17, 2);
		sof[4] = 8;
		sof.writeUInt16BE(height, 5);
		sof.writeUInt16BE(width, 7);
		// Some image data after the header: a header alone is not a picture, and the sniffer wants a minimum size.
		parts.push(sof, Buffer.alloc(8), Buffer.from([0xff, 0xd9]));
		return Buffer.concat(parts);
	};
	const dim = fc.integer({ min: 1, max: 65535 });
	const bytes = fc.uint8Array({ maxLength: 120 }).map((a) => Buffer.from(a));
	const valid = (meta) => meta === null || (["png", "jpeg"].includes(meta.format) && meta.width > 0 && meta.height > 0 && Number.isInteger(meta.width) && Number.isInteger(meta.height));

	it("reads back the size of any PNG header, followed by anything", () => {
		check(fc.property(fc.integer({ min: 1, max: 2 ** 31 }), fc.integer({ min: 1, max: 2 ** 31 }), bytes, (w, h, tail) => {
			const meta = sniffImage(png(w, h, tail));
			assert.deepEqual([meta.format, meta.width, meta.height], ["png", w, h]);
		}));
	});

	it("reads back the size of any JPEG, however many other segments come before the frame header", () => {
		const segment = fc.tuple(fc.integer({ min: 0xe0, max: 0xef }), bytes);
		check(fc.property(dim, dim, fc.array(segment, { maxLength: 5 }), (w, h, segments) => {
			const meta = sniffImage(jpeg(w, h, segments));
			assert.deepEqual([meta?.format, meta?.width, meta?.height], ["jpeg", w, h]);
		}));
	});

	it("never throws, and only ever says 'a PNG or JPEG of a real size' or nothing, whatever the bytes are", () => {
		check(fc.property(bytes, (b) => assert.ok(valid(sniffImage(b)))));
		// Starting like an image and then falling apart is the case that matters.
		const real = [png(1920, 620, Buffer.alloc(64)), jpeg(1920, 620, [[0xe0, Buffer.alloc(14)]])];
		check(fc.property(fc.constantFrom(...real), fc.nat({ max: 120 }), fc.array(fc.tuple(fc.nat({ max: 120 }), fc.nat({ max: 255 })), { maxLength: 6 }), (image, cut, flips) => {
			const damaged = Buffer.from(image);
			for (const [at, value] of flips) if (at < damaged.length) damaged[at] = value;
			assert.ok(valid(sniffImage(damaged.subarray(0, cut))), "damaged and cut short");
			assert.ok(valid(sniffImage(damaged)), "damaged");
		}));
	});

	it("is not fooled by a name or a type: text that merely claims to be an image is refused", () => {
		check(fc.property(fc.string({ maxLength: 200 }), (text) => assert.equal(sniffImage(Buffer.from(text)), null)));
	});
});

describe("comparing two versions of a file line by line", () => {
	// The interface's own code, loaded from its file (it has no imports so that tests can).
	let diffLines;
	let summarise;
	before(async () => {
		const source = fs.readFileSync(new URL("../../ui/src/utils/lineDiff.js", import.meta.url), "utf8");
		({ diffLines, summarise } = await import(`data:text/javascript,${encodeURIComponent(source)}`));
	});

	const line = fc.constantFrom("a", "b", "c", "port=1", "port=2", "", "  indented", "x y z");
	const text = fc.tuple(fc.array(line, { maxLength: 10 }), fc.constantFrom("\n", "\r\n"), fc.boolean()).map(([lines, eol, final]) => lines.join(eol) + (final && lines.length ? eol : ""));
	const linesOf = (t) => {
		const l = String(t).split(/\r?\n/);
		if (l.length > 1 && l.at(-1) === "") l.pop();
		return l;
	};
	const lcs = (a, b) => {
		const t = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
		for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
		return t[0][0];
	};

	it("gives back both texts exactly: what is kept plus what was removed is the old text, what is kept plus what was added is the new", () => {
		check(fc.property(text, text, (before, after) => {
			const d = diffLines(before, after);
			assert.deepEqual(d.filter((x) => x.type !== "add").map((x) => x.text), linesOf(before));
			assert.deepEqual(d.filter((x) => x.type !== "del").map((x) => x.text), linesOf(after));
		}));
	});

	it("keeps as many lines as the two texts have in common, and no fewer (the shortest possible change)", () => {
		check(fc.property(text, text, (before, after) => {
			const kept = diffLines(before, after).filter((x) => x.type === "same").length;
			assert.equal(kept, lcs(linesOf(before), linesOf(after)));
		}));
	});

	it("shows nothing changed for the same text, and counts additions and removals consistently", () => {
		check(fc.property(text, text, (before, after) => {
			assert.deepEqual(summarise(diffLines(before, before)), { added: 0, removed: 0 });
			const d = diffLines(before, after);
			const { added, removed } = summarise(d);
			assert.equal(added - removed, linesOf(after).length - linesOf(before).length);
		}));
	});
});

describe("reading a start script without running it", { skip: process.platform !== "win32" && "Windows batch files" }, () => {
	let dir;
	before(() => {
		dir = tempDir("scripts");
		fs.writeFileSync(path.join(dir, "game.exe"), "");
	});
	after(() => removeDir(dir));

	const piece = fc.constantFrom(
		"@echo off",
		"cd /d \"%~dp0\"",
		"set X=1",
		"set \"NAME=My Server\"",
		"rem a comment",
		"start /MIN \"Game\" game.exe -log -Port=8892",
		"start \"\" game.exe -ServerName=\"A & B\" -x",
		"game.exe -nographics",
		"\"%~dp0game.exe\" -batchmode ^",
		"game.exe -Name=%NAME% -Pass=%UNSET%",
		"for %%i in (1 2) do echo %%i",
		"if exist game.exe echo yes",
		"goto :end",
		"call other.bat",
		"timeout /t 5",
		"game.exe -a & calc",
		"game.exe | more",
		"game.exe > out.txt",
		"pause",
		":end",
		"",
		"%%%",
		"\"unbalanced",
	);

	it("never throws on any script, and answers either 'here is what it launches' or 'here is why not'", () => {
		check(
			fc.property(fc.array(piece, { maxLength: 8 }), fc.constantFrom("\r\n", "\n"), (lines, eol) => {
				const script = path.join(dir, "start.bat");
				fs.writeFileSync(script, lines.join(eol));
				const result = deriveLaunch(script, { workingDir: dir });
				assert.equal(typeof result.ok, "boolean");
				if (!result.ok) assert.equal(typeof result.reason, "string");
			}),
			{ numRuns: 150 },
		);
	});

	// The reader's promise: it won't take a line that redirects or chains commands outside quotes (cmdSafe, which also looks at ^
	// and %, is applied later, when the launcher chooses between a hidden cmd and a direct launch).
	const noUnquotedOperators = (text) => {
		let quoted = false;
		for (const ch of text) {
			if (ch === '"') quoted = !quoted;
			else if (!quoted && "&|<>".includes(ch)) return false;
		}
		return true;
	};

	it("only ever accepts a script whose launch line has no redirect or chained command outside quotes", () => {
		check(
			fc.property(fc.array(piece, { maxLength: 8 }), (lines) => {
				const script = path.join(dir, "start.bat");
				fs.writeFileSync(script, lines.join("\r\n"));
				const result = deriveLaunch(script, { workingDir: dir });
				if (result.ok) {
					assert.ok(path.isAbsolute(result.launch.exe), result.launch.exe);
					assert.equal(noUnquotedOperators(result.launch.args ?? ""), true, `${lines.join(" / ")} -> ${result.launch.args}`);
					assert.ok(Array.isArray(result.skipped));
				}
			}),
			{ numRuns: 150 },
		);
	});
});
