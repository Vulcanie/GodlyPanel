# Icarus: implementation notes

Built 2026-10-14 from the dossier (01-04). Files (all new, nothing existing was edited):
- `src/server/data/games/icarus.js` (template, backup, logs, launchOptions)
- `ui/src/catalog/games/icarus.js` (type `icarus`, 1 settings file with 12 settings, 11 launch arguments, guide)
- `tests/unit/game-icarus.test.js` (23 tests, node:test), `ui/src/__tests__/game-icarus.test.js` (17 tests, vitest). All pass.

Registration still to do by the lead: add `icarus` to `GAME_MODULES` and `GAME_UI_MODULES`, then run `npm run build:guides`
(docs/LAUNCH_ARGUMENTS.md and docs/GAME_SETTINGS.md must be regenerated, tests/unit/guides.test.js checks them). I tried exactly this
in a scratch copy of the repo: the whole vitest suite (229) and the node unit suite passed, apart from three tests that only fail
because the copy lacks README.md / electron files.

## What was built
- Template `icarus`: method `process`, app 2089300, store 1149460, fields `sessionName`, `serverPassword`, `adminPassword`
  (labels overridden through `fieldMeta`), ports `port` 17777 and `queryPort` 17779 (both UDP; the official query default 27015 is
  Core Keeper's template default, so the query port follows the panel's "game + 2" block layout instead).
- Start script `Start_Icarus.bat`:
  `start /MIN "<name>" "Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe" -Log -SteamServerName="<name>" -PORT=<p> -QueryPort=<q>`
  No `-CreateProspect`: the server waits in its lobby (or resumes the last world, ResumeProspect=True).
- Settings file `Icarus\Saved\Config\WindowsServer\ServerSettings.ini` written before the first start with the official 12-key
  template: JoinPassword from the server password, AdminPassword from the admin field (random if blank, never empty), MaxPlayers from
  the form's max-players box (8 when blank), SessionName filled with the name (documented as doing nothing).
- Server entry: `processName` `IcarusServer-Win64-Shipping.exe`, `configPaths` `{ "ServerSettings.ini": ... }` (+ `configPath`).
- Backup: Prospects folder, Config\WindowsServer, PlayerBanList.txt, AdminWhitelist.txt (missing ones are skipped). Logs: dir
  `Icarus/Saved/Logs`.
- Name and title in the script go through `batSafeName` (removes `" % & | < > ^`, control characters, caps 64 characters, the game's
  limit for `-SteamServerName=`). Passwords are not in the script.
- UI: ini parser, section `/Script/Icarus.DedicatedServerSettings`, groups Server / Access / Idle behaviour / Lobby permissions /
  World at startup. Launch form offers `-SteamServerName`, `-PORT`, `-QueryPort`, `-MULTIHOME`, `-ResumeProspect`.

## Deviations from the dossier / choices
1. Process started is the Shipping exe directly (as WindowsGSM, FireDaemon, Pterodactyl, mornedhels do), not `IcarusServer.exe` that the
   official docs use. This is why `processName` is `IcarusServer-Win64-Shipping.exe`. The dossier lists this as UNVERIFIED either way.
2. MaxPlayers is written as 8 when no value is given (the official template leaves it empty; 8 is the documented maximum and XGamingServer's
   default). Avoids relying on an empty integer.
3. AdminPassword is generated when the admin field is blank (official template has it empty, which lets anyone become admin).
4. Query port default 17779 instead of 27015 (see above). Runtime ports come from the panel's allocator anyway.
5. `method: "process"`, not `gamedig`: gamedig has an `icarus` entry (protocol `valve` on 27015), but no source confirms the server answers A2S,
   and a wrong guess would show the server offline forever.
6. `-CreateProspect` and `-LoadProspect` are explained in the launch list but `edit: false`. The launch editor writes a new value with spaces
   as `"-CreateProspect=a b c d"` (whole argument quoted); Unreal's command-line reader is documented only for `-Name="a b c d"`. The
   same two settings are offered as `CreateProspect` / `LoadProspect` in ServerSettings.ini, which has no quoting question.
7. The `-LOG=` (log file) argument is not a separate entry: the guide generator treats flags that differ only by case as the same link, and
   `-Log` (window) already exists. It is described inside `-Log`'s text. `-ABSLOG=` is listed (not editable).
8. The `-Log`, `-UserDir`, `-saveddirsuffix`, `-ABSLOG` arguments are not editable: changing them hides files the panel reads.
9. `AllowNonAdmins...`, `ResumeProspect` are plain switches; the form keeps the file's `True`/`False` capitalisation (toBoolString).

## Left out and why
- Mods: the dossier recommends no create-form field and no loader (no official mod path; `.pak` files in `Icarus\Content\Paks\mods`). Nothing
  added. A "mods folder note / open folder" is a panel feature outside this module.
- Prospect-type dropdown / difficulty field: difficulty exists only inside the CreateProspect string; a dropdown of ~105 internal names
  (Prospect-Names page) would need a compound-value editor. Not built. The CreateProspect description explains the format with the official example.
- `-maxplayers=`, `-JoinPassword=`, `-NOSTEAM`, other Unreal arguments: third-party only, UNVERIFIED in the dossier.
- `Engine.ini` `[OnlineSubsystemSteam] AsyncTaskTimeout=60` (Docker images' Steam-timeout workaround): reason unknown, not on Windows evidence.
- "Custom World Settings" (Arachnophobia mode etc.): per-world, set from the in-game menu, saved in the prospect file; no file or argument.
- implicitPorts: none documented; the panel's default "port after the game port is kept free" applies.

## Limitations of the panel for this game
- No graceful stop. There is no RCON and no stop command (`ReturnToLobby` only kicks players). The panel asks the window to close and
  force-kills after its 15 s. Whether a closed window saves the world is not documented (the dossier recommends 60-90 s grace; the
  panel's `stopGraceMs` in `src/server/services/serverControl.js` only has Satisfactory at 30 s; adding `icarus` there is the lead's call).
  Players should leave / the world should have autosaved before a stop.
- No player count: the status is "process running" only.
- Update: `app_update 2089300 validate` may or may not remove `Icarus\Content\Paks\mods` (dossier UNVERIFIED 3 for mods).
- Firewall: generic path (UDP game port, UDP query port). The panel needs both forwarded.

## MUST be verified on a real install
1. Which process stays running when the script launches `Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe` directly from the server
   folder (that `processName` matches, the server works without `IcarusServer.exe`, no `steam_appid.txt` needed).
2. That `Icarus\Saved\` really is inside the install folder (official Server-Setup) and not `%localappdata%\Icarus\` (official Config page);
   if it is the latter the settings file, backup and Logs tab point at the wrong place (`-UserDir=` semantics: is the value the Saved folder
   or its parent?).
3. That the game reads the pre-written ServerSettings.ini (passwords actually apply; the file is not replaced on the first lobby), and that
   `MaxPlayers=8` and values above 8 are accepted.
4. What closing the console window (the panel's stop) does: is the world saved, how long it takes, whether 15 s is enough.
5. That `-SteamServerName="..."` appears in the server browser, and a name with spaces survives the "no window" (direct launch) mode.
6. Whether the query port answers A2S (then `method: "gamedig"` with type `icarus` could give player counts).
7. The log is written to `Icarus\Saved\Logs\Icarus.log` when started this way.
8. Windows prerequisites on a clean PC (DirectX End-User Runtime, VC++), and the 20 GB / RAM guidance.
9. `PlayerBanList.txt` / `AdminWhitelist.txt` names and location (community wiki only) for the backup list.
10. Behaviour of `CreateProspect` in the ini when the save name exists; and the idle behaviour (back to lobby after 300 s empty), which
    means a returning player meets the lobby, not the world.
