# Squad - implementation notes (built 2026-10-16 from research/squad/01..04; nothing run on a real install)

## Files created (new files only)
- src/server/data/games/squad.js (template, backup, logs, launchOptions: true) - NOT registered in index.js (lead does that)
- ui/src/catalog/games/squad.js ({ type "squad", title, files: {}, launch, guide }) - NOT registered
- tests/unit/game-squad.test.js (node:test), ui/src/__tests__/game-squad.test.js (vitest)

## What was built
- Template: id/type "squad", method "process", updateAppId 403240, storeAppId 393380, installLayoutRoot "", estimatedInstallBytes 15 GB.
- processName `SquadGameServer.exe` (wiki start script). The earlier `SquadServer.exe` has no source.
- Start script (.bat, Start_Squad.bat): `start /MIN "<title>" SquadGame\Binaries\Win64\SquadGameServer.exe Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=80 RANDOM=NONE -log`.
  `Port=` is deliberately FIRST (the other arguments end in "port="; every wiki example has Port= first; reason is a precaution, not a source).
- Ports: port 7787 (+ implicit offset 1 = 7788), queryPort 27165, beaconPort 15000 (custom key). Checked by test against every other template's defaults (including implicit ports): no clash.
- Fields: sessionName, mods. No serverPassword (no official Server.cfg key; ServerPassword is third-party/UNVERIFIED), no mapCode (rotation is file based), no rconPassword.
- Server.cfg: `patchInstalledConfig` changes ServerName="..." (double quotes kept) and MaxPlayers in the shipped file if there is one (other content untouched), else creates a small file (ServerName, ShouldAdvertise=true, IsLANMatch=false, MaxPlayers). Name with `"` or line break is refused.
- Rcon.cfg written via buildExtraFiles with the wiki's template and EMPTY Password (wiki: empty keeps RCON off). Deviation from dossier's "write Rcon.cfg with Password and Port": see RCON below.
- Max players: default 80 (wiki start script / Docker), accepted 1-100 (highest value the wiki prints). The same number goes to FIXEDMAXPLAYERS and Server.cfg MaxPlayers (their interaction is UNVERIFIED #12).
- Mods: field `mods` (Workshop ids or links, max 30). postWrite runs per id `steamcmd +force_install_dir <install> +login anonymous +workshop_download_item 393380 <id> +quit` (one call per id, as the wiki script), MOVES `steamapps\workshop\content\393380\<id>` to `SquadGame\Plugins\Mods\<id>` (same drive, no doubled disk use), removes `steamapps\workshop` afterwards, warns if the mod's top level has no Content folder/.uplugin (nested-too-deep rule). A failed mod is a warning, not fatal. No launch argument, no ModsConfig.cfg line (syntax UNVERIFIED), rotation files not touched. Download happens once at creation only (the dossier's "update on start" toggle is not built).
- Backup: SquadGame/ServerConfig and SquadGame/Saved/Config/WindowsServer. Mods deliberately excluded (huge). Logs: dir SquadGame/Saved/Logs.
- UI launch definition: 14 arguments, style "equals". Port, QueryPort, beaconport, -log are managed and edit:false; editable: MULTIHOME, FIXEDMAXPLAYERS, RANDOM (dropdown NONE/ALWAYS/FIRST), FIXEDMAXTICKRATE, -fullcrashdump, RCONIP, RCONPORT, RCONPASSWORD, RCONMAXCONNECTIONS, RCONSECONDSBEFORETIMEOUTCHECK.
- Guide: summary + 11 notes (settings files, admins, no join password, maps, stop, no player count, ports, prerequisites, mods, licensing, unverified).

## Launch-line editor check (answer to the brief)
ui/src/configParsers/launchArgs.js matches "equals" arguments by `flag=` prefix (case-insensitive) and keys by `flag` stripped of a leading -/+ only if present. It does NOT require a dash for equals/value arguments, so `Port=7787` style works and the form is ON. Conditions: (1) the editor finds the launch line with `/\s[-+]\w/`, so a dash argument must be on the line - `-log` is always written (and is edit:false); (2) new arguments are appended at the END, fine for Squad (no last-argument rule documented); (3) tests confirm round-trip byte-for-byte and in-place edits.

## Settings files left out (and why)
- Server.cfg / Rcon.cfg / VoteConfig.cfg: Key=value, but ui/src/configParsers/properties.js (lineKV) does not fit the real shape: it skips only lines starting with `;` or `#`, not `//`, so comment lines containing `=` become fake settings (`//   RCONIP=0.0.0.0` in Rcon.cfg, `// ForceNonSeamlessTravelIntervalSeconds=43200` in the wiki Server.cfg); it joins lines with `\n` (drops CRLF); ServerName is shown with its double quotes in the value. convarCfg.js splits at whitespace, not `=`. Therefore `files: {}` and the entry records no configPath/configPaths (so the Settings tab does not fall back to the INI parser for .cfg). Follow-up that would enable them: let lineKV treat `//` as a comment (new option) and add a quoted-value mode; then a `Server.cfg` catalog (dossier 02-config.md section 1 has ~30 explained keys) could be added.
- Admins.cfg, LayerRotation/LevelRotation/LayerVoting etc., ExcludedX, ServerMessages, MOTD, Bans: not Key=value; only described in the guide.
- Game.ini/Engine.ini (Unreal ini): created by game, wiki only mentions tournament mode and crash upload; not offered.
- PREFERPREPROCESSOR (marked UNTESTED, no format) left out of the launch catalog.
- Server.cfg keys only in third-party sources (ServerPassword, EnforceTeamBalance, ...) not used.

## Panel limitations for this game
1. **Ports section cannot rewrite the script.** serverPorts.js / scriptPorts.js SCRIPT_FLAGS regex requires a leading `-` or `?` (`-port=`); Squad's `Port=` has none. Changing ports in the Ports UI would only change the panel's record and warn "wasn't found in this server's files". Hence the Port/QueryPort/beaconport launch args are edit:false and the guide says to edit the .bat by hand. Suggested panel fix (existing file, for the lead): make the dash optional in `flagPattern`/`detectFromScript` for this type, or accept `(?:^|\s)-?`.
2. **beaconPort and query+1 (27166) are not tracked** by portOwners/clash checks (only port, queryPort, rconPort and offsets from the game port are). A second Squad server on the same PC could be given a clashing beacon port only if the person picks one; automatic suggestion takes beacon from the RCON pool.
3. **No player count / no graceful stop**: method "process" (RCON ShowServerInfo JSON is not something the panel does). Stop = window close, force kill after 15 s (stopGraceMs default). Documented clean stop is Ctrl+C. Nothing to save is documented, so low risk.
4. **RCON**: entry has NO rconPort/rconPassword on purpose - serverControl.stopServer sends a Source-RCON stop command whenever both exist, which Squad is not known to understand. Rcon.cfg is written with an empty password (RCON off).
5. patchInstalledConfig logs "Set the server's ports in: ..." (generic text in serverCreationService); cosmetic.
6. Mods only at creation; no update on start; Workshop collections not resolved; dependencies not resolved (UNVERIFIED for Squad).
7. Licensing: nothing implemented; guide only repeats the dossier (unlicensed servers appear in Custom Servers; licensed >= 60 slots and >= 10 admins, key in License.cfg).

## MUST be verified on a real install
1. After SteamCMD 403240: does `SquadGame\Binaries\Win64\SquadGameServer.exe` exist, and is it the process that stays running (not a launcher with a differently named child)? Check Task Manager path; processName depends on it.
2. Which files exist in `SquadGame\ServerConfig` right after install (Server.cfg, Rcon.cfg ...)? Is the patched Server.cfg (ServerName in quotes, MaxPlayers) kept, and is the server visible in the browser/by IP?
3. What MapRotationMode / rotation file the shipped Server.cfg has; does the server start a map with nothing else configured (if the file was created by the panel with no MapRotationMode)?
4. That `Port=` first / keys without dash work: ports actually bound (UDP 7787, 7788; query 27165/27166; beacon 15000) with `netstat`; what the defaults are when a flag is omitted.
5. That `-log` opens a console window and that closing it (panel Stop) ends the server within 15 s; compare Ctrl+C.
6. That Rcon.cfg with empty Password leaves nothing listening on 21114.
7. Workshop download: that `workshop_download_item 393380 <id>` with anonymous login puts files in `<install>\steamapps\workshop\content\393380\<id>`, that the folder has Content/.uplugin at its top level, that the move works and the server loads the mod (log prints the modded layers).
8. The launch form in the UI: open Settings > Launch options on the created server, edit RANDOM and FIXEDMAXPLAYERS, confirm the new line starts.
9. Whether `Port=` as the first argument really matters (the precaution), and case-sensitivity of keys.
10. Firewall: which of the listed ports must be open for friends to join; whether Steam must be closed.
11. FIXEDMAXPLAYERS vs Server.cfg MaxPlayers behaviour when they differ.
