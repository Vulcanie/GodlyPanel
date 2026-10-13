// Lists the unit and API test files, one per line, for CI to hand to `node --test`.
//
//   node scripts/test-files.mjs          every file (what the Linux machines run)
//   node scripts/test-files.mjs windows  only the files that need the real Windows tools
//
// Most of the suite runs against stand-ins for the Windows programs the panel calls (tests/helpers/winshim), so it
// can run on a fast Linux machine. The files listed for "windows" are the ones where that stand-in is the weak
// point, and a real Windows machine is the only honest check: they start or find stand-in game programs, read
// the process list, run zip files through Windows' tar, or are marked as needing Windows. The rule is a text
// match, so a new test that uses those helpers joins the Windows run without anyone remembering to add it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const NEEDS_REAL_WINDOWS = [
	/makeFakeGame|runStandIn|killFakeGames|sweepProcessesUnder|copyNodeWithoutConsole/, // programs that really run and are really found
	/windowsOnly\(|onWindows|process\.platform/, // marked as needing Windows
	/checkProcess|tar\.exe|System32/, // asks Windows tools directly
];

export function testFiles(kind = "all") {
	const files = ["unit", "api"].flatMap((dir) =>
		fs
			.readdirSync(path.join(root, "tests", dir))
			.filter((f) => f.endsWith(".test.js"))
			.sort()
			.map((f) => path.posix.join("tests", dir, f)),
	);
	if (kind === "all") return files;
	if (kind !== "windows") throw new Error(`Unknown kind "${kind}" (all or windows).`);
	return files.filter((f) => {
		const text = fs.readFileSync(path.join(root, f), "utf8");
		return NEEDS_REAL_WINDOWS.some((pattern) => pattern.test(text));
	});
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	console.log(testFiles(process.argv[2]).join("\n"));
}
