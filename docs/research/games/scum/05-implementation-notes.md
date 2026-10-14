# SCUM: implementation notes (2026-10-14)

## Files created (nothing existing was edited, nothing registered, nothing committed)
- `src/server/data/games/scum.js` : `{ template, backup, logs, launchOptions: true }`
- `ui/src/catalog/games/scum.js` : `{ type: "scum", title, files, launch, guide }`
- `ui/src/catalog/games/scumServerSettings.js` : the 409 settings as plain data (`rows([...])`, one setting per line, and `scumGroupOrder`). Generated once from `02-config.md` by a script kept in `scratchpad/scumgen/` (parse.mjs, gen.mjs, overrides.mjs, emit.mjs); the committed file is the product, no generator runs at build time.
- `tests/unit/game-scum.test.js` (21 tests) and `ui/src/__tests__/game-scum.test.js` (15 tests). All pass.
- Registration the lead has to do: `import scum from "./scum.js"` into `GAME_MODULES` and `GAME_UI_MODULES`.

## What the template does
- id/type `scum`, app 3792580 (anonymous), store 513710, `method: "process"`, `processName: "SCUMServer.exe"`, `estimatedInstallBytes` 15.4 GB (depot 3792581 is 15,351,312,202 bytes installed).
- Fields: `sessionName`, `serverPassword`. No `mods` field, no max-players field of its own (the form's optional Max Players is used if sent; default 64, clamped 1 to 128).
- One port, `port` (UDP) default **7870**; `implicitPorts`: +1 raw UDP socket, +2 Steam server-list query (players join on game port + 2). 7870-7872 clash with no existing default and none of the other new modules (starrupture 7780, abiotic/dst 8930..., icarus 17777).
- Start script `Start_SCUM.bat`: `@echo off`, `cd /d "%~dp0"`, `start /MIN "<name>" SCUM\Binaries\Win64\SCUMServer.exe -log -port=<n> -MaxPlayers=<n>`. The title is stripped of `" % & | < > ^` and control characters. Name and password are never on the command line. The exe path is deliberately NOT quoted: the launch-line editor (`parseLaunchArgs`) splits the line at the end of the program name, and a closing quote after `.exe` would be lost on the first edit.
- `buildConfigFile` writes `SCUM\Saved\Config\WindowsServer\ServerSettings.ini` before the first start with `[General]`, `scum.ServerName`, `scum.ServerPassword`, `scum.MaxPlayers` (CRLF, UTF-8, no BOM, one line per value, control characters stripped).
- `backup`: `SCUM/Saved/SaveFiles` (excluding `Logs`) and `SCUM/Saved/Config/WindowsServer`. `logs`: dir `SCUM/Saved/Logs`.

## Catalog
- `ServerSettings.ini`, parser `ini`: **409 settings**, 40 groups (the dossier's own group names, `General: ...`, `World: ...`, `Respawn: ...`, `Vehicles: ...`, `Damage: ...`, `Features: ...`), two dropdowns (`scum.ArmedNPCDifficultyLevel` 1/2/3, `scum.RaidProtectionType` 0..3, both values from the dossier). Yes/no settings are not given choices: the form turns `True`/`False` values into switches by itself.
- Keys are written bare (`scum.ServerName`), not `General::scum.ServerName`. Reason: the dossier's section layout is UNVERIFIED (RespawnHost mentions `[SCUM.ItemSpawning]`-style sections on some builds) and the panel looks a setting up by `Section::Key` and then by key alone, so bare keys keep working whichever section the game files a key under. Zomboid's catalog does the same.
- Descriptions: the source wording tidied (True/False turned into on/off, abbreviations BB/LTZ/MTZ/HTZ spelled out, typos fixed, ends with a full stop) plus the source's default and range with units; "-1 usually means the game uses its own built-in value" is added where the default is -1 (GameServerKings convention in the dossier). The six source notes saying "CONFLICT" were rewritten by hand as "guides disagree on the default, check your file" (AnimalGlobalDensityMultiplier, MaxNonVirtualAnimalsInWorld, TombstoneMaxAmountPerSquad, FishingHighActivityZoneAmount, MaxServerTickRate); about 45 other descriptions or labels were hand-written (overrides.mjs). A test checks that no description contains CONFLICT / UNVERIFIED / UNCONFIRMED / site names / square brackets.
- Launch options (style `equals`, editable): `-log` (explained, not editable, managed), `-port` (managed), `-MaxPlayers` (managed), `-nobattleye` (editable, off by default). Nothing else is listed.
- Guide entry written (summary, the one file, four notes, including "SCUM has no official mod support").

## Deviations from the dossier
1. **Left out besides the 27 you named: `scum.EnableDeenaOnServer`** (the source says only "whether Deena is activated"; nothing explains what Deena is). So 437 - 27 - 1 = 409.
2. `scum.ServerSettingsVersion` is kept (explained: the file's own version, "do not change") but moved from the dossier's group "General: Developer-only" to "General: Settings file", because nothing else is left in the old group.
3. `-QueryPort=` is not in the catalog or the script (UNVERIFIED whether the current build honours it; the wiki says query port = game port + 2 by itself).
4. `-MaxPlayers` is on the launch line and in the ini (same number), as the dossier lists it as panel-managed. Because the argument overrides the ini value, editing `scum.MaxPlayers` alone changes nothing; the `scum.MaxPlayers` description says so.
5. Port default 7870, not the wiki's 7777 (taken by other games here).
6. Files the dossier describes but the Settings tab does not offer: AdminUsers.ini, ServerSettingsAdminUsers.ini, ExclusiveUsers.ini, WhitelistedUsers.ini, BannedUsers.ini, SilencedUsers.ini (plain Steam64 lists, no parser), EconomyOverride.json (every value is a quoted string, and the JSON editor may write numbers back unquoted, which stops the file loading), RaidTimes.json and Notifications.json (arrays of objects), the Loot folder. They are mentioned in the guide notes only.

## Panel limitations for SCUM
- **No graceful stop is guaranteed.** The only documented clean stop is Ctrl+C in the console window (the save database `SaveFiles\SCUM.db` is written on a graceful shutdown; a force-kill may lose the latest state). The panel closes the window and force-kills after 15 s (`stopGraceMs` gives only Satisfactory 30 s). If SCUM needs longer than 15 s to write the database, Stop can lose recent progress. A longer grace for `type === "scum"` would have to be added in `src/server/services/serverControl.js` (not done: existing file).
- No RCON, no console command, so no scheduled "say" messages, no save command, no player list from the game. Health is by process only (`method: "process"`); the Steam query on game port + 2 was not used.
- The ini serializer (`serializeLineKV`) joins lines with `\n`, so editing the file from the form turns CRLF into LF. UE reads that fine, but if the game proves picky, the serializer is shared by all ini games.
- The ini is read only at start and the server rewrites it itself (wipe flags reset to False), so edits must be made while stopped. The form's note says so.

## MUST be verified on a real install
1. `SCUMServer.exe` is the program that stays running (not a launcher for a `SCUMServer-Win64-Shipping.exe`). If a child process is what stays up, `processName` is wrong and the panel will think the server is down.
2. The start script's relative `start ... SCUM\Binaries\Win64\SCUMServer.exe` works from the install folder (the wiki runs it from `Win64`; the Steam guide from the root).
3. A `ServerSettings.ini` holding only `[General]` and three keys is kept by the game: that the game adds the other keys and does not replace the file or ignore it, and that the server really picks up the name, password and player limit from it. Also the real section layout (are the keys under `[General]`? ) and file encoding / BOM / line endings the game writes (the catalog works with any section).
4. That the game makes `ServerSettings.ini` on first start at all when one already exists, and the real key names/defaults: compare a generated file with the catalog (437 keys in the dossier; defaults of the five "guides disagree" settings).
5. Port behaviour: the game really takes game port + 1 and + 2 with `-port=7870`; players find it on 7872; no `-QueryPort` needed; nothing else (TCP 7777 RCON) is listening.
6. What closing the console window (the panel's Stop) does: does the server save `SCUM.db` and exit within 15 s, and are `SCUM.db-shm` / `SCUM.db-wal` gone afterwards?
7. Save location is `SCUM\Saved\SaveFiles\SCUM.db` and logs are in `SCUM\Saved\Logs\SCUM.log` (backup and log paths depend on it); whether a backup of a running server copies the database consistently.
8. Real `-MaxPlayers` ceiling and whether `-log` is needed for the window (kept on, as in Steam's own launch entry).
9. A SteamCMD anonymous install of app 3792580 finishes with "Success! App '3792580' fully installed" and lands the exe at `SCUM\Binaries\Win64\SCUMServer.exe` in the folder root.
10. Whether a player can join a `-nobattleye` server (the catalog does not claim either way).
11. The two dropdown meanings of `RaidProtectionType` and the defaults flagged "check your file" once a real file exists.

## Other notes for the lead
- Nothing in this module needed an existing-file change except registration. Other modules that quote the exe in `start` (icarus.js) will lose their closing quote when the launch-line editor rewrites the line (`parseLaunchArgs` splits at the end of the program name); worth a look at registration time.
- `abiotic` and `dst` both default their game port to 8930.
