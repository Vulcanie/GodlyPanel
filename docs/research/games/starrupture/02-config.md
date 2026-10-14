# StarRupture dedicated server: config files and every setting (conventions section B)

Researched 2026-10-14 for server app 3809400, build id 25642172 (game build CL127004, file `CL127004` in the install root). Ground truth below is marked [INSTALL] = read from the real install in `research\starrupture\server\` (files, the server exe's embedded strings, or the log of a run another agent already did; I did not start anything). [HOST] = hosting company / Docker image docs. [OFFICIAL] = Creepy Jar article. Creepy Jar's own article does NOT mention DSSettings.txt or the password files at all.

Source short names used in the tables:
- S1 = https://xgamingserver.com/blog/starrupture-dssettings-txt-configuration-guide/ [HOST]
- S2 = https://low.ms/knowledgebase/starrupture-server-settings-guide [HOST]
- S3 = https://github.com/indifferentbroccoli/starrupture-server-docker (scripts/start.sh generates the file; README) [HOST]
- S4 = `StarRupture\Binaries\Win64\StarRuptureServerEOS-Win64-Shipping.exe` embedded strings [INSTALL]
- S5 = `StarRupture\Saved\Logs\StarRupture.log` and `...backup-2026.10.14-17.54.34.log` (two earlier runs of this install) [INSTALL]
- S6 = https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34 [OFFICIAL]

## 1. Inventory of config files the server reads

| File | Location (relative to install root = folder with `StarRuptureServerEOS.exe`) | Format | Created by game? | Source |
|---|---|---|---|---|
| `DSSettings.txt` | install root | JSON object, every value a string | NO. Fresh install has none; a first run (without it) did not create it, and a second run with it present did not rewrite it. User/panel must create it. | S4 (string `DSSettings.txt` in exe), S5, S1 |
| `Password.json` | install root | JSON, one hash (see section 3) | NO, written by the user/panel | S4 (string in exe), S1/hosts |
| `PlayerPassword.json` | install root | JSON, one hash (see section 3) | NO, written by the user/panel | S4, hosts |
| `SRServerWithLog.bat` | install root | batch, 1 line: `start .\StarRuptureServerEOS.exe -Log` | shipped by SteamCMD install | [INSTALL]; S6 says args may reset on update |
| Standard Unreal ini files (`StarRupture\Saved\Config\WindowsServer\*.ini`, `Engine.ini` etc.) | `StarRupture\Saved\Config\WindowsServer\` | ini | NOT present in the install. Only `Engine\Config\StagedBuild_StarRupture.ini`, `Engine\Saved\Config\WindowsServer\Manifest.ini` (`[Manifest] Version=2`) and `StarRupture\Saved\Config\CrashReportClient\...\CrashReportClient.ini` exist. The game logs no custom ini reading. Nothing documented by any host. | [INSTALL] directory listing |
| Launch arguments | command line | see section 4 | n/a | S5 shows the run command line |
| `ServerUtility.ini`, `modloader.ini` | `StarRupture\Binaries\Win64\ModLoader\Plugins\config\` | ini | only with the AlienX mod loader (not vanilla) | see `04-mods.md` |

No other server config file is documented or shipped. Game rules (difficulty, sandbox options, player count, PvP...) are not exposed in any file: DSSettings has 5 keys, and the log shows the session max players is fixed at 4 (`EOS_SessionModification_SetMaxPlayers() set to (4)`, S5). No difficulty / sandbox settings were found anywhere (S1, S2, S3, exe strings searched for MaxPlayers; only the engine's `net.MaxPlayersOverride` console variable string exists).

## 2. DSSettings.txt

- Location: install root, same folder as `StarRuptureServerEOS.exe` (S1: "same directory as the server executable"; S4 reads the name `DSSettings.txt` and the keys below).
- Format: a single JSON object. ALL five values are JSON strings, including numbers and booleans (S1 JSON examples, S2 example, S3 start.sh template). Validate JSON, UTF-8, no trailing comma (S1). Whether real JSON numbers/booleans are also accepted is UNVERIFIED (nobody documents it; the exe holds the keys as text).
- Effect of its existence [INSTALL, S5]: without the file the server stays on the idle map `/Game/Chimera/Maps/DedicatedServerStart` and nothing else happens (run 1). With `{"SessionName":"ResearchTest","SaveGameInterval":"60","StartNewGame":"true","LoadSavedGame":"false","SaveGameName":"AutoSave0.sav"}` present (run 2) the log shows `UCrDedicatedServerSettingsComp::LoadMainMap called` then a server travel to `/Game/Chimera/Maps/ChimeraMain/ChimeraMain` and the experience source changes from `Default` to `WorldSettings`. So the file is read at startup and a world is created from it with no game client. Not observed: the file being rewritten (its modification time was unchanged by the run) and a `SaveGames` folder being created (the run was stopped about 13 s after the world loaded, before the 60 s interval).
- Exe strings in the same block as the file name (S4): `DSSettings.txt`, `.sav`, `SaveGameName`, `SaveGameInterval`, `StartNewGame`, `LoadSavedGame`, error texts `StartNewSessionLocal() - Session already exist`, `LoadSavedGameLocal() - Session doesn't exists`, `LoadSavedGameLocal() - Save game doesn't exists`. `SessionName` is also a known name in the exe. No other key names occur next to them, so the key list below is complete for this build (an undocumented sixth key cannot be fully excluded: UNVERIFIED).

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| `SessionName` | World / save name | Name of your world. Also the name of its save folder (`StarRupture\Saved\SaveGames\<SessionName>\`), so changing it makes a new, empty save slot and does not delete the old one. Keep it short; the Docker image limits it to 20 characters. | World | `MySaveGame` per S1 (the Docker image and Pterodactyl egg use `StarRuptureServer`; the server has no built-in default because it never creates the file) | string | any text; avoid characters not allowed in a Windows folder name (inference, UNVERIFIED); 20-character limit only from S3 | S1, S2 (save path), S3 |
| `SaveGameInterval` | Autosave every (seconds) | How often the world is saved automatically, in seconds. Hosts suggest 180 to 600; very short values can cause lag spikes from disk writes. | World | `300` (as string) | string holding an integer (seconds) | number as text, e.g. `"300"`. Range limits not documented (UNVERIFIED) | S1 (default 300, advice 300-600), S2 ("3 to 5 minutes sensible", says no official default), S3 (default 300) |
| `StartNewGame` | Create a new world on start | `"true"` creates a brand-new world at server start; the world is recreated on every start while this stays `"true"`, so switch it back to `"false"` once the world exists. | World | `false` (as string) | string, boolean-like | `"true"` or `"false"` (dropdown: Yes / No) | S1, S2, S3; behavior also seen in S5 |
| `LoadSavedGame` | Load the saved world on start | `"true"` loads the save named in `SaveGameName` when the server starts, so the world comes back after a restart or crash. With `"false"` the server does not load a save (it idles, or builds a new world if StartNewGame is true). | World | `true` (as string) | string, boolean-like | `"true"` or `"false"` (dropdown: Yes / No) | S1, S2, S3 |
| `SaveGameName` | Save file to load | File name of the save inside the `SessionName` folder to load, including `.sav`; case-sensitive. Autosaves rotate (`AutoSave0.sav`, `AutoSave1.sav`...). The server itself writes/loads `AutoSave0.sav` on the command-line route. | World | `AutoSave0.sav` | string | an existing `.sav` file name; `""` is shown for new worlds in S1 | S1 (case-sensitive, `.sav`), S2 (rotation), S3 (default) |

Notes:
- Combinations that hosts describe: new world = StartNewGame `"true"` + LoadSavedGame `"false"`; running world = StartNewGame `"false"` + LoadSavedGame `"true"` + SaveGameName `AutoSave0.sav` (S1, S2, S3).
- What happens if both are `"true"` or both `"false"`: not documented. The exe has the error `StartNewSessionLocal() - Session already exist`, which suggests a StartNewGame on an existing session name is refused or loops; UNVERIFIED.
- The panel's form should keep StartNewGame false after the first start (suggest the panel flips it itself after the world is created).
- Panel-relevant: the server does not change this file, so values stay as written.

### Game rules that are NOT in any file
The in-game Manage Server menu (client main menu > Manage Server) sets password, new/load game and start. Exe function names of the server's settings component `UCrDedicatedServerSettingsComp` [INSTALL, S4]: `AdminConnect`, `CheckPassword`, `GetPlayerPasswordPresent`, `GetSavedSessions`, `GetSessionSaves`, `IsPasswordSet`, `LoadMainMap`, `LoadSessionSave`, `SetPassword`, `SetPlayerPassword`, `SetSaveGameInternal`, `SetStartNewGame`, `StartNewSession`, `TestMethod`; status words `PASSWORDSET`, `PASSWORDINCORRECT`, `SESSIONSTARTING`, `LOADSESSIONFAILED`, `SETPLAYERPASSWORDFAILED`, `PLAYERPASSWORDSET`; console command names `autostartmainmap`, `WebControl.StartServer`. These are the remote-management calls (the TCP interface on the game port, see 01-basics.md security note). They mirror the DSSettings keys (`SetSaveGameInternal` = SaveGameInterval, `SetStartNewGame`, `LoadSessionSave`, `StartNewSession`), which suggests the five keys are the complete set. No difficulty or player-limit setter exists among them.

## 3. Password.json and PlayerPassword.json

| file | purpose | source |
|---|---|---|
| `Password.json` | Admin ("Manage Server") password | pingplayers, 4netplayers, low.ms |
| `PlayerPassword.json` | Join password players type when joining | same |

- Location: install root. File names are case-sensitive per pingplayers; wrong names or place = server ignores them and players join without password. https://pingplayers.com/knowledgebase/starrupture/how-to-set-admin-and-player-passwords-on-your-starrupture-server
- Exe holds both names (`Password.json`, `PlayerPassword.json`), plus an embedded RSA public key in base64 right next to them (starts `AQAB` for the exponent, then a long modulus) [INSTALL, S4]. That matches the community statement that the server never accepts plain text, only an RSA-encrypted value produced by https://starrupture-utilities.com/passwords/ (PHP + OpenSSL; form fields `adminpassword` and `playerpassword`; blank in gives blank out). Source: that page, via web fetch 2026-10-14. The scheme itself (padding, how the server verifies) is not documented: UNVERIFIED. The key is an RSA public key; the matching private key must live on that site, so a panel cannot create valid values offline without calling that third-party site.
- JSON structure (conflicting):
  - `{ "Hash": "<long encrypted string>" }` - pingplayers (the only source that shows it).
  - `{"password":"<encrypted>"}` - what the indifferentbroccoli Docker image writes (scripts/functions.sh, `generate_password_files`; it takes `.adminpassword` / `.playerpassword` from the API response).
  - 4netplayers says "paste the hash between the empty `""`", and the website has "JSON To Copy" and "Copy Hash Only" buttons; no key name given.
  - Binary check: neither `Hash` nor `password` as a key name could be located next to the file names in the exe (short strings are shared with engine text). Not resolved: UNVERIFIED which key the server actually reads. Safest panel behaviour: do not generate these files; if the user already has files, show them read-only or paste whole file content from the utilities site ("Copy file" button).
- Placeholder form (no real secret): `{ "Hash": "<paste hash from starrupture-utilities.com>" }`.
- Admin password minimum length: 6 characters (pingplayers/4netplayers; a forum user said 8). Join password: no minimum documented. 4netplayers also says the admin password is "currently only used for the Servermanager" and "currently disabled for security reasons" (their words; unconfirmed).
- Deleting a file removes that password and never touches the save: https://low.ms/knowledgebase/reset-change-starrupture-passwords-management-join , https://xgamingserver.com/docs/starrupture/password-reset ("Deleting password files does NOT delete world saves or server settings"). After deleting, the join password can be set again in-game via Manage Server (xgamingserver).
- To change a password: replace the file content with the new hash while the server is stopped (4netplayers: "stop the server" first).
- Does the server create/rewrite these files? When set from the in-game Manage Server menu (`SetPassword`, `SetPlayerPassword` exist in the exe) it presumably writes them; not observed here. UNVERIFIED.

## 4. Launch arguments that behave like settings (cross-reference for the launch step)
Observed in the real log [S5] as accepted without errors: `-Log -Port=17977 -QueryPort=17978 -RCWebControlDisable -RCWebInterfaceDisable` (the log line is `LogInit: Command Line: ...`; the server then listened on UDP port 17977 as `IpNetDriver listening on port 17977`). "Accepted" only means no error appeared; the log does not show whether each flag does anything (QueryPort in particular: no query-port listener line appears). Other: `-Port=` (official `-port=`), `-multihome=`, `-ServerName=` (S3 start.sh passes it; no effect shown), `-Log`. The AlienX plugin adds `-SessionName`, `-SaveGameInterval` etc. but only with the mod loader.

## 5. Panel summary (what a form should expose)
- Five DSSettings keys: SessionName (text), SaveGameInterval (seconds), StartNewGame (Yes/No), LoadSavedGame (Yes/No), SaveGameName (text).
- Write all values as JSON strings; always write the full file (5 keys).
- No difficulty / sandbox / max player / PvP options exist in config for this build; max players fixed at 4 in the session (S5).
- Passwords: separate files, hash only; no safe offline generation.

## UNVERIFIED list
1. Whether JSON booleans / numbers (not quoted) are accepted in DSSettings.txt.
2. Whether there is any undocumented sixth DSSettings key (exe shows only the five; SessionName confirmed only as a known name).
3. Behaviour when StartNewGame and LoadSavedGame are both true or both false, or when StartNewGame is true for a SessionName that already has a save.
4. Valid character set and length of SessionName (20 only from the Docker image) and valid range of SaveGameInterval (min/max).
5. Real default of SessionName (S1 says `MySaveGame`; the server has no built-in default because it never creates the file).
6. Whether the server ever writes or edits DSSettings.txt (not in the observed 13-second run; a longer run was not done).
7. JSON key inside Password.json / PlayerPassword.json (`Hash` vs `password`) and the RSA scheme details; whether the server writes these files itself from the in-game menu.
8. Admin password minimum length (6 vs 8); whether admin password is actually used on dedicated servers (4netplayers claims disabled).
9. Whether DSSettings is read from the install root only or also from the current working directory (host guides all put it next to the exe; the panel's start script should `cd` into the install root).
10. Whether a byte-order mark or CRLF line endings are tolerated (file in the install uses CRLF, no BOM, and was read successfully in run 2: CRLF confirmed fine, BOM untested).
11. Whether `-QueryPort`, `-ServerName`, `-RCWebControlDisable`, `-RCWebInterfaceDisable` change anything (accepted without error only).
12. Where the save really lands on a Windows run (no save was written within the observed run).

## Settings found but not confidently explainable
- None in DSSettings.txt (all five are understood). The server's internal names `autostartmainmap` and `WebControl.StartServer` (exe strings, probably console variables/commands) are not explained by any source; do not expose them.
- The base64 RSA public key embedded in the exe near the password file names: purpose inferred from context only.

Counts: 5 DSSettings keys documented; 2 password files; 12 UNVERIFIED items.
