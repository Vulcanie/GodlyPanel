# StarRupture: implementation notes (2026-10-14)

## Files created (no existing file edited, nothing registered, nothing run on the game)
- `C:\GodlyPanel\src\server\data\games\starrupture.js` (template, backup, logs, launchOptions: true)
- `C:\GodlyPanel\ui\src\catalog\games\starrupture.js` (type, title, files, launch, guide)
- `C:\GodlyPanel\tests\unit\game-starrupture.test.js` (21 tests, pass)
- `C:\GodlyPanel\ui\src\__tests__\game-starrupture.test.js` (14 tests, pass)

The lead must add one line to each `games/index.js` (`GAME_MODULES`, `GAME_UI_MODULES`) and regenerate the generated guides (`docs/GAME_SETTINGS.md`, `docs/LAUNCH_ARGUMENTS.md`) because the guide tests compare them with the catalog.

## What was built
Template: id/type `starrupture`, displayName "StarRupture", method `process`, updateAppId 3809400, storeAppId 1631270, not shared, `installLayoutRoot ""`, fields `["sessionName"]` only (label "World Name ... up to 20 characters"), one port: `port` "Game Port (UDP)" default **7780** (7777 is the game default but Conan and Satisfactory use it; the panel keeps 7781 free as the usual companion-port precaution).

Start script `Start_StarRupture.bat`:
```
@echo off
cd /d "%~dp0"
start /MIN "<name>" StarRuptureServerEOS.exe -Log -Port=<port> -RCWebControlDisable -RCWebInterfaceDisable
```
The window title is stripped of `" % & | < > ^ !` and control characters (falls back to "StarRupture"). The world name is not in the script at all, only in DSSettings.txt (through JSON.stringify), so no user text reaches cmd except that title.

`buildConfigFile` writes `DSSettings.txt` in the install root before the first start:
`{"SessionName":<name>,"SaveGameInterval":"300","StartNewGame":"true","LoadSavedGame":"false","SaveGameName":"AutoSave0.sav"}` (pretty-printed, all five values strings, no BOM). SessionName: characters illegal in a Windows folder name removed, cut to 20 characters, trailing dots/spaces removed, falls back to `StarRuptureServer`.

Server entry: type/method process, `configPath` and `configPaths {"DSSettings.txt": ...}` (so the Settings tab lists the file), `processName` **`StarRuptureServerEOS-Win64-Shipping.exe`**, workingDir/installDir, updateAppId, autoUpdate false. No serverPassword, no rcon, no queryPort recorded.

Backup (all base `working`): `StarRupture/Saved/SaveGames`, `DSSettings.txt`, `Password.json`, `PlayerPassword.json` (missing ones are skipped). Logs: dir `StarRupture/Saved/Logs`.

UI catalog: DSSettings.txt as parser `json`, 5 settings (SessionName, StartNewGame and LoadSavedGame as Yes/No dropdowns with values `"true"`/`"false"`, SaveGameName, SaveGameInterval), groups World and Saving, `mayBeMissing` text. The form keeps string values as strings (it only converts when the existing value is a boolean/number), so the file stays all-strings. Launch options: 5 arguments: `-Log` (managed, not editable), `-Port` (managed, editable), `-multihome`, `-RCWebControlDisable`, `-RCWebInterfaceDisable` (both managed, editable). Guide notes cover the New/Load flip, 4-player limit, passwords, UDP-only forwarding.

## Deviations from the dossier / decisions
- processName is the Shipping exe, the launcher is what the script starts. The game's own log names the Shipping exe as the running executable and shows the launcher's arguments on its command line, so the launcher passes them on. Whether the launcher exits or stays resident is unobserved.
- Start script includes `-RCWebControlDisable -RCWebInterfaceDisable`: they were accepted without error in the real log and the community setups use them; their effect is UNVERIFIED (dossier). The descriptions say "community setups ... as a precaution" and do not claim they fix the reported hole.
- No serverPassword field: the join password needs a value only starrupture-utilities.com can produce (RSA, key held on that site), and the JSON key (`Hash` vs `password`) is unresolved. Backups include the two password files if the user put them there.
- No `maxPlayers` use: the create form still shows an optional "Max Players" box (existing UI), the template ignores it.
- 20-character cap on the world name comes from one Docker image README only; it is a conservative cut, not a verified game limit.
- Left out of the catalog: `-QueryPort`, `-ServerQueryPort`, `-ServerName`, `-MaxPlayers` (effects unverified or contradicted), all mod-loader-only arguments (`-SessionName`, `-SaveGameInterval`, `-RconPort`, `-RconPassword`, `-console`), generic Unreal flags. No mods field, no mod folder button (dossier recommends none for v1).
- No RCON/query: `method: "process"`. The panel cannot show player counts for this game.

## Limitations of the panel for this game
1. **First-start world flip.** The panel writes `StartNewGame "true"` / `LoadSavedGame "false"` so the first start builds a world (without it the server idles with no world and there is no way to make one without a game client plus the password files). It cannot flip them afterwards: there is no panel hook for it. Until the user changes them (Settings tab: Create new world = No, Load saved world = Yes), **every start makes the world again**. The Settings text, the field description and the guide say so. Best fix for the lead if wanted: a one-off post-first-start edit of DSSettings.txt in the panel (not possible as a new file alone).
2. No graceful stop. The panel closes the window (taskkill without /F), then force-kills after 15 s. Whether that triggers a final save is unknown; the game saves every `SaveGameInterval` seconds (300 default), so up to 5 minutes can be lost. The only clean save route found is the third-party ServerUtility mod's RCON, not used.
3. No query/RCON, so no player list or "online" check beyond the process.
4. No join password or admin password from the panel (see above). Without `PlayerPassword.json` anyone with the address can join.
5. TCP on the game port serves the in-game Manage Server screen and has a reported unauthenticated remote-code-execution flaw (third-party plugin README). The panel's firewall helper (type not special-cased) asks for UDP only on the game port, which is the right thing here.
6. Windowless mode launches the launcher from the script's line directly; if the launcher exits and the Shipping child keeps running the panel's process-by-path matching still works (processName + install folder).
7. The Steam client route for the official `SRServerWithLog.bat` is not used; its arguments reset on updates, the panel's own script does not.

## MUST be verified on a real install
1. Start the created server from the panel: does `StarRuptureServerEOS.exe` leave the Shipping exe running, and does the panel see it (`processName` match, path inside the install folder)? Does it still show as running after the launcher exits?
2. First start with the written DSSettings.txt: world is created (log: `LoadMainMap`, travel to `ChimeraMain`), players can join over UDP on the chosen port from another PC.
3. After flipping to StartNewGame "false" / LoadSavedGame "true": a restart loads the world; does the save really land in `StarRupture\Saved\SaveGames\<SessionName>\AutoSave0.sav` (+ `.met`) on Windows? (Backup paths and the SaveGameName default depend on this.)
4. What happens on a second start with StartNewGame still "true": does it overwrite the save, refuse (`Session already exist`) or make a second one?
5. Stop from the panel: does closing the window / taskkill write a save before exit? Compare the newest save time with and without waiting for the autosave.
6. Whether the server reads DSSettings.txt when started via the panel's script (cwd = install folder) and in "No window" mode (direct launch with the working folder set to the install folder).
7. Whether `-RCWebControlDisable -RCWebInterfaceDisable` change anything (e.g. TCP on the game port still answers or not).
8. Whether a session name with spaces works as a save folder name and as `SessionName` (default in the dossier has none) and what the real length limit is.
9. Whether JSON written by the form (2-space indent, LF line endings) is read fine (the real tested file was compact with CRLF).
10. The panel's Settings-tab form on a file that does not end with a newline and is named `.txt` (route and parser are by catalog, not by extension; expected to work).
11. Windows Firewall prompt for the launcher exe / Shipping exe on first start; whether the first-start rule must name the Shipping exe.
12. Defender/redistributables: `_CommonRedist` exists in the install; whether VC++ runtime needs installing on a clean PC.
