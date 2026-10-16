# Terraria / tModLoader - config files and settings (conventions section B)

Researched 2026-10-15, read-only (no server installed or run). Target: **tModLoader (Steam app 1281930) dedicated server, stable release v2026.08.3.0** (GitHub release 2026-10-01; the `stable` branch head commit is titled "[1.4.4] ...", so tML stable is the Terraria 1.4.4 line; a `1.4.5` branch and a preview release v2026.09.2.1 also exist). Vanilla Terraria wiki text is current to 1.4.5.x; where a feature is 1.4.5-only it is flagged.

Terminology: "VW" = Terraria wiki (terraria.wiki.gg) page text read through its MediaWiki API; "TML-cfg" = tModLoader repo file `patches/tModLoader/Terraria/release_extras/serverconfig.txt` (identical on branches `stable` and `1.4.4`, checked by diff); "TML-wiki" = github.com/tModLoader/tModLoader/wiki (cloned); "TML-src" = tModLoader 1.4.4 branch source files read from raw.githubusercontent.com. Raw copies are in `terraria/raw/`.

Source URL shorthands (full URLs):
- VW-Server = https://terraria.wiki.gg/wiki/Server (section "Server config file" and "List of console commands")
- VW-CLI = https://terraria.wiki.gg/wiki/Command-line_parameters
- VW-World = https://terraria.wiki.gg/wiki/World (section "Creation")
- VW-Size = https://terraria.wiki.gg/wiki/World_size
- VW-Diff = https://terraria.wiki.gg/wiki/Difficulty
- VW-Seed = https://terraria.wiki.gg/wiki/World_Seed
- VW-Special = https://terraria.wiki.gg/wiki/Special_world_seeds
- VW-1405 = https://terraria.wiki.gg/wiki/1.4.0.5
- TML-cfg = https://raw.githubusercontent.com/tModLoader/tModLoader/stable/patches/tModLoader/Terraria/release_extras/serverconfig.txt
- TML-CL = https://github.com/tModLoader/tModLoader/wiki/Command-Line
- TML-SMS = https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server (page itself says it is "outdated for 1.4.4 dedicated servers")
- TML-DSU = https://github.com/tModLoader/tModLoader/tree/1.4.4/patches/tModLoader/Terraria/release_extras/DedicatedServerUtils (README.md + manage-tModLoaderServer.sh)
- TML-Usage = https://github.com/tModLoader/tModLoader/wiki/Basic-tModLoader-Usage-Guide
- TML-src base = https://github.com/tModLoader/tModLoader/blob/1.4.4/patches/tModLoader/Terraria/ModLoader/

---

## 0. Files at a glance

| file | where (relative) | format | created by | who edits |
|---|---|---|---|---|
| `serverconfig.txt` | tModLoader install folder (next to `start-tModLoaderServer.bat`); `-config <path>` can point elsewhere, relative paths resolve against the folder holding the server exe (VW-Server) | text, one `key=value` per line, `#` starts a comment line | **Shipped** in the tML install, but every line except `priority=1` is commented out (`#`) in the shipped file (TML-cfg). The start script defaults to `-config serverconfig.txt` if no `-config` is given (`start-tModLoaderServer.sh`, raw/tml_start-tModLoaderServer.sh) | user / panel |
| `banlist.txt` | working directory by default (`banlist=` key) | text, player names + IPs (VW-Server "Banning and un-banning") | game, when a `ban` command is used | game; user may delete lines to unban |
| `Mods/enabled.json` | `<save dir>/Mods/enabled.json` (save dir = `-tmlsavedirectory`, or default Documents\My Games\Terraria\tModLoader, TML-Usage "Saves"). Folder moves with the `modpath=` key | JSON array of mod internal names, e.g. `["ModA","ModB"]` (read as `HashSet<string>`, TML-src ModOrganizer.cs `LoadEnabledMods`) | tML on save of the mods menu; or copied from a modpack | user / panel |
| `Mods/install.txt` | next to `enabled.json` (modpack export folder `.../SaveData/Mods`) | text, one Steam Workshop id per line (management script feeds each line to `+workshop_download_item 1281930 <line>`) | tML "Export Pack Instance" / "Save Enabled as New Mod Pack" | panel (to drive SteamCMD downloads) |
| `Mods/*.tmod` | `<save dir>/Mods` or `modpath` | binary mod files | manual drop or Workshop download | user |
| `Mods/ModPacks/<name>/Mods/{enabled.json,install.txt,tmlversion.txt}` and `.../ModConfigs/` | `<modpath>/ModPacks/` (TML-src UIModPacks.cs) | folder of json/txt | tML UI | user |
| `ModConfigs/<ModName>_<ConfigName>.json` | `<save dir>/ModConfigs/` (TML-src ConfigManager.cs: `Path.Combine(Main.SavePath,"ModConfigs")`, file name `Mod.Name + "_" + config.Name + ".json"`) | JSON, only contains values that differ from the mod's defaults (TML-wiki "Basic JSON & ModConfigs": "only show deviations from the default values ... might just be `{}`") | tML, when a mod config is first saved; a missing file is treated as `{}` (all defaults); a corrupt file is deleted and defaults used (ConfigManager.Load) | user / panel, mod-specific keys |
| `config.json` | `<save dir>/config.json` | JSON, tML/Terraria user preferences (language, ResourcePacks...) | game on first run | not needed for servers (TML-wiki Usage FAQ "Reset config.json") |
| `LastLaunchedMods.txt` | `<save dir>/` (TML-src ModOrganizer.cs) | text | tML | do not edit |
| `Worlds/<name>.wld` + `<name>.twld` | `<save dir>/Worlds` or `worldpath=` | binary world + tML mod-data sidecar | game | `world=` must point to the `.wld`, NOT `.twld` (TML-SMS) |
| `Worlds/Backups/*.zip` | `<save dir>/Worlds/Backups` | zip | tML | (TML-Usage "World and Player Backups") |
| `tModLoader-Logs/server.log` | `<install>/tModLoader-Logs` | text log | tML | read-only (TML-Usage "Logs") |
| `cli-argsConfig.txt` | tML install folder | text, command-line args (separate lines or one line) loaded as if typed (TML-CL "Usage") | user | optional |

---

## 1. serverconfig.txt - vanilla keys (also read by tModLoader)

Rules from sources: format is `key=value`; lines starting with `#` are skipped entirely (VW-Server). tML's patch to the config reader matches keys by prefix, case-insensitively (`text.Substring(0,n).ToLower() == "modpath="`, TML-src `Main.cs.patch` hunk context, raw/Main.cs.patch lines ~1392-1397), so key case is forgiving, but write them lower-case as the shipped file does. "Quotes should not be used" around the value of `world=` (TML-SMS "Starting server headless").

Defaults column: the wikis give **example** values, not true built-in defaults, except where the text says "default". Where only an example exists it is shown as `(example) x`.

### 1.1 World selection and creation

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `world` | World file | Full path to the existing world file (.wld) to load and start automatically. With `autocreate`, the path where a missing world is created. Use the .wld file, never the .twld one. | World | (none; if unset the server asks at startup) | path | any file path ending in `.wld`, no quotes | VW-Server; TML-SMS; TML-cfg |
| `autocreate` | Create world if missing | If the file named in `world` does not exist, make a new world of this size. | World creation | (example) 1 in TML-cfg; wiki example 3 | integer | 1 = Small, 2 = Medium, 3 = Large | VW-Server; VW-CLI; TML-cfg |
| `worldname` | New world name | Name for a world created through `autocreate`. Has no effect on an existing world; no `.wld` needed. World-creation menu limits names to 27 characters. | World creation | (example) `Terraria` / `World` | text | free text | VW-Server; TML-cfg; TML-DSU README ("worldname ... will not work with an existing world"); 27-char limit from VW-World |
| `seed` | World seed | Seed text for an `autocreate`d world; the same seed gives (almost) the same world. Special seed words (e.g. `not the bees`) switch on special worlds. | World creation | (example) `AwesomeSeed` | text | any text; max 40 characters in the in-game menu | VW-Server; VW-Seed; VW-Special |
| `difficulty` | World difficulty | Game mode of an `autocreate`d world; it cannot be changed after creation. | World creation | (example) 1 in TML-cfg; unset = UNVERIFIED | integer | 0 = Classic (wiki "normal"), 1 = Expert, 2 = Master, 3 = Journey | VW-Server (0-3, added 1.4.0.1); TML-cfg comment lists only `0(normal), 1(expert)` (older comment, see section 6) |
| `worldpath` | World folder | Folder where world files are stored and looked up. | World | (example) `...\My Games\Terraria\Worlds\` (vanilla); tML default under `<save dir>\Worlds` | path | folder path | VW-Server; TML-Usage "Saves" |
| `worldrollbackstokeep` | Backup copies to keep | Number of rolling world backups. The wiki writes the key as `WorldRollbacksToKeep` (config.json) and says it can also be set in serverconfig.txt. | World | 2 (config.json hidden-setting default) | integer | 2 or higher enables rolling backups; max 9 | VW-1405 (patch note); https://terraria.wiki.gg/wiki/Config.json_settings. Exact serverconfig.txt spelling/case UNVERIFIED (the wiki uses `"WorldRollbacksToKeep"`) |

### 1.2 Connection

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `port` | Game port | TCP port the server listens on. Players type this after the IP; forward it on your router. (Wiki also says to open UDP too on cloud hosts.) | Network | 7777 | integer | 1-65535 (range not stated; UNVERIFIED) | VW-Server |
| `maxplayers` | Max players | How many players can be connected at once. | Network | 16 per wiki prose (8 before 1.4.0.1); the shipped example file and TML-SMS say 8 | integer | 1 to 255 | VW-Server ("Value must be between 1 and 255"); TML-cfg |
| `password` | Server password | Password players must enter. Empty/absent = open server. | Network | (none) | text | any text | VW-Server; TML-cfg |
| `motd` | Message of the day | Message shown to players when they join. | Network | (none) | text | free text | VW-Server |
| `upnp` | Auto port-forward (UPnP) | Asks the router to open the port automatically. Wiki notes this "does not always work". | Network | (example) 1 | 0/1 | 1 = on, 0 = off (value set inferred from "upnp=1" example; UNVERIFIED that 0 is the only off value) | VW-Server; TML-cfg |
| `npcstream` | Enemy smoothing | Reduces enemies "skipping/teleporting" for players, at the cost of more bandwidth. Lower number = smoother but more data. 0 = off. | Performance | (example) 60 | integer | 0 = off; TML-SMS recommends about 2-6 | VW-Server; TML-SMS |
| `priority` | Process priority | Operating-system priority of the server process. The `-forcepriority` command-line flag overrides this. | Performance | 1 (the only uncommented line of the shipped file) | integer | 0 Realtime, 1 High, 2 AboveNormal, 3 Normal, 4 BelowNormal, 5 Idle | VW-Server; TML-cfg |
| `secure` | Extra cheat protection | Turns on additional server-side anti-cheat checks. | Rules | (example) 1 | 0/1 | 1 = on | VW-Server; TML-cfg |
| `language` | Server language | Language of server console text. | Misc | (example) `en-US` | text | `en-US` English, `de-DE` German, `it-IT` Italian, `fr-FR` French, `es-ES` Spanish, `ru-RU` Russian, `zh-Hans` Chinese, `pt-BR` Portuguese, `pl-PL` Polish | VW-Server; TML-cfg |
| `banlist` | Ban list file | File that stores banned players. | Admin | `banlist.txt` in the working directory | path | file path | VW-Server; VW-CLI |

### 1.3 Journey Mode power permissions (only matter in a Journey-difficulty world)

Legend for the value (VW-Server): `0` = locked for everyone, `1` = only the host can change it, `2` = anyone can change it. Wiki example value is `2` for every key; true defaults not stated (UNVERIFIED). All keys are integers 0/1/2. Added in Terraria 1.4.0.1. Source for all rows: VW-Server (section "Server config file").
The wiki gives **no description per key**; the descriptions below are derived from the key name and the Journey power menu (https://terraria.wiki.gg/wiki/Journey_Mode) and are marked (inferred) where the name is the only evidence.

| key | label | description | group | default | allowed |
|---|---|---|---|---|---|
| `journeypermission_time_setfrozen` | Freeze time | Who may freeze the day/night clock (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_time_setdawn` | Set time to dawn | Who may jump to dawn (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_time_setnoon` | Set time to noon | Who may jump to noon (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_time_setdusk` | Set time to dusk | Who may jump to dusk (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_time_setmidnight` | Set time to midnight | Who may jump to midnight (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_time_setspeed` | Time speed | Who may change how fast time passes (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_godmode` | God mode | Who may turn on god mode (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_wind_setstrength` | Wind strength | Who may set the wind strength (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_wind_setfrozen` | Freeze wind | Who may freeze the wind (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_rain_setstrength` | Rain strength | Who may set the rain strength (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_rain_setfrozen` | Freeze rain | Who may freeze the rain (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_increaseplacementrange` | Block placement range | Who may increase how far away blocks can be placed (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_setdifficulty` | Enemy difficulty slider | Who may change the Journey enemy-difficulty slider (inferred from power menu "Enemy Difficulty"). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_biomespread_setfrozen` | Freeze biome spread | Who may freeze Corruption/Crimson/Hallow spread (inferred from power menu "Infection Spread"). | Journey permissions | (example) 2 | 0, 1, 2 |
| `journeypermission_setspawnrate` | Enemy spawn rate | Who may change the enemy spawn rate (inferred). | Journey permissions | (example) 2 | 0, 1, 2 |

tML caveat: the (outdated) TML-SMS page says "Journey's End config commands are NOT going to work because tModLoader runs on an older version of terraria". That text predates the 1.4.4 port; the 1.4.4 line contains Journey Mode, but whether tML 1.4.4 honours these keys is **UNVERIFIED** (not tested, no tML statement either way for 1.4.4).

### 1.4 tModLoader-only serverconfig.txt keys

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `modpath` | Mods folder | Folder tML scans for `.tmod` files and where it reads/writes `enabled.json` (default is `<save dir>/Mods`). Useful on hosts where the default folder is not accessible. | Mods | `<save dir>/Mods` (TML-src `Path.Combine(Main.SavePath,"Mods")`) | path | folder path, e.g. `./Mods` | TML-CL ("modpath"); TML-cfg; TML-src ModOrganizer.cs line 38 |
| `modpack` | Mod pack to load | Loads ONLY the mods listed in the named pack (a json list of mod names) instead of `enabled.json`. Looked up as `<modpath>/ModPacks/<name>.json`; `.json` is appended if missing. If the pack file is missing or malformed the server throws an error. | Mods | (none) | text | pack name (no extension needed) | TML-CL ("modpack"); TML-cfg; TML-src ModOrganizer.cs `CommandLineModPackOverride` (lines ~495-520). Note: TML-SMS example shows a full path ending in `enabled.json`; the 1.4.4 source resolves a name under `ModPacks`, so prefer a plain name. Full-path behaviour UNVERIFIED |

Command-line only (NOT valid as serverconfig.txt keys, per TML-CL): `savedirectory`, `tmlsavedirectory` (the Terraria wiki/TML-CL say `savedirectory` is "command line only"; `tmlsavedirectory` listed as "Server and Client Command Line Argument"), `steamworkshopfolder`, `nosteam`, `steam`, `lobby`, `skipselect`.
These are covered by the launch-args research (STEP-launch); relevant here because they decide WHERE `Mods`, `Worlds`, `ModConfigs` live: `-tmlsavedirectory <path>` = "Same as savedirectory but /tModLoader won't automatically be appended"; the save directory is "the parent directory of the worlds directory and mods directory" (TML-CL).

---

## 2. World creation values

### 2.1 World size (`autocreate` value) - VW-Size, VW-CLI

| value | label | size in tiles (width x height) | plain description |
|---|---|---|---|
| 1 | Small | 4200 x 1200 | Smallest, fastest to generate, least space and fewest chests/biomes (about 100 life crystals max). |
| 2 | Medium | 6400 x 1800 | Middle size; the in-game default option. |
| 3 | Large | 8400 x 2400 | Biggest, most room per player and most structures (about 403 life crystals max). |

Server RAM guidance from the wiki: "500 MB free RAM for a small world (RAM depends on world size and number of players)" (VW-Server "System requirements"; vanilla figure, modded tML usage is higher and not documented: UNVERIFIED).

### 2.2 Difficulty (`difficulty` value) - VW-Server, VW-Diff, VW-World

| value | label | plain description |
|---|---|---|
| 0 | Classic | The normal, standard game ("Normal" in the menu). |
| 1 | Expert | Tougher enemies and bosses, better loot, boss treasure bags and Expert-only items. |
| 2 | Master | Harder than Expert: even more enemy health and damage, extra drops, one extra accessory slot. |
| 3 | Journey | Creative-style mode: item duplication, time/weather control and an adjustable enemy-difficulty slider. Only Journey characters can join a Journey world, and Journey characters can only play in Journey worlds. |

Note (VW-Server): "Mobile Servers require 1 to be added to the difficulty" - irrelevant for PC/tML. Character difficulty (Classic/Mediumcore/Hardcore/Journey) is a player setting chosen when the character is created, not a server setting (VW-Diff).

### 2.3 Evil biome (Corruption or Crimson)

- In the in-game world-creation menu: Random (default), Corruption, Crimson (VW-World, "Evil biome" rows). 
- **No `serverconfig.txt` key or command-line flag for the evil biome appears in any source read** (VW-Server, VW-CLI, TML-cfg, TML-CL). So an auto-created server world gets whatever the game chooses; whether `autocreate` picks randomly is **UNVERIFIED**.
- Seed format (VW-Seed, written for 1.4.5 but the format section cites the 1.4.4.9 code `UIWorldCreation.ProcessSeed`): a full seed is `size.difficulty.evil.special.identifier`, with size 1-3 (Small/Medium/Large), difficulty 1-4 (Classic/Expert/Master/Journey - note: shifted by +1 compared with the `difficulty=` config key), evil 1 = Corruption, 2 = Crimson. This parsing is documented for the world-creation **menu** text box; whether the dedicated server's `seed=`/`autocreate` path uses it is **UNVERIFIED**. 
- Practical, sourced alternative: create the world in the client (full options) and put the `.wld`+`.twld` in the Worlds folder, then point `world=` at the `.wld` (TML-SMS; VW-Server).

### 2.4 Special world seeds (put in `seed=`) - VW-Special, VW-Seed

Entered as the seed text when auto-creating (documented for the in-game seed box; for the server's `seed=` key it is **UNVERIFIED** that the same matching applies). Codes valid on the tML 1.4.4 line, per the version history on VW-Special:

| seed text | world | in plain words | added in |
|---|---|---|---|
| `5162020` | Drunk world | Both Corruption and Crimson exist together. | 1.4.0.1 |
| `not the bees` | Not the Bees | Bee-themed variant of the world (name and icon only; effects UNVERIFIED). | 1.4.0.1 |
| `for the worthy` | For the Worthy | Much harder world (with Master mode this is called "Legendary"). | 1.4.0.3 |
| `celebrationmk10` (also numbers `5162011`, `5162021`) | Celebration Mk 10 | Anniversary-themed variant world (per icon description). | 1.4.2.3 |
| `constant` / `the constant` / `theconstant` | The Constant | Variant world with a Don't Starve crossover theme (per icon description). | 1.4.3 |
| `no traps` | No Traps | Variant world about traps (name only; effects UNVERIFIED). | 1.4.4 |
| `don't dig up` (1.4.5 normalises it to `dont dig up`) | Remix | Variant world (wiki internal name Remix; effects UNVERIFIED). | 1.4.4 |
| `get fixed boi` | Zenith | Turns on all the other special seeds at once (stated for 1.4.5; on 1.4.4 UNVERIFIED). | 1.4.4 |

Descriptions are one-line paraphrases of the wiki's seed names; the wiki's own in-game description strings are `{{gameText}}` templates and were not expanded, so detailed effects are **UNVERIFIED** here. `skyblock` and combinable multi-seed menus are **1.4.5-only** (VW-Special history 1.4.5.0), not in tML stable. Exact accepted spellings on 1.4.4 may be stricter than the 1.4.5 "lowercase, strip punctuation" rule (that normalisation was introduced in 1.4.5.0 per the same history).

---

## 3. Console commands (useful for the panel's stop/save handling; from VW-Server)

`help, playing, clear, exit (shutdown and save), exit-nosave, save, kick <name>, ban <name>, password [pass], version, time, port, maxplayers, say <message>, motd [message], dawn, noon, dusk, midnight, settle, death, pvpdeath, alldeath, allpvpdeath`. No leading slash needed. Wiki notes the server "will only save on shutdown when using the exit command"; since 1.4.5.0 it also saves when the last player leaves (VW-Server History). tML 1.4.4 adds more commands via mods (not researched).

---

## 4. tModLoader extras in detail

### 4.1 `Mods/enabled.json`
JSON array of internal mod names. Example shape: `["CalamityMod","MagicStorage"]` (shape from TML-src: serialised with `JsonConvert.SerializeObject(ModLoader.EnabledMods, Formatting.Indented)` where `EnabledMods` is a set of strings). If it is missing the server logs "Did not find enabled.json file" and loads no mods; if unreadable it logs a warning and loads no mods (TML-src ModOrganizer.cs lines ~764-780). The management script says "You will need a Mods/enabled.json to contain all Mods that you want enabled, including local mods" (TML-DSU README).

### 4.2 Workshop mods on a server
Workshop mods are NOT downloaded by the game server itself. The official script builds a SteamCMD command with `+login anonymous` and one `+workshop_download_item 1281930 <id>` per line of `install.txt`, with `+force_install_dir <folder>` (manage-tModLoaderServer.sh function `install_workshop_mods`), then starts the server with `-steamworkshopfolder "<folder>/steamapps/workshop"` and `-tmlsavedirectory "<folder>"`. The same script installs tML itself with `+login <steam username> +app_update 1281930` (so anonymous for app 1281930 is **still UNVERIFIED**; see candidates.md). install.txt + enabled.json come from the in-game Workshop -> Mod Packs -> "Save Enabled as New Mod Pack" (TML-DSU README; TML-SMS).

### 4.3 ModConfigs (per-mod settings files)
- Location `<save dir>/ModConfigs/<ModName>_<ConfigName>.json` (TML-src ConfigManager.cs lines 60, 198-199, 228-230). A second constant `ModConfigs/Server` exists in the source (`ServerModConfigPath`); its purpose was not found in the files read: **UNVERIFIED**.
- Two scopes: ServerSide ("shared between all clients and maintained by the server ... gameplay changes") and ClientSide (personal) (TML-src ConfigScope.cs). "When joining a MP server, Client configs are kept but Server configs are synced from the server" (ModConfig.cs). So on a dedicated server only the server-side config values matter and are pushed to joining players. Each mod defines its own keys; the panel cannot know them without reading the specific mod (not researched).
- File holds only non-default values; `{}` means all defaults (TML-wiki). A broken file is deleted and defaults reloaded (ConfigManager.Load).
- A modpack export carries a `ModConfigs` folder: `Mods/ModPacks/<name>/ModConfigs` (TML-src UIModPacks.cs `ModPackConfigPath`).
- Server-side configs can be changed in game by admins/clients only if the mod's `AcceptClientChanges` allows it (ModConfig.cs doc comment).

### 4.4 Clients must match
"tModloader will not connect to non-tModLoader Terraria servers" and vice versa (TML-Usage "Playing with non-tModLoader users"). Per-mod version/client-matching rules were not researched here (see the mods step).

---

## 5. Where world/player/mod data lives (for the panel's paths)

| thing | default Windows path | source |
|---|---|---|
| tML install | `C:\Program Files (x86)\Steam\steamapps\common\tModLoader` (Steam) | TML-Usage |
| tML 1.4.4 save dir ("SAVEFOLDERNAME" = `tModLoader`) | `%UserProfile%\Documents\My Games\Terraria\tModLoader` | TML-Usage "Saves" |
| manual mods | `<save dir>\Mods` | TML-Usage |
| Workshop mods | `...\steamapps\workshop\content\1281930` (Steam client); on a custom server folder `-steamworkshopfolder` | TML-Usage; TML-SMS |
| logs | `<install>\tModLoader-Logs\server.log` (and client.log) | TML-Usage "Logs" |
| vanilla Terraria worlds | `%UserProfile%\Documents\My Games\Terraria\Worlds` (Linux `~/.local/share/Terraria/Worlds/`) | VW-Server (Linux/macOS), https://terraria.wiki.gg/wiki/Config.json_settings (config location) |

For a self-contained panel install, `-tmlsavedirectory <server folder>` puts Worlds/Mods/ModConfigs/config.json inside the server folder (TML-CL; the official script does exactly this with `-tmlsavedirectory "$folder"`).

---

## 6. Discrepancies noticed between sources
1. **Default max players**: VW-Server prose says default 16 (8 before 1.4.0.1); TML-cfg example and TML-SMS say `default=8`. Real default of the tML 1.4.4 server is UNVERIFIED; the panel should always write an explicit value.
2. **`difficulty` values**: VW-Server lists 0-3; the shipped TML-cfg comment only lists `0(normal), 1(expert)` (stale comment). The vanilla values 2 and 3 are expected to work on the 1.4.4-based tML but this was not tested.
3. **Journey permission keys on tML**: see 1.3 caveat.
4. **`modpack` value**: path vs name, see 1.4.
5. **Seed difficulty numbering** (1-4) differs from the `difficulty=` key (0-3).

---

## UNVERIFIED list
1. Anonymous SteamCMD login works for app 1281930 (official script uses a named account; third-party guides use anonymous).
2. Whether `autocreate` without `difficulty=`/`seed=` uses Classic/random (no default stated anywhere).
3. How to choose Corruption vs Crimson for an auto-created server world (no key found); whether `seed=` accepts the full `size.difficulty.evil.special.id` form.
4. Whether `seed=` on the server matches special-seed words the way the in-game box does.
5. True built-in defaults of `autocreate`, `difficulty`, `worldname`, `npcstream`, `secure`, `upnp`, `language`, `maxplayers` (wiki examples only; maxplayers conflicts 8 vs 16).
6. Valid range of `port` (only the default 7777 is stated); valid off-values for `upnp`/`secure`.
7. Exact serverconfig.txt spelling of the rollback-backup key (`worldrollbackstokeep` vs `WorldRollbacksToKeep`); wiki says it works in serverconfig.txt.
8. Whether the 15 `journeypermission_*` keys are honoured by tML 1.4.4 and their defaults; their meanings are inferred from names.
9. Plain-language effects of each special seed (wiki text is templated), and which exact strings 1.4.4 accepts.
10. Purpose of `ModConfigs/Server` path in the tML source.
11. `modpack=` with a full file path (as shown in the outdated TML-SMS page).
12. RAM needs of modded tML servers.
13. Whether stable v2026.08.3.0 is exactly Terraria 1.4.4.9 (only the commit title "[1.4.4]" and the branch name were seen).

## Settings found but not confidently explainable
- `journeypermission_increaseplacementrange`, `journeypermission_setdifficulty`, `journeypermission_biomespread_setfrozen`, `journeypermission_setspawnrate` (best-guess meaning from power-menu names only).
- `ModConfigs/Server` subfolder.
- tML command-line options listed as TOBEADDEDLIST in TML-CL (`-loadlib`, `-publish`, `-ciprep`, `-publishedmodfiles`, `-uploadfolder`, `-experimental`, `-audiodriver`, `-videodriver`) - undocumented there; not needed for hosting.
