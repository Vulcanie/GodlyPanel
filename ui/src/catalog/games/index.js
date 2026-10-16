// Games added one module each. A game's module (ui/src/catalog/games/<type>.js) default-exports
//   { type, title, files, launch, guide }
//   type    the `type` the server is recorded with (the same as its template's `type`)
//   title   the game's name
//   files   its settings files as the Settings tab shows them: { "<file name>": { parser, settings, groupOrder, ... } }, in the same
//           shape as an entry of CONFIG_CATALOG[game].files in ../../configCatalog.js (without "Launch options", which is added)
//   launch  its launch arguments (the shape of an entry of LAUNCH_ARGS in ../launchArgs.js), or null
//   guide   { name, short, summary, files: { "<file name>": "what it is" }, notes: [] } for the game settings guide
// and is listed here. The server side of the same game is in src/server/data/games/<id>.js.
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

export const GAME_UI_MODULES = [abiotic, dst, icarus, scum, starrupture, unturned, soulmask, garrysmod, barotrauma, necesse, l4d2, squad, armareforger, vein];
