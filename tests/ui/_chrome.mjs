// Finds a Chromium for the browser tests, on any system. Imported by every test in this folder as `EXE`.
//
// In order:
//   1. GP_CHROME, if set: a path to any Chrome or Chromium program (CI points it at the browser it installed).
//   2. The browser playwright-core installs for itself (`npx playwright-core install chromium`), wherever that
//      cache lives on this system, and whichever build number it is.
//   3. A Chrome or Chromium that is installed the usual way.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const exists = (p) => Boolean(p) && fs.existsSync(p);

// Where playwright-core keeps its browsers, and where in each build's folder the program is.
const cacheFolders = [
	process.env.PLAYWRIGHT_BROWSERS_PATH,
	process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
	path.join(os.homedir(), "AppData", "Local", "ms-playwright"),
	path.join(os.homedir(), ".cache", "ms-playwright"),
	path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
	"/opt/pw-browsers",
].filter(Boolean);
const insideBuild = ["chrome-win64/chrome.exe", "chrome-win/chrome.exe", "chrome-linux64/chrome", "chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"];

function playwrightsOwn() {
	try {
		if (exists(chromium.executablePath())) return chromium.executablePath();
	} catch {
		// No browser of the build this playwright-core wants; look for any other build below.
	}
	for (const folder of cacheFolders) {
		let builds = [];
		try {
			builds = fs.readdirSync(folder).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
		} catch {
			continue;
		}
		for (const build of builds) {
			const found = insideBuild.map((p) => path.join(folder, build, p)).find(exists);
			if (found) return found;
		}
	}
	return null;
}

const usual = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"/usr/bin/google-chrome",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export const EXE = process.env.GP_CHROME || playwrightsOwn() || usual.find(exists);

if (!EXE) {
	throw new Error("No Chrome or Chromium found. Run `npx playwright-core install chromium`, or set GP_CHROME to the browser's program.");
}
