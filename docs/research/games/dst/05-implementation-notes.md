# Don't Starve Together: implementation notes (id/type `dst`, server app 343050, store app 322330)

## What was built (new files only, nothing existing edited, nothing registered)

- `src/server/data/games/dst.js` : `{ template, backup, logs, launchOptions: true }`. Also exports `cleanClusterToken` and `parseWorkshopIds`.
- `ui/src/catalog/games/dst.js` : `{ type: "dst", title, files: { "cluster.ini" }, launch, guide }`.
- `tests/unit/game-dst.test.js` (36 tests, node:test) and `ui/src/__tests__/game-dst.test.js` (16 tests, vitest). Both pass.

To finish: add `dst` to `GAME_MODULES` and `GAME_UI_MODULES`, then run `npm run build:guides` (the committed `docs/` guides are checked by `helpGuides.test.js`). I could not run the global catalog/guide tests because that needs the registration.

## Scope: a single overworld shard (Master), no Caves

The panel runs one process per server and a DST cluster with caves is two processes (Master + Caves), so version 1 runs only the `Master` shard with `shard_enabled = false` in cluster.ini (the game's own single-shard form; observed in the test runs: "Shard server mode disabled by configuration file"). This is said in: the sessionName field label in the create form ("overworld only, no Caves"), the Launch options intro, and the game settings guide summary. Adding Caves later means a second server entry/process, a shared cluster folder, `shard_enabled = true`, `cluster_key`, `master_ip`/`bind_ip`/`master_port`, a Caves `server.ini` with its own ports, and a stop order; none of that is in this version.

## Template

- `type`/`id` `dst`, `method: "process"`, `installLayoutRoot: ""` (SteamCMD installs straight into the server folder: `bin64`, `mods` are in the root), `sharedInstall: false`.
- `processName`: `dontstarve_dedicated_server_nullrenderer_x64.exe` (dossier: the exe is started directly, no launcher exe; one process per shard, this server has one).
- Start script `Start_DST.bat`: `cd /d "%~dp0bin64"` (the exe must start from bin64), then
  `start /MIN "<title>" dontstarve_dedicated_server_nullrenderer_x64.exe -console -persistent_storage_root "%~dp0data" -conf_dir DoNotStarveTogether -cluster Cluster_1 -shard Master -port N -steam_master_server_port Q -steam_authentication_port N+2`.
  The window title is stripped of `" % & | < > ^ !` and control characters. Nothing else from the form (name, password, token) reaches the script. `deriveLaunch` reads this script back correctly (tested, so "no window" mode works).
- Ports (UDP): `port` default 8930 (game port, `-port`), `queryPort` default 8933 (the Steam master server port, `-steam_master_server_port`; the panel records it as the query port). Implicit ports: +1 kept free (precaution), +2 = Steam authentication port (`-steam_authentication_port`). The block is 8930 to 8933, which clashes with no template default. DST's own defaults (10999 / 27016 / 8766) were not used because 27016 is Sons of the Forest's default and 8766 is its game port. The shard link `master_port` (10888) is unused with one shard.
- Fields: `["sessionName", "serverPassword", "clusterToken", "mods"]`, with `fieldMeta` labels for `sessionName` (says overworld only), `clusterToken` and `mods`.
- `resolveParams` (runs in `createServer` before the download starts) validates the token and the mod list and returns `{ clusterToken, mods, modIds }`, so a bad value is refused up front.
- Files written: `data\DoNotStarveTogether\Cluster_1\cluster.ini` (buildConfigFile), `...\Master\server.ini`, `cluster_token.txt` (only when a token was given, the token alone with no newline), and with mods `mods\dedicated_server_mods_setup.lua` plus `...\Master\modoverrides.lua`.
- cluster.ini content: `[GAMEPLAY] game_mode = survival, max_players (form value or 8), pvp = false, pause_when_empty = true, vote_enabled = true`; `[NETWORK] cluster_name, cluster_description (empty), cluster_password, offline_cluster (true when no token, false with one), lan_only_cluster = false, autosaver_enabled = true`; `[MISC] console_enabled = true, max_snapshots = 6`; `[SHARD] shard_enabled = false`.
- server.ini: `[SHARD] is_master = true` and `[ACCOUNT] encode_user_path = true` (as in the game's own file in the test runs). No ports in it: the launch line wins over server.ini (confirmed in the dossier's run 2), so writing them would only create a second, stale copy after a port change.
- Entry: `configPath` and `configPaths { "cluster.ini" }`, `queryPort` recorded, no RCON, no token stored anywhere (the entry, the job state and the panel never hold it beyond the file).
- `backup`: the whole `data/DoNotStarveTogether/Cluster_1` folder (world in `Master/save`, settings, admin/ban lists), excluding `cluster_token.txt`. `logs`: `Master/server_log.txt` and `Master/server_chat_log.txt` (both seen in the test runs). Paths are relative to the working folder, which is the server folder.

## The cluster token: done as a template field

The create form renders any name in `template.fields` as a text box (label from `fieldMeta[f].label`, value kept in the form state and sent in the POST body, then spread into the params), so `clusterToken` needed no change to existing files. Behaviour: with a token the cluster is online (`offline_cluster = false`) and `cluster_token.txt` is written; without one the cluster is offline (LAN only), which needs no token, and the job gets a warning if the game port is outside 10998 to 11018 (the range the wiki gives for LAN servers, which the panel's suggested ports (8000+) will normally not be in).
A token can be added later by putting it alone in `<server folder>\data\DoNotStarveTogether\Cluster_1\cluster_token.txt` and turning off "Offline server" in the Settings tab; the guide and the setting's description say so.

Limitation / panel change that would be needed (not done, would edit `CreateServerPage.jsx`): the field is a plain visible text box. A masked box needs a `type: "password"` branch in `renderField` (about 4 lines: `type={meta?.type === "password" ? "password" : undefined}` on the generic `TextField`). Until then the token is visible on screen while typed. The field is also not cleared after the job; it only exists in the browser's form state.

## Mods: implemented as the dossier recommends, to the extent possible

`mods` field (the existing "Mod IDs" field name, with a DST-specific label): Steam Workshop ids or Workshop links, comma/space/semicolon separated, each must be a number of 5 to 12 digits (anything else is refused, so nothing but digits reaches the Lua files), at most 100. Written as `ServerModSetup("<id>")` lines in `<server>\mods\dedicated_server_mods_setup.lua` and `["workshop-<id>"] = { enabled = true }` in `Master\modoverrides.lua`. Not done from the dossier:
- Looking each id up with Steam's `GetPublishedFileDetails` (title, client-only warning) and expanding collections with `GetCollectionDetails`: a network call in `resolveParams` is a new failure mode; collection ids are therefore not supported (a collection id would be written as a mod and do nothing). The label tells people client-only mods do not belong on the server.
- `-ugc_directory` sharing and the `-only_update_server_mods` / `-skip_update_server_mods` sequence: that is for several shards. With one shard the default per-shard folder is used and the server updates mods at start. `-skip_update_server_mods` and `-ugc_directory` are in the Launch options form for people who want them.
- A form for each mod's options: the option names exist only in the downloaded mod's `modinfo.lua`. `modoverrides.lua` has no parser, so it is not in the Settings tab.
- The panel's SteamCMD update runs `app_update 343050 validate`, which the wiki says may remove installed mods; `dedicated_server_mods_setup.lua` may be reset by it (a 2016 forum report). Re-create the list after an update if mods stop loading. The panel's create/update flow cannot omit `validate` without editing `serverCreationService.js` (and the update service).

## Left out of the catalog, and why

- `worldgenoverride.lua`, `leveldataoverride.lua`, `modoverrides.lua`, `dedicated_server_mods_setup.lua`: Lua, no parser (as instructed). The 236 world options in the dossier are therefore not offered. `worldgenoverride.lua` is not written, so the game builds the world from its default preset.
- `Master/server.ini` as a Settings file: after hiding what the launch line owns (ports) there is nothing editable left, so only `cluster.ini` is a settings file; the file name in the Settings tab is `cluster.ini`.
- cluster.ini keys the dossier marks unverified: `cluster_intention` (removed from the game in 2022 per a secondary source), `cluster_language`, `[ACCOUNT] dedicated_lan_server`. `encode_user_path` is written (Klei's own examples have it) but not explained.
- The whole `[SHARD]` section of cluster.ini (hidden with `excludeSections`): `shard_enabled`, `bind_ip`, `master_ip`, `master_port`, `cluster_key` only matter with a second shard.
- Launch flags: `-lan`, `-backup_logs` (deprecated), `-token`, `-master_port`, `-external_port`, `-ownernetid`, `-ownerdir`, `-sigprefix`, `-use_session_identifier`, `-secondary_log_prefix`, the `-cloudserver*` family and the engine flags (undocumented). Listed in the form (editable): `-port`, `-steam_master_server_port`, `-steam_authentication_port`, `-bind_ip`, `-backup_log_count`, `-ugc_directory`, `-skip_update_server_mods`. Listed but not offered (`edit: false`): `-console`, the four folder flags, `-only_update_server_mods` (left on the line the world never starts), `-offline` (use the cluster.ini setting), `-players`/`-tick` (they would override cluster.ini), `-disabledatacollection`, `-monitor_parent_process` (behaviour on Windows unknown).
- adminlist.txt / whitelist.txt / blocklist.txt: plain id lists, not in the catalog (no parser). With a token, the token's owner is admin when adminlist.txt is empty.

## Deviations from the dossier

1. `pause_when_empty = true` and `max_players = 8` are written (the game's defaults are false and 16): panel choices for a friends' server, stated in the setting descriptions.
2. The offline/online switch is the cluster.ini key `offline_cluster`, not the `-offline` flag, so it shows in the Settings tab. The flag was exercised in the test runs; the INI key is documented by Klei's guide and the wiki but was not seen in a run.
3. Ports are on the command line (`-port`, `-steam_master_server_port`, `-steam_authentication_port`) and not in server.ini, as the dossier advises for panel-managed ports. `master_server_port` is the entry's `queryPort`; the authentication port is not in the entry, it is implicit (game port + 2).
4. Default ports 8930/8933 (not the game's 10999/27016/8766) to avoid other templates' defaults, and because the panel's own port suggestion starts at 8000 anyway.
5. `-console` is always passed (the dossier: harmless, deprecated, console input proven with it in the test runs).

## Panel limitations for this game (read these)

1. **No clean stop.** DST saves on exit only through its own `c_shutdown()` command, entered in the console (stdin). The panel stops a `process` game by asking the window to close and force-killing after 15 s; `taskkill` without `/F` usually cannot close a console program. A stop therefore normally ends in a forced kill, which does not write the world. Only the end-of-day autosave (`autosaver_enabled = true`, which the Settings description stresses) protects progress; up to a day of game time can be lost on every Stop, restart or update. A proper fix needs a stop mechanism the panel does not have (write `c_shutdown(true)` plus newline, plain ASCII, no BOM, to the process's stdin and wait; the dossier saw this save and exit in about 2 s in a test harness, but only for a process whose stdin the harness owned). The start script cannot add this itself because the panel launches it with `start`.
2. **Changing the game port from the Ports section moves only `-port`.** `scriptPorts.js` knows the flags `port/publicport/serverport` and `queryport/reliableport`, so `-steam_master_server_port` is not rewritten and `-steam_authentication_port` (game port + 2) stays on its old number; the panel then warns it did not find the query port in the files. The Launch options form can edit both; the description of each says so. A one-word fix: add `"steam_master_server_port"` to `SCRIPT_FLAGS.queryPort` in `src/server/util/scriptPorts.js`; the authentication port would need a third key.
3. The cluster-token box is not masked (see above).
4. **Process lookup:** the panel finds the process by image name and folder (`findServerProcesses` only counts programs running from inside this server's folder), so two DST servers on one PC are told apart correctly. Do not add `taskkill /IM` anywhere for this game.
5. Several shards need several processes; not supported (see scope).

## Must be verified on a real install

1. The create flow end to end: SteamCMD installs 343050 into the server folder, `bin64\dontstarve_dedicated_server_nullrenderer_x64.exe` exists, and the start script runs it.
2. A start with the written `cluster.ini` + `server.ini` and **no token**: `offline_cluster = true` makes it start offline (the test runs used `-offline`); check the log for `Online: false`, and that a game port outside 10998 to 11018 (e.g. the panel's 8000+ suggestions) really starts. If it refuses, the validation belongs in `resolveParams`.
3. A start with a real token: cluster_token.txt accepted (no `E_EXPIRED_TOKEN` from a trailing character), server listed, player can join with the game port forwarded.
4. `-persistent_storage_root "<path>"` with the quotes the script writes, and a server folder path that contains spaces (not tested anywhere in the dossier).
5. That the game does not rewrite cluster.ini keys the panel needs (it may add keys such as `cluster_intention`; check what it writes back) and that the Settings tab shows the file correctly, including `pause_when_empty`.
6. The ports: `-port`, `-steam_master_server_port`, `-steam_authentication_port` all take effect (the "About to start a server" block shows `ServerPort`, `SteamAuthPort`, `SteamMasterServerPort`), and two DST servers on one PC start together without a clash. Whether the Steam ports must be open to the internet for the server list (only the game port is certain).
7. Stop from the panel: what actually happens (graceful close or forced kill after 15 s) and whether the world is intact on restart; try a Stop right after a day change and mid-day.
8. Mods: that `mods\dedicated_server_mods_setup.lua` is read from that path (the dossier's sources are third-party, and the wiki does not give the path), that Master\modoverrides.lua enables them, that the x64 exe loads Workshop mods (conflicting forum reports), and that a panel update with `validate` does not delete them.
9. Backup of the cluster folder while the server runs, and a restore (the world files in `Master\save` are written by the running game).
10. The two log files exist under `Master\` and the Logs tab shows them (names seen in the test runs, with the game started from this script).
11. Whether `-bind_ip` and `-backup_log_count` behave as described (their effects are unverified in the dossier).
12. The Windows Firewall rule: the exe tries to add itself and gets "access denied" without admin; the panel's own rule for the game port is needed.
