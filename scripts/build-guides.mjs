// Writes the guides in docs/ that the interface's (i) tooltips link to, from the help text in ui/src/help.
//
//   node scripts/build-guides.mjs           write them
//   node scripts/build-guides.mjs --check   fail if what is committed is out of date (the tests do the same)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../ui/src/help/guides.js";
import { HELP_LIST } from "../ui/src/help/panelHelp.js";
import { renderGuide } from "../ui/src/help/renderGuide.js";
import { launchGuideEntries, gameGuideEntries } from "../ui/src/help/generatedGuides.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Exported so the tests render the very same pages.
export const DOCS = {
	settings: {
		doc: {
			title: "Panel settings guide",
			intro: [
				"Everything on the panel's **Settings** page, what it does and when to change it. This page is what the (i) icons beside each setting link to.",
				"Settings are saved in `config.json` in your data folder. Keys and passwords are kept separately, in a private folder, so a settings file is safe to share when you ask for help. Some settings only take effect after the panel restarts; the page says so when you save.",
			],
		},
		entries: () => HELP_LIST.filter((e) => e.guide === "settings"),
	},
	server: {
		doc: {
			title: "Server options guide",
			intro: [
				"The controls on a server's own page (window, ports, backups, schedules, automation, network, players, mods) and on the People page. This is what the (i) icons beside those controls link to.",
				"For the settings inside a game itself, see the [game settings guide](GAME_SETTINGS.md). For ports and firewalls in depth, see [Ports and firewall](PORTS_AND_FIREWALL.md). For day-to-day running, see [Managing servers](MANAGING_SERVERS.md).",
			],
		},
		entries: () => HELP_LIST.filter((e) => e.guide === "server"),
	},
	launch: { doc: launchGuideEntries.doc, entries: () => launchGuideEntries.entries() },
	games: { doc: gameGuideEntries.doc, entries: () => gameGuideEntries.entries() },
};

export const guideFile = (key) => path.join(root, "docs", `${GUIDES[key].file}.md`);

/** What the generator makes for a guide: the markdown for docs/<file>.md. */
export const renderDoc = (key) => renderGuide(DOCS[key].doc, DOCS[key].entries());

function run() {
	const check = process.argv.includes("--check");
	let stale = 0;
	for (const key of Object.keys(DOCS)) {
		const file = guideFile(key);
		const next = renderDoc(key);
		const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
		if (current === next) continue;
		if (check) {
			stale += 1;
			console.error(`${path.relative(root, file)} is out of date: run npm run build:guides`);
		} else {
			fs.writeFileSync(file, next);
			console.log(`wrote ${path.relative(root, file)}`);
		}
	}
	process.exit(stale ? 1 : 0);
}

// Only when run as a script: the tests import this file for DOCS and renderDoc without writing anything.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
