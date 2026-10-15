# Necesse - config files and settings (conventions section B)
Researched 2026-10-15 (read-only web research; nothing installed or run). Store app 1169040, server tool app 1169370.
Build note: Necesse is out of early access (1.0 launch Oct 2025 per candidates.md). Most host guides were written for older builds (0.21.x, example `gameVersion = 0.21.21`); newer guides show `gameVersion` like 1.2.0 (S6). There is NO official page that lists every key. The best "ground truth" found is (a) the install script of the Pelican/Pterodactyl egg, which writes a full default `server.cfg` with the developer-style comments (S2) and (b) the official-community Necesse Wiki (S3, S4). Nothing here was read from a real generated file, so the first thing an implementer should do is diff this document against a freshly generated `server.cfg` and `worldSettings.cfg`.

## Source legend
| id | URL | what it is / reliability |
|---|---|---|
| S1 | https://github.com/solareon/necesse-dedicated/blob/main/server.cfg (raw: https://raw.githubusercontent.com/solareon/necesse-dedicated/main/server.cfg) | Docker project's copy of a generated `server.cfg` with comments (older key set) |
| S2 | https://raw.githubusercontent.com/pelican-eggs/games-steamcmd/main/necesse/egg-necesse.json (viewer: https://eggs.pterodactyl.io/egg/games-necesse) | Pelican egg; install script writes a full `cfg/server.cfg` with all keys and comments. Best source for server.cfg. Read in full. |
| S3 | https://necessewiki.com/Multiplayer | Necesse Wiki: file locations, launch parameters ("found in Necesse.jar"), in-game admin commands |
| S4 | https://necessewiki.com/World_settings | Necesse Wiki: world settings as shown in the game's UI (names/defaults/effects in plain language, no file keys) |
| S5 | https://mintservers.com/knowledgebase/how-to-configure-necesse-server | Host guide with full example `server.cfg` and `worldSettings.cfg` (difficulty = CLASSIC) |
| S6 | https://help.sparkedhost.com/en/article/how-to-change-the-world-settings-on-a-necesse-server-1m66og6.md | Host guide; most complete `worldSettings.cfg` key list (15 keys, newer build) but no example file and no format shown |
| S7 | https://thaigameguide.com/wiki/en/necesse/worldsettings-cfg/ | Example `worldSettings.cfg`, build 0.21.21 (difficulty = NORMAL, older value names) |
| S8 | https://thaigameguide.com/wiki/en/necesse/server-cfg/ | Example `server.cfg` (older key set) |
| S9 | https://steamcommunity.com/app/1169040/discussions/0/685237458700749561/ | Steam thread (community answer, Nov 2025): difficulty lives in worldSettings.cfg in the world zip, shows `difficulty = CLASSIC` |
| S10 | https://steamcommunity.com/app/1169040/discussions/0/4757578733053367843/ | Steam thread with a developer reply on dayTimeMod/nightTimeMod |
| S11 | https://client.citadelservers.com/knowledgebase/1443/How-to-Configure-the-DayorNight-Cycle-on-Your-Necesse-Server.html | Host guide: dayTimeMod/nightTimeMod, "up to 10" |
| S12 | https://xgamingserver.com/docs/necesse/server-config | Host guide with a DIFFERENT, apparently wrong key set (serverName, worldSeed, `admins.txt`). Listed only to flag it. |
| S13 | https://www.gamehostbros.com/guides/games/necesse/console-commands | Host guide: in-game commands and value names |
| S14 | https://wabbanode.com/help/necesse/all-necesse-admin-and-console-commands | Host guide: in-game commands and value names |
| S15 | https://www.survivalservers.com/wiki/Necesse_Server_Configuration | Could not be opened (HTTP 403); only a search-engine summary of it was seen. Not relied on. |
| S16 | https://necessewiki.com/Hunger | Necesse Wiki: hunger and survival mode |
| S17 | https://github.com/BrammyS/necesse-docker-server | Docker project; env vars mirror the launch parameters |
| S18 | https://client.citadelservers.com/knowledgebase/534/Necesse-Server-Configuration.html and https://pingperfect.com/index.php/knowledgebase/1074/Necesse--Server-Configuration.html | Hosts' older (0.21.21) example files (same text as S7/S8) |
| S19 | https://survivalconfigs.com/necesse | Lists a wrong-looking server.cfg (serverName, worldName, TCP port). Flagged, not used. |

## 1. File inventory
| file | location | format | created by | notes / source |
|---|---|---|---|---|
| `server.cfg` | `cfg\server.cfg` under the data directory. Default data dir is `%AppData%\Roaming\Necesse` (so `C:\Users\<user>\AppData\Roaming\Necesse\cfg`) (S3). With launch flag `-localdir` the data dir is the folder the server is launched from, so it is `<install>\cfg\server.cfg` (S3, and the egg start line uses `-localdir`: S2). `-datadir <path>` moves it elsewhere (S3). | Plain text, Lua-like block: `SERVER = { key = value, // comment ... }`. Comma after every entry except the last; `//` comments; strings may be quoted (`password = "",`) or bare (`language = en`) (S1, S2, S5). | The server (the egg only pre-creates it so Wings can fill port/slots/password; the game writes the same file itself on first start - UNVERIFIED, see list). Rewritten from memory on a clean shutdown, so edit only while the server is stopped (S5; also S19). | A launch parameter given on the command line wins over the file; "parameters not given will be loaded from server settings file" (S3). `-settings <file>` loads a different settings file (S3). |
| `worldSettings.cfg` | INSIDE each world's save archive: `<data dir>\saves\worlds\<WorldName>.zip` contains `<WorldName>\worldSettings.cfg` (S9, S3, S6; egg viewer lists it as `saves/worlds/SAVE_NAME.zip/worldSettings.cfg`: https://eggs.pterodactyl.io/egg/games-necesse). | Same Lua-like block: `WORLDSETTINGS = { key = value, // comment ... }` (S5, S7). Values for enumerations are bare upper-case words, booleans `true`/`false`. | Created by the game when a world is created. | The world must be unzipped, edited, re-zipped and renamed to the exact original name; stop the server first (S3, S6). If `zipSaves` is false the world is probably a plain folder instead (UNVERIFIED). Most of these settings can also be changed from inside the running server with admin commands (section 4), which avoids hand-editing zips. |
| `world.dat` etc. | Inside the world archive | binary/other | game | Not a settings file. Only mentioned because a Steam thread reports `worldTime`, `worldTimeMod`, `time`, `timeMod` in it have no effect on day length (S10). Do not expose. |

Not config files: `logs\` (S3), `mods\` (see 04-mods.md). There is NO `admins.txt` documented on the Necesse Wiki; S12 mentions one but also lists wrong keys, so it is treated as wrong. Admin rights are set with `-owner <name>` or the in-game `/permissions` command (S3, S5).

## 2. server.cfg - every key
Full default text (S2, the egg install script; placeholders for port/slots/password filled by the egg):

```
SERVER = {
	port = <port>, // [0 - 65535] Server default port
	slots = <slots>, // [1 - 250] Server default slots
	password = <password>, // Leave blank for no password
	maxClientLatencySeconds = 30,
	pauseWhenEmpty = true,
	giveClientsPower = true, // If true, clients will have much more power over what hits them, their position etc
	logging = true, // If true, will create log files for each server start
	language = en,
	unloadLevelsCooldown = 30, // The number of seconds a level will stay loaded after the last player has left it
	worldBorderSize = -1, // The max distance from spawn players can travel. -1 for no border
	droppedItemsLifeMinutes = 0, // Minutes that dropped items will stay in the world. 0 or less for indefinite
	unloadSettlements = false, // If the server should unload player settlements or keep them loaded
	maxSettlementsPerPlayer = -1, // The maximum amount of settlements per player. -1 or less means infinite
	maxSettlersPerSettlement = -1, // The maximum amount of settlers per settlement. -1 or less means infinite
	jobSearchRange = 100, // The tile search range of settler jobs
	zipSaves = true, // If true, will create new saves uncompressed
	MOTD =  // Message of the day
}
```
The older 10-key version (S1, S5) has no `unloadLevelsCooldown`, `worldBorderSize`, `droppedItemsLifeMinutes`, `unloadSettlements`, `maxSettlementsPerPlayer`, `maxSettlersPerSettlement`, `jobSearchRange`, and in S1 `slots` defaults to 10 and `password = ""`.

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `port` | Game port | The UDP port players connect to. Change it only if 14159 is taken or you run several servers. | Network | 14159 | integer | 0-65535 | S1, S2 (range comment); UDP + 14159: S5, S17 |
| `slots` | Max players | How many players can be connected at once. | Network | 10 | integer | 1-250 | S1 (default 10), S2 (range comment), S5 |
| `password` | Server password | Players must type this to join. Leave empty for an open server. | Network | empty (`""`) | string | any text; empty = none. Egg writes it unquoted; the default file shows `""` (quoted form is safe per S1/S5) | S1, S2, S5 |
| `maxClientLatencySeconds` | Max lag before kick | How many seconds a laggy player is tolerated before the server disconnects them. Raise it if players on bad connections keep getting dropped. | Network | 30 | integer (seconds) | any number (no range found); also changeable in-game with `/maxlatency <seconds>` | S1, S2, S5 (meaning), S3 (`/maxlatency`) |
| `pauseWhenEmpty` | Pause when empty | Freezes the world while nobody is online, so crops, settlers and timers do not run with no one there. | Gameplay | true (file); wiki says the launch flag defaults to 0/off | boolean | true, false | S1, S2 (file default true), S3 (flag default 0), S5 |
| `giveClientsPower` | Trust client hits | When true, players' own computers get more say over what hits them and where they are (smoother play, easier to cheat). The wiki lists the matching launch flag as an anti-cheat check that "defaults off", which reads opposite; see UNVERIFIED. | Gameplay / Security | true | boolean | true, false | S1, S2 (comment), S3 |
| `logging` | Write log files | Creates a log file for each server start. | Maintenance | true | boolean | true, false | S1, S2, S3 (flag default 1) |
| `language` | Log language | Language used for some server log messages (two-letter code such as `en`). Cosmetic. | Maintenance | en | string, bare word | language code; the list of valid codes was not found | S1, S2, S3 ("used only for occasional log messages") |
| `unloadLevelsCooldown` | Unload delay | Seconds an area (level) stays loaded in memory after the last player leaves it. Higher keeps things running longer after players leave but uses more memory. | Performance | 30 | integer (seconds) | any number (no range found) | S2 |
| `worldBorderSize` | World border | How far from the spawn point players may travel. -1 means no border. | Gameplay | -1 | integer | -1 = none, or a distance (unit not stated, presumably tiles - UNVERIFIED) | S2 |
| `droppedItemsLifeMinutes` | Dropped item lifetime | Minutes dropped items stay in the world before disappearing. 0 or lower means they never disappear. | Gameplay | 0 | integer (minutes) | 0 or less = forever | S2 |
| `unloadSettlements` | Unload settlements | If true the server unloads player settlements when nobody is near; if false it keeps them loaded (settlers keep working, uses more memory/CPU). | Performance | false | boolean | true, false | S2. NOTE: in old builds (0.21.21) this key was in `worldSettings.cfg` (S5, S7); see conflicts. |
| `maxSettlementsPerPlayer` | Settlements per player | Maximum number of settlements one player may have. -1 or lower means unlimited. | Gameplay | -1 | integer | -1 or less = unlimited | S2; old builds had it in worldSettings.cfg (S5, S7) |
| `maxSettlersPerSettlement` | Settlers per settlement | Maximum number of settlers in one settlement. -1 or lower means unlimited. | Gameplay | -1 | integer | -1 or less = unlimited | S2 |
| `jobSearchRange` | Settler job search range | How many tiles away settlers look for work. Lower values reduce server load in big settlements. | Performance | 100 | integer (tiles) | any number (no range found) | S2 |
| `zipSaves` | Compress saves | Whether saves are stored as compressed zip files. Compressed saves take less disk space. The file's own comment says the opposite ("true will create new saves uncompressed"); the wiki says the flag compresses and defaults to 1. See UNVERIFIED. | Maintenance | true | boolean | true, false | S1, S2 (comment), S3 (flag, default 1), S5 (compresses) |
| `MOTD` | Message of the day | Text shown to players when they join. The docker project says `\n` makes a new line. | Network | empty | string | any text (written quoted in S1/S5, bare/empty in S2) | S1, S2, S5, S17 (`\n`) |

Keys named by other guides that do NOT appear in the generated-file sources (S1, S2, S5): `serverName`, `serverPassword`, `maxClients`, `worldSeed` (S12), `serverMessage`, `worldName` (S19). Treat them as wrong.

## 3. worldSettings.cfg - every key
Example from a current-looking build (S5, difficulty CLASSIC, no `gameVersion` line shown) and an old build (S7, 0.21.21):

```
WORLDSETTINGS = {
    allowCheats = false,
    difficulty = CLASSIC,
    deathPenalty = DROP_MATS,
    raidFrequency = OCCASIONALLY,
    playerHunger = true,
    disableMobSpawns = false,
    forcedPvP = false,
    unloadSettlements = false,
    maxSettlementsPerPlayer = -1,
    dayTimeMod = 1.0,
    nightTimeMod = 1.0
}
```
The newest key list (S6) is: allowCheats, difficulty, deathPenalty, raidFrequency, survivalMode, playerHunger, disableMobSpawns, forcedPvP, allowOutsideCharacters, creativeMode, disableMobAI, canSettlersDie, dayTimeMod, nightTimeMod, gameVersion. The exact current file layout and order was not seen anywhere.

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `difficulty` | Difficulty | How hard the world is. Casual: enemies deal 50% less damage. Adventure: 30% less. Classic: normal. Hard: 30% more damage and 25% less knockback dealt to enemies. Brutal: 100% more damage and 60% less knockback. | Difficulty | CLASSIC | enum | `CASUAL` = Casual, `ADVENTURE` = Adventure, `CLASSIC` = Classic (default), `HARD` = Hard, `BRUTAL` = Brutal. In-game command `/difficulty` takes the lowercase words. Old builds used `NORMAL` (S7). Whether other values are rejected was not confirmed. | file values: S6, S5, S9; effects + default: S4; command words: S13, S14 |
| `deathPenalty` | Death penalty | What a player loses when they die. | Difficulty | DROP_MATS | enum | No penalty = `NONE`; Drop materials = `DROP_MATS` (default; drops all non-equipment, non-combat, non-special items); Drop main inventory (everything except hotbar and equipped); Drop full inventory (everything); Hardcore = `HARDCORE` (character stays dead permanently). EXACT FILE SPELLING of the middle two is conflicting: S6 says `DROP_INVENTORY` and `DROP_ALL`; the command words are `drop_main_inventory` and `drop_full_inventory` (S13, S14). See UNVERIFIED. | descriptions + default: S4; file values: S6, S5, S7; commands: S13, S14 |
| `raidFrequency` | Raid frequency | How often enemy raids attack your settlement. Often = raid cooldown 50% (more raids), Occasionally = 100% (default), Rarely = 400%, Never = no raids. | Difficulty | OCCASIONALLY | enum | `OFTEN` = Often, `OCCASIONALLY` = Occasionally, `RARELY` = Rarely, `NEVER` = Never. `/raids` command takes lowercase words. | S4 (effects/default), S6 (file words), S5, S13, S14 |
| `survivalMode` | Survival mode | Turns the survival rules on: food gets a spoil timer and becomes inedible when it expires, and settlers leave a settlement that has no food for a while. Added in game v0.23.0, on by default. Player hunger can be switched separately. | Difficulty | true | boolean | true, false | S4 (behaviour, default); key name only in S6. Another host's table says this key is about mob spawning, which contradicts S4/S6 (see conflicts). |
| `playerHunger` | Player hunger | Adds a hunger bar; it drains as you move, fight or work, and at 0% you slowly die, so players must eat. | Difficulty | true | boolean | true, false | S4, S16 (behaviour/default), S5, S6, S7 (key) |
| `allowCheats` | Allow cheats | Enables cheat commands for admins. Turning it on disables achievements for that world and cannot be undone. | Rules | false | boolean | true, false | S5, S6, S7 |
| `disableMobSpawns` | Disable monster spawns | Stops monsters from spawning naturally. | Rules | false | boolean | true, false | S5 (meaning), S6, S7 |
| `forcedPvP` | Force PvP | Players can always hurt each other (player-vs-player cannot be switched off). | Rules | false | boolean | true, false | S5, S6, S7 ("True = players will always have PvP enabled") |
| `allowOutsideCharacters` | Allow outside characters | Allows or blocks players bringing in characters that were created elsewhere (other saves/servers). | Rules | UNVERIFIED | boolean | true, false | S6 only |
| `creativeMode` | Creative mode | Unlimited resources and free building. | Rules | UNVERIFIED (presumably false) | boolean | true, false | S6 only |
| `disableMobAI` | Disable monster AI | Freezes enemies so they do not react; meant for testing. | Rules | UNVERIFIED (presumably false) | boolean | true, false | S6 only |
| `canSettlersDie` | Settlers can die | Whether hostile monsters can permanently kill your settlers (town villagers). | Rules | UNVERIFIED | boolean | true, false | S6 only |
| `dayTimeMod` | Day length multiplier | Multiplies how long daytime lasts. 1.0 = normal (a full day/night cycle is 16 minutes: day 6.4 + dusk 1.6 + night 6.4 + dawn 1.6). Higher = longer day. The in-game slider is 50%-500%; the file accepts up to 10. Editing it in an existing world makes the in-game clock show odd times, and a developer called it an "advanced" setting that is rarely wanted at max. | Time | 1.0 | decimal | 0.1 to 10.0 per S6 (max 10 per S7, S11); minimum not otherwise confirmed | S4 (cycle length, slider), S6, S7, S11, S10 (default 1.0, max 10, dev reply, clock oddities) |
| `nightTimeMod` | Night length multiplier | Same as above for the night. Smokescreen's test in S10 found the day:night ratio stays about fixed regardless of the two values, so unequal values may not behave as expected. | Time | 1.0 | decimal | 0.1 to 10.0 per S6 (max 10 per S7, S11) | S4, S6, S7, S11, S10 |
| `gameVersion` | Game version | The game version that wrote the save, e.g. 0.21.21. Written by the game. Do not edit. | Internal | (written by game) | string | version string | S6, S7 |
| `unloadSettlements` | (old builds only) | In 0.21.21 and in S5's example this was a world setting; newer sources put it in `server.cfg` (see section 2). | Performance | false | boolean | true, false | S5, S7 vs S2 |
| `maxSettlementsPerPlayer` | (old builds only) | Same story as `unloadSettlements`: `-1` = unlimited. Now in `server.cfg`. | Gameplay | -1 | integer | -1 = unlimited | S5, S7 vs S2 |

World settings that are fixed at world creation and are NOT keys in this file: spawn seed (5-character code), custom spawn island coordinates, "spawn guide house" (default enabled) - "a new world is needed to change them" (S4). Also the world name is only a label (S4).

When can world settings change? The Necesse Wiki says Death Penalty, Player Hunger, Raid Frequency and Survival Mode ("More World Settings") "can be changed at any time in settings" (S4), and difficulty "can be changed anytime via world settings or the difficulty chat command" (host summary of the game UI; scalacube https://scalacube.com/blog/necesse/necesse-world-settings). Several hosts and commands (`/difficulty`, `/deathpenalty`, `/raids`, `/settings`) confirm in-game changes (S3, S13). One host (S15, unopened) claims the opposite (fixed at creation); the wiki and the existence of the commands argue against that.

## 4. Settings reachable at runtime (admin console / chat)
From S3 (wiki, "Admin" permission unless noted): `/settings <list|setting> [<arg>]` (changes server world settings; setting names not listed anywhere), `/difficulty <list|difficulty>`, `/deathpenalty <list|penalty>`, `/raids <list|frequency>`, `/pausewhenempty <0|1>`, `/maxlatency <seconds>`, `/password [<password>]` (Owner). Value words (lowercase): difficulty casual/adventure/classic/hard/brutal; deathpenalty none/drop_mats/drop_main_inventory/drop_full_inventory/hardcore; raids often/occasionally/rarely/never (S13, S14). Permission levels for `/permissions set <player> <level>`: User, Moderator, Admin, Owner, Server (S5). Console command `stop` stops the server (S2 egg; "Type help for list of commands." is the ready line).

## 5. Launch parameters that mirror server.cfg (S3; full list belongs to 03-launch-args.md)
`-port`, `-slots`, `-password`, `-motd`, `-pausewhenempty <1/0>` (default 0), `-giveclientspower <1/0>` (default off per wiki), `-logging <1/0>` (default 1), `-zipsaves <1/0>` (default 1), `-language`, `-world <name>`, `-owner <name>`, `-settings <file>`, `-datadir`, `-localdir`, `-ip`, `-logs`, `-nogui`, `-ignoreseasons`, `-help`.

## 6. Panel suggestions (not facts)
- Form fields safe to expose from `server.cfg`: slots, password, MOTD, pauseWhenEmpty, maxClientLatencySeconds, giveClientsPower, zipSaves, logging, plus the newer keys only after verifying them against a generated file.
- World rules (difficulty, deathPenalty, raidFrequency, survivalMode, playerHunger, forcedPvP, ...) live in a zipped world; the panel would need to stop the server, unzip, patch, re-zip, or send the `/difficulty`-style commands to the running console instead.
- The parser must handle `//` comments, trailing commas, bare words, and a possibly empty `MOTD =` value.

## UNVERIFIED (count: 15)
1. Whether the game itself writes `cfg/server.cfg` on first start and with exactly which content (the egg writes it first; the key set above is the egg's, not a file the game printed).
2. Exact current `worldSettings.cfg` layout/order and whether the newer keys (`survivalMode`, `allowOutsideCharacters`, `creativeMode`, `disableMobAI`, `canSettlersDie`) are written by default: only S6 (one host, no example file).
3. Defaults for `allowOutsideCharacters`, `creativeMode`, `disableMobAI`, `canSettlersDie`.
4. File spelling of `deathPenalty` values for "drop main inventory" and "drop full inventory": `DROP_INVENTORY`/`DROP_ALL` (S6) vs `DROP_MAIN_INVENTORY`/`DROP_FULL_INVENTORY` (the command words, S13/S14, upper-cased). Only `NONE`, `DROP_MATS` and `HARDCORE` are consistent across sources (HARDCORE only in S6 and command list).
5. Whether `difficulty = NORMAL` (old builds, S7) is still accepted by the current build, and whether unknown enum values are rejected or fall back to default.
6. What `giveClientsPower` really does: file comment (S1, S2: "clients will have much more power over what hits them") vs wiki/docker wording ("anti-cheat client action checks", default off, S3, S17). The file default is `true`.
7. What `zipSaves` really does: file comment says "true = new saves uncompressed" (S1, S2) but the wiki and hosts say true = compressed (S3, S5).
8. Unit of `worldBorderSize` (distance unit not stated; tiles assumed).
9. Valid range/minimum for `maxClientLatencySeconds`, `unloadLevelsCooldown`, `jobSearchRange`.
10. Valid `language` codes.
11. Whether `unloadSettlements` and `maxSettlementsPerPlayer` moved from `worldSettings.cfg` to `server.cfg` (S2 vs S5/S7), and whether the current game still reads them from the world file.
12. Whether `survivalMode` means standard survival rules (S4, S6) or "disable mob spawning" (Shockbyte table seen only in a search summary, https://shockbyte.com/billing/knowledgebase/967/How-to-Configure-your-Necesse-Server.html, page itself returned 403).
13. Minimum for `dayTimeMod`/`nightTimeMod` (0.1 comes only from S6; S10/S11/S7 only state max 10) and whether the file rejects values above 10.
14. Whether `-settings <file>` points at a file with the same `SERVER = {}` format, and the name of the default (a Steam answer mentions a `settings.cfg` next to `server.cfg`, S9, unconfirmed).
15. Plain-folder vs zip layout of a world when `zipSaves` is false, and that editing the unzipped copy works (hosts only describe the zip case).

## Settings found but not confidently explainable
- `/settings <name>` accepts setting names that no source lists.
- `gameVersion` (purpose: guessed from S6 "ties the save to a game version"; do not edit).
- `unloadLevelsCooldown`, `jobSearchRange`: meaning is taken from the egg's one-line comments only, with no second source.
- `worldBorderSize`: only the egg comment; unit unknown.
- Contradicting claims to ignore unless re-verified: `serverName`/`worldSeed`/`maxClients`/`admins.txt` (S12), `serverMessage`/`worldName`/TCP port (S19), `world-settings.cfg` file name (seen only in a search summary of Supercraft), `difficulty = CASUAL/NORMAL/HARD` three-level lists (Supercraft, via search summary), per-key `hunger: true` syntax (PingPlayers, panel-specific).
