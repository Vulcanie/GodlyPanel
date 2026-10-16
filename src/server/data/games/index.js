// Games added one module each. A game's module (src/server/data/games/<id>.js) default-exports
//   { template, backup, logs, launchOptions }
//   template       the same recipe as an entry of GAME_TEMPLATES in ../gameTemplates.js
//   backup         { paths: [...] } for ../backupTemplates.js (what a backup of this game's server keeps)
//   logs           [...] for ../logTemplates.js (the log files the Logs tab reads)
//   launchOptions  true when the game's start script gets a "Launch options" form on the Settings tab
// and is listed here. The settings, launch arguments and wording the interface shows for the same game are in
// ui/src/catalog/games/<type>.js.
import abiotic from "./abiotic.js";
import dst from "./dst.js";
import icarus from "./icarus.js";
import scum from "./scum.js";
import starrupture from "./starrupture.js";
import soulmask from "./soulmask.js";
import garrysmod from "./garrysmod.js";
import barotrauma from "./barotrauma.js";
import necesse from "./necesse.js";
import l4d2 from "./l4d2.js";
import squad from "./squad.js";
import armareforger from "./armareforger.js";
import vein from "./vein.js";
import unturned from "./unturned.js";

export const GAME_MODULES = [abiotic, dst, icarus, scum, starrupture, unturned, soulmask, garrysmod, barotrauma, necesse, l4d2, squad, armareforger, vein];
