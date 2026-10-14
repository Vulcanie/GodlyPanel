# Don't Starve Together: launch arguments (STEP-launch)

Researched 2026-10-14 for server build 756039 (`version.txt` of app 343050; Windows, 64-bit exe, log line `Don't Starve Together: 756039 WIN32`, `Mode: 64-bit`). Exe: `bin64\dontstarve_dedicated_server_nullrenderer_x64.exe` (32-bit twin: `bin\dontstarve_dedicated_server_nullrenderer.exe`). The exe has no `-help` output; usage text is printed only when a flag gets a bad value (see [BIN]).

No server was installed or started in this step. The evidence below comes from files an earlier step already produced under `research\dst\` (an installed server copy, its extracted text strings and the logs of three test runs). I only read them.

## Source legend

| Tag | Source | Strength |
|---|---|---|
| [BIN] | Text strings extracted from the shipped x64 exe (build 756039): `research\dst\raw-launch\strings_x64.txt`, `flags_strings_x64.txt` (every `-flag` literal), `usage_messages_x64.txt`. Same list for the 32-bit exe in `flags_strings_x86.txt` (only difference: an extra `-jsh`). | Strongest for "the flag exists", its value form and its numeric range. Says nothing about what a flag does unless a message does. |
| [LOG] | Server logs of test runs on this PC: `raw-launch\run1_stdout.txt`, `run2_stdout.txt`, `log_consoleflag.txt`, `log_noconsole.txt`, and the resulting files in `research\dst\run_storage\`. Each log prints `Command Line Arguments: ...` and the effective settings. | Strong: observed behaviour of build 756039 |
| [BAT] | Klei's own shipped `server\bin\scripts\launch_preconfigured_servers.bat` | Strong (Klei, shipped) |
| [KLEI-DEV] | Klei developer guide "Dedicated Server Command Line Options Guide", Feb 2016 + replies: https://kleiforums.com/forums/topic/64743-dedicated-server-command-line-options-guide/ (raw: `raw\forums_kleientertainment_com_forums_topic_64743-...txt`) | Official but 2016; the binary has since changed (see conflicts) |
| [WIKI] | https://dontstarve.wiki.gg/wiki/Dedicated_Server (raw `raw\wiki_dedicated.txt`, section 5 "Command line options") | Community wiki, maintained |
| [LINUX] | Klei forum "2022 updated dedicated server quick setup guide: Linux" https://kleiforums.com/forums/topic/140715-2022-updated-dedicated-server-quick-setup-guide-linux/ (raw `raw\linuxguide.txt`) | Klei staff-style guide, user-edited |
| [WIN] | Klei "Dedicated Server Quick Setup Guide: Windows" https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/ (see 01-basics.md) | Official |
| [BUG] | Klei bug tracker r1398, a log pasted by a user whose game launched a client-hosted server: https://kleiforums.com/klei-bug-tracker/dont-starve-together/dedicated-server-failed-to-start-r1398/ (raw `raw\bug_dedicated-server-failed-to-start-r1398.html`) | Real command line, no explanation |
| [EGG] | Pterodactyl DST egg https://github.com/pterodactyl/game-eggs/blob/main/dont_starve/egg-don-t-starve-together.json | Community working example |

## 1. Recommended command for the panel (one process per shard)

Run from the `bin64` folder:

```
dontstarve_dedicated_server_nullrenderer_x64.exe -persistent_storage_root "<absolute path>" -conf_dir <name> -cluster <name> -shard Master
dontstarve_dedicated_server_nullrenderer_x64.exe -persistent_storage_root "<absolute path>" -conf_dir <name> -cluster <name> -shard Caves
```

- Minimal form is exactly what [WIKI] gives: `-persistent_storage_root`, `-conf_dir`, `-cluster`, `-shard` (the first two optional). Klei's own batch uses `-console -cluster <name> -shard <Master|Caves>` ([WIN], 01-basics.md section 6).
- Test-run proof that these four work together and that the files are created where the flags say: [LOG] run1 started with `-persistent_storage_root <abs path> -conf_dir DST -cluster Cluster_1 -shard Master -offline -skip_update_server_mods`; log line `PersistRootStorage is now <abs path>//DST/Cluster_1/Master/`; the game then created `DST\Cluster_1\cluster.ini`, `Master\server.ini`, `Master\save\`, `Master\backup\`, `server_log.txt`, `server_chat_log.txt`.
- The server wrote default `cluster.ini` and `server.ini` itself when they did not exist (observed in [LOG]: after run1 the folder contained `cluster.ini` with `[GAMEPLAY] game_mode = survival`, `[NETWORK] cluster_name = research test`, `[SHARD] shard_enabled = false`, and `server.ini` with `server_port = 10999`, `is_master = true`, `encode_user_path = true`; the `cluster_name` was set by the earlier test step, so the exact first-run defaults of cluster.ini are not proven here). This answers basics-UNVERIFIED #2 for a missing `cluster.ini`/`server.ini` in the offline single-shard case.
- Cluster token location confirmed by log: `Token file not found: <root>/<conf_dir>/<cluster>/cluster_token.txt` (the file is looked up inside the cluster folder, even with `-offline`). [LOG run1]
- Working directory: the exe was started with its own folder `bin64` as working dir (steam launch config, 01-basics.md section 2). `bin64\steam_appid.txt` contains `322330`, so the `SteamAppId` env variable that Klei's bat sets is not needed for the x64 exe ([BAT] sets `SteamAppId=322330`/`SteamGameId=322330` only because it starts the exe from `bin`). Source: file read in `server\bin64\steam_appid.txt`.
- Klei's shipped bat uses `-conf_dir` with a different name per shard and no `-cluster`/`-shard` at all (`-conf_dir DoNotStarveTogether_EasyConfigOverworld -console` and `...EasyConfigCaves -console`): a legacy way to run two separate worlds; not what a panel should use. [BAT]

### Flag precedence and traps (all from [KLEI-DEV], [WIKI], confirmed where marked [LOG])

- `-port`, `-players`, `-tick`, `-steam_master_server_port`, `-steam_authentication_port` override the same settings in the INI files. Confirmed in [LOG run2]: `server.ini` said `server_port = 10999`, the command line said `-port 11005`, the server reported `ServerPort: 11005`, `SteamAuthPort: 8800`, `SteamMasterServerPort: 27040`, `MaxPlayers: 10`, and `Network tick rate: U=30(1)`. A panel that passes them on the command line must not also show an editable INI field for the same thing (the INI value would be silently ignored).
- Unknown behaviour for bad values (what the exe does after printing "Invalid parameter provided...", does it exit): UNVERIFIED (not run).
- Quoting of paths with spaces: the exe logs the arguments unquoted (`Command Line Arguments: -persistent_storage_root C:\...\run_storage -conf_dir DST ...`); no source tests a path containing a space, UNVERIFIED. Use a path without spaces for `-persistent_storage_root` if possible; the wiki wants "absolute path", and the exe warns `[WARNING] It looks like you're passing a relative path to -persistent_storage_root. Please use an absolute path.` [BIN]

## 2. Argument table: game-specific and server flags

Columns: flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source.

Form legend: "space" = `-flag value` (every value flag in this exe is space-separated; the usage strings in [BIN] all show `-flag <value>` with a space, and every observed command line in [LOG], [BUG], [LINUX] and [EGG] uses a space). Equals form (`-flag=value`) is never shown in any source and is UNVERIFIED as accepted.

### 2a. Where the files live (Saves and logs)

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-persistent_storage_root` | space | value (absolute path) | Data folder root | The base folder where the server keeps its settings, saves and logs. The full path to a shard is `<root>\<conf_dir>\<cluster>\<shard>`. Must be an absolute path (the game warns when it is relative). | Saves and logs | `-persistent_storage_root D:\GodlyPanel\servers\dst1` | any absolute path | Windows `%USERPROFILE%\Documents\Klei`, Linux `~/.klei`, macOS `~/Documents/Klei` | Yes (save path). Every server should get its own folder so two panels or two users never share `Documents\Klei` | [KLEI-DEV], [WIKI], [BIN] usage `-persistent_storage_root <AltPersistentStorageRoot>` + relative-path warning, [LOG] |
| `-conf_dir` | space | value (single folder name, no slashes) | Config folder name | The name of the folder under the data root that holds the clusters. | Saves and logs | `-conf_dir DoNotStarveTogether` | one folder name, no slashes (Klei: "should not contain any slashes") | `DoNotStarveTogether` | Yes (fixed by the panel; keep it the same for all shards of one server) | [KLEI-DEV], [WIKI], [LOG] (`-conf_dir DST` produced `...\DST\Cluster_1\`) |
| `-cluster` | space | value (folder name) | Cluster (world) folder | The folder with `cluster.ini` and the shard folders. One cluster = one world with its shards (Master/Caves). | Server | `-cluster MyDediServer` | a folder name (the folder must contain `cluster.ini`; per the dev guide the server expects `<root>/<conf_dir>/<cluster>/cluster.ini`) | `Cluster_1` | Yes | [KLEI-DEV], [WIKI], [WIN], [LOG] |
| `-shard` | space | value (folder name) | Shard (level) folder | Which shard of the cluster this process runs; names the subfolder with `server.ini`. Run one process per shard. The name is the FOLDER name, not the `name =` entry inside server.ini (a Klei forum regular confirms this). | Server | `-shard Master`, `-shard Caves` | any shard folder name; `Master` and `Caves` are the conventional ones | `Master` | Yes | [KLEI-DEV], [WIKI], [LOG], folder-vs-ini-name confirmation in [KLEI-DEV] thread reply by alainmcd, Feb 2017 |
| `-ugc_directory` | space | value (absolute or relative path) | Shared Workshop mod folder | Where "V2" Steam Workshop mods are downloaded. By default every shard downloads its own copy under `ugc_mods\<cluster>\<shard>` in the server folder; pointing all shards to one folder saves disk space and start-up time. | Advanced | `-ugc_directory ../ugc_mods` | any path (relative paths are relative to the server process's working directory, i.e. `bin64`) | `<server install>/ugc_mods/<cluster>/<shard>` | Optional; panel can set it when it manages mods. Only matters when Workshop mods are used | [WIKI] section 5.11 + "Sharing V2 Mod Install"; [BIN] usage `-ugc_directory <UGCDir>`. Race warning: if all shards start at the same time, they can fight over the shared folder; the wiki recommends running `-only_update_server_mods` first, then shards with `-skip_update_server_mods`. |
| `-backup_logs` | none | bool flag, DEPRECATED | Keep old logs | Old switch that kept a copy of the previous run's logs. The build prints `[WARNING] -backup_logs has been deprecated and replaced with -backup_log_count`. In test runs the previous logs were copied to `<shard>\backup\server_log\` and `...\server_chat_log\` on every start, also in runs that did NOT pass the flag, so it is not needed. | Saves and logs | (do not use) | - | - | No. Do not pass | [BIN] message, [LOG run2], [KLEI-DEV] (original 2016 description; user reply Jul 2016 reports the deprecation), observed backup files in `run_storage\DST\Cluster_1\Master\backup\` (backups at 12:56:11, 12:57:16, 12:57:47 for runs of which only the first passed the flag) |
| `-backup_log_count` | space | value (number) | Number of old logs to keep | Replacement for `-backup_logs`: how many previous log files to keep in the `backup` folder. | Saves and logs | `-backup_log_count 10` | a number; usage string `-backup_log_count <count>` | UNVERIFIED (not documented; the Klei forum thread asks the same question and has no answer) | Optional. A real working command line shows `-backup_log_count 10` ([BUG], a log from a client-hosted server, Jul 2016) | [BIN], [BUG], [KLEI-DEV] thread (thasmo, Jul 2016) |
| `-backup_log_period` | space | value (number of seconds) | Seconds between log backups | Exists in the exe; usage string says `-backup_log_period <seconds>`. What exactly it controls (how often the log is rotated while running, or the minimum age) is not documented. | Saves and logs | `-backup_log_period 0` (value seen in a pasted real command line) | seconds | UNVERIFIED | No | [BIN]; value `0` seen in a Scribd-hosted server log surfaced by search, not opened: UNVERIFIED example |
| `-secondary_log_prefix` | space | value (text) | Secondary log name prefix | Exists in the exe (`-secondary_log_prefix <Secondary log prefix>`). Purpose not documented (likely writes an extra log with this prefix). | Saves and logs | - | text | UNVERIFIED | No | [BIN] |

### 2b. Network and ports

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-port` | space | value (number) | Game port (UDP) | The UDP port this shard listens on for players. Overrides `[NETWORK] server_port` in `server.ini`. Every shard on the same machine needs its own port. For players on the same LAN to see the server in their list it must be 10998-11018. | Network | `-port 10999` | usage string in the exe: `Port 1024 ... 65535`; [KLEI-DEV] says 1..65535; [WIKI] says 1024..65535 for non-LAN servers and 10998..11018 for LAN-only discovery. Use 1024-65535 | `10999` (the `server_port` Klei writes into a new `server.ini`, [LOG run1] `ServerPort: 10999`) | Yes (port) | [BIN], [KLEI-DEV], [WIKI], [LOG run2] (`-port 11005` gave `Lan Server Started on port: 11005`) |
| `-steam_master_server_port` | space | value (number) | Steam server port (internal) | Internal port used by Steam. Overrides `[STEAM] master_server_port` in `server.ini`. Must differ for every shard run on the same machine. | Network | `-steam_master_server_port 27016` | `Port 1024 ... 65535` ([BIN]); [KLEI-DEV] and [WIKI] say 1..65535 | `27016` ([LOG run1] `SteamMasterServerPort: 27016`) | Yes | [BIN], [KLEI-DEV], [WIKI], [LOG run2] (`27040` accepted) |
| `-steam_authentication_port` | space | value (number) | Steam login port (internal) | Internal port used by Steam. Overrides `[STEAM] authentication_port` in `server.ini`. Must differ for every shard on the same machine. | Network | `-steam_authentication_port 8766` | `Port 1024 ... 65535` ([BIN]); docs say 1..65535 | `8766` ([LOG run1] `SteamAuthPort: 8766`) | Yes | [BIN], [KLEI-DEV], [WIKI], [LOG run2] (`8800` accepted) |
| `-bind_ip` | space | value (IPv4 text) | Listen address | The network address the shard listens on for player connections. Advanced; most people never need it. | Network | `-bind_ip 0.0.0.0` | an IP address; usage string `-bind_ip 123.123.123.123` | not set (listens on all addresses? UNVERIFIED) | Optional. [EGG] passes `-bind_ip 0.0.0.0` | [KLEI-DEV], [WIKI] (no default stated), [BIN]. Accepted with `127.0.0.1` in [LOG run2] without an error, but the log does not show the effective bind address, so the effect is UNVERIFIED. Do not confuse with `[SHARD] bind_ip` in `cluster.ini` (the Master-shard link, a different setting) |
| `-master_port` | space | value (number) | Shard link port | Exists in the exe with usage `-master_port <Port 1024 ... 65535>`. By name, it matches the `[SHARD] master_port` setting (default 10888) that the Master listens on for the other shards. That it overrides that INI value is an inference from the name. | Network | - | `Port 1024 ... 65535` | UNVERIFIED | No; set it in `cluster.ini` | [BIN] only |
| `-external_port` | space | value (number) | (unknown) | Exists in the exe (`-external_port <Port 1024 ... 65535>`). No source explains it. | Network | - | `Port 1024 ... 65535` | UNVERIFIED | No | [BIN] only |
| `-offline` | none | bool flag | Offline / LAN only | Starts the server in offline mode: it is not listed in the public server browser, only players on the local network can join, and Steam features do not work. Offline servers do not need a cluster token. The log prints `[Warning] Forcing LAN only setting in offline mode.` | Network | `-offline` | - | off. Without the flag, whether the server is online is decided by `offline_cluster` in `cluster.ini` ([WIKI]) | Optional; better to use `offline_cluster = true` in `cluster.ini` (so the form shows it) | [KLEI-DEV], [BIN], [LOG run1] (`Online: false`, `LanOnly: true` in "About to start a server" block) |
| `-lan` | none | bool flag, DEPRECATED | LAN only | Old name of `-offline`. The build prints `[WARNING] -lan has been deprecated and replaced with -offline`; the log shows it still works (`Online: false`, `LanOnly: true` in [LOG run2]). [WIKI] still lists it as "force the server into offline and LAN mode, overriding cluster.ini", equal to `offline_cluster = true` + `lan_only_cluster = true`. | Network | (use `-offline`) | - | - | No. Use `-offline` | [BIN], [WIKI], [LOG run2] |
| `-tick` | space | value (number) | Network tick rate | How many times per second the server sends updates to players. Higher can be smoother but uses more network. Overrides `[NETWORK] tick_rate` in `cluster.ini`. Klei: leave it at 15; if you change it, do it only for LAN games, and use a number that divides 60 evenly (15, 20, 30). | Performance | `-tick 15` | `15 .. 60` ([BIN] usage, [KLEI-DEV], [WIKI]) | `15` | Optional; prefer `tick_rate` in `cluster.ini` | [BIN], [KLEI-DEV], [WIKI], [LOG run2] (`-tick 30` gave `Network tick rate: U=30(1)`; default run showed `U=15(2)`) |
| `-players` | space | value (number) | Max players | Maximum number of players allowed to join this shard's game. Overrides `[GAMEPLAY] max_players` in `cluster.ini`. | Server | `-players 8` | `1 .. 64` ([BIN] usage, [KLEI-DEV], [WIKI]). Note [EGG] limits to 1-31 and 01-basics.md flags this conflict; the exe's own message says 64 | cluster.ini default `max_players` 16 per Klei guide ([KLEI-DEV] settings guide, see 01-basics.md) | Optional; prefer `max_players` in `cluster.ini` | [BIN], [KLEI-DEV], [WIKI], [LOG run2] (`-players 10` gave `MaxPlayers: 10`) |

### 2c. Console, process control and mods

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-console` | none | bool flag, DEPRECATED but harmless | Server console | Old switch to let you type Lua commands (like `c_shutdown()`) into the server window. The exe prints `[WARNING] -console has been deprecated: Use the [MISC] / console_enabled setting instead.` The console works with it (see "Console input" below). Whether the console also works WITHOUT the flag in this build was not tested (the one no-flag test run was stopped before any input was sent): a 2016 forum user claims the console is on by default via `console_enabled = true`, which Klei's dev guide also lists with default true. | Advanced | `-console` | - | off | Safe to always pass (Klei's own Windows batch, the 2022 Linux guide and the shipped bat all still pass it). | [BIN] message, [LOG log_consoleflag] (warning at start, and stdin command accepted), [KLEI-DEV] thread (tsuna87 report, Mar 2016), [WIKI] (5.12 and "console" tip), [BAT], [LINUX], [WIN] |
| `-monitor_parent_process` | space | value (process id number) | Exit with parent | Gives the PID of the process that started this server. Klei's Linux script passes the script's own PID (`$$`) to every shard, so presumably the shard watches that process and shuts down when it is gone. Not documented by Klei (a forum user asked in 2016 and 2024 and got no answer), so the "exits when the parent exits" behaviour is inferred from the name, UNVERIFIED. Also appears in a real command line from a game-hosted server [BUG]. | Advanced | `-monitor_parent_process 1234` | a process id; usage `-monitor_parent_process <ProcessId>` | off | Candidate for the panel (pass the panel's PID so shards do not outlive the panel), but only after testing: whether it saves or just kills, and whether it works on Windows, is UNVERIFIED. The test harness that ran the earlier test runs passed it (it shows in `Command Line Arguments:` of [LOG run1/run2]) and those runs were then ended by `c_shutdown(true)` through stdin, so no evidence on its behaviour | [LINUX] (line `run_shared+=(-monitor_parent_process $$)`), [BIN], [KLEI-DEV] thread (questions by Maco02 and Ming_ unanswered), [BUG], [LOG] |
| `-skip_update_server_mods` | none | bool flag | Skip mod update | Do not check for or download Workshop mod updates when starting; go straight to launching the world. | Advanced | `-skip_update_server_mods` | - | off (mods are checked and updated at every start) | Yes when the panel updates mods in a separate step (`-only_update_server_mods`); also useful so a start does not wait on Steam. | [WIKI] section 5.x, [BIN], [KLEI-DEV] thread (thezigpc: "Skips mod updates"), [LOG run1/run2] (used on all test runs; logs show `No mods registered`) |
| `-only_update_server_mods` | none | bool flag | Update mods only | Downloads/updates the mods listed in `dedicated_server_mods_setup.lua`, then exits without starting the world. Use it once before starting several shards that share one `-ugc_directory`. | Advanced | `-only_update_server_mods` | - | off | Yes (a separate "update mods" action, never together with a normal start) | [WIKI], [KLEI-DEV] thread (thezigpc), [BIN]. Not run in the test runs, so exit behaviour is only per docs. |
| `-disabledatacollection` | none | bool flag | Disable data collection | Turns off the data Klei collects from the server. Klei says the online services need that data, so with the flag the server can only run in offline mode. | Advanced | `-disabledatacollection` | - | off | No (it forces offline) | [KLEI-DEV], [WIKI], [BIN] |
| `-ownernetid` | space | value (Steam/Klei user id text) | Owner account id | Exists in the exe (`-ownernetid <NetId>`). It appears in the command line of a game-hosted ("Host Game" from the client) server: `-monitor_parent_process 5480 -persistent_storage_root APP:Klei/ -conf_dir DoNotStarveTogether -cluster Cluster_5 -ownernetid 76561198099905607 -backup_log_count 10 -shard Master -sigprefix DST_Master` ([BUG], 2016, a 17-digit Steam ID). So it is used by the client when it launches its own server. What it changes for a dedicated server is not documented. | Advanced | - | a user net id | - | Not needed for a dedicated server. The panel should not use it | [BIN], [BUG]. Purpose UNVERIFIED |
| `-ownerdir` | space | value (path) | (client-hosting) | Exists in the exe (`-ownerdir <AltOwnerDir>`). Purpose undocumented (probably points to the owner's data folder for a client-hosted server). | Advanced | - | path | UNVERIFIED | No | [BIN] only |
| `-sigprefix` | space | value (text) | Signal prefix | Exists in the exe (`-sigprefix <SignalPrefix>`). Seen as `-sigprefix DST_Master` in a game-hosted server ([BUG]). Likely a name used for inter-process signals between the game client and its hosted server; undocumented. | Advanced | `-sigprefix DST_Master` (as seen) | text | UNVERIFIED | No | [BIN], [BUG] |
| `-use_session_identifier` | space | value (text) | Session id | Exists in the exe (`-use_session_identifier <SessionId>`). No source explains it. | Advanced | - | text | UNVERIFIED | No | [BIN] only |
| `-token` | space | value (text) | Cluster token on the command line | Exists in the exe (`-token <Token>`). No source says what it carries. The documented way to give the cluster token is the file `cluster_token.txt` in the cluster folder; no guide uses `-token`. A token on a command line would also be visible in the process list, so the panel should keep using the file. | Advanced | - | text | UNVERIFIED | No | [BIN] only |

### 2d. Found in the exe, no documentation (do not use; listed for completeness)

All of these are `-flag` literals in the shipped exe ([BIN] `flags_strings_x64.txt`); none appear in any Klei, wiki or hosting guide I opened, so their meaning is UNVERIFIED. They are Klei internals for Klei's own cloud/hosted servers or debugging:

`-config_dir` (usage string reads `-config_dir <AltConfigDir>`; it sits next to `-conf_dir` and is probably an alias, UNVERIFIED), `-clouddir`, `-cloudserver`, `-cloudserverid <string>`, `-cloudservertimeout <number>`, `-cloudserverreservationtimeout <number>`, `-cloudserverkillafteruse`, `-cloudserverinitiator <string>`, `-cloudserverenvironment <string>`, `-cloudserver_os_bind_port`, `-append_cloud_server_setting <Section> <Key> <Value>` (usage string suggests it injects one INI value), `-locked`, `-steamnetworkserver`, `-steamnetworkingpopid <POP_ID>`.

## 3. Generic engine flags found in the exe

Present in `flags_strings_x64.txt`; no source documents them, so the "safe" column is a judgement from the name only and is UNVERIFIED. None are needed for a dedicated server; the panel should not pass any.

| flag | what the name suggests | verdict |
|---|---|---|
| `-nosound`, `-novsync`, `-nooverlay`, `-force_edid_shorthand <EDID shorthand>` (usage string), `-printtextureinfo`, `-bit` | client display/audio options; the server is the "nullrenderer" build with no window rendering | irrelevant for a server |
| `-alternate_gc` | alternative garbage-collector mode | unknown; do not use |
| `-debug_random_data`, `-enable_lua_debugger`, `-curl_debug_log` | debugging aids | do not use |
| `-submit_data_files` | uploads data files (the exe prints `Uploading data files...`, `Data files uploaded. Code: %s`) | do not use (sends data to Klei) |
| `-allow_ioopenwrite_sandbox_escape` | turns off a Lua file-write sandbox (by name) | do not use (security) |
| `-jsh` (32-bit exe only) | unknown | do not use |

## 4. Console input (needed for a graceful stop and relevant to `-console`)

Observed in the earlier test runs on this PC (build 756039):

- A line written to the server's standard input arrives as `RemoteCommandInput: "<text>"` in `server_log.txt`, and Lua commands run. After `c_shutdown(true)` the log shows `c_shutdown true`, two `Serializing world: session/.../00000000NN` lines and a normal shutdown (`Shutting down`) in about 2 seconds ([LOG run2] lines 241-end; same in `log_consoleflag.txt`). Both runs had `-console` on the command line. The running order was: start with `-console`, wait about 40 s, send the command.
- A command with a UTF-8 byte-order mark (BOM, invisible character `U+FEFF`) at the start FAILED: `RemoteCommandInput: "<BOM>c_shutdown(true)"` was logged, followed by `attempt to call a nil value`, and the world was not saved (the next send worked). Another test line `print("CONSOLE_TEST_OK")` was also reported with a replaced first character and failed the same way. So the panel must write the command as plain ASCII with no BOM, then a newline. [LOG run2 lines 239-241, log_consoleflag line 291-292]
- Whether input works on Windows when the process has NO `-console` flag was not tested: `log_noconsole.txt` ends before any input was sent. UNVERIFIED. The safe course is to keep passing `-console` (also harmless: Klei's own files do), see 01-basics.md section 8 for stopping.
- Whether input works when stdin is a pipe from Node `child_process.spawn` (versus whatever the earlier harness used) is UNVERIFIED: the harness script was not preserved. The log thread name `StreamInput` is started at every launch ([LOG], also a string in [BIN]), consistent with a stdin reader.

## 5. Observed, effective settings block (for reference)

Printed by the game at start ([LOG run2]), useful as a sanity check the panel can parse after start:

```
About to start a server with the following settings:
  Dedicated: true   Online: false   Passworded: false
  ServerPort: 11005   SteamAuthPort: 8800   SteamMasterServerPort: 27040
  LanOnly: true   MaxPlayers: 10   GameMode: survival   PauseWhenEmpty: false
  IdleTimeout: 1800s   VoteEnabled: true
...
Lan Server Started on port: 11005
```

Other launch-time observations from the logs (Windows 11, no admin):
- `Authorized application <exe path> is disabled in the firewall.` then `[Warning] Add failed: 0x80070005` and later `Could not confirm port <port> is open in the firewall.`: the exe tries to add itself to the Windows Firewall at start and fails (access denied) when not run as administrator. It did not stop the server. The panel will still need its own firewall rule for the game port. [LOG run1, run2]. This partly answers basics-UNVERIFIED #12 (firewall).
- `[Shard] Shard server mode disabled by configuration file` when `shard_enabled = false` (single shard). [LOG]
- Memory shown by the process at start: roughly 14-15 MB working set at first print (not a useful server figure).

## 6. Conflicts between sources

1. Port range for `-port` etc.: the exe itself says `Port 1024 ... 65535` for `-port`, `-steam_*_port`, `-master_port`, `-external_port` [BIN]; Klei's 2016 post says `1..65535` for the Steam ports and `-port` [KLEI-DEV]; the wiki says 1024..65535 for `-port` ([WIKI]). The exe's own text wins: use 1024-65535.
2. `-lan` vs `-offline`: [WIKI] documents `-lan` (and not `-offline`); [KLEI-DEV] documents `-offline`; the exe says `-lan` is deprecated for `-offline`. Use `-offline` (or the INI settings).
3. `-console`: documented as the way to get a console by [WIKI]/[WIN]/[BAT]/[LINUX]; the exe says it is deprecated in favour of `[MISC] console_enabled`; a 2016 user says the console works without it. Keep passing it (harmless).
4. `-backup_logs`: documented by [KLEI-DEV] and [WIKI]; deprecated per [BIN]; in tests, logs were backed up on every start without it.
5. `-players` upper limit: exe and wiki say 64; the Pterodactyl egg caps at 31 (no explanation).

## 7. Suggested launch-args catalog (for ui/src/catalog/launchArgs.js, derived from the table above)

Panel-managed (set from the form, not editable as free text): `-persistent_storage_root`, `-conf_dir`, `-cluster`, `-shard`, `-port`, `-steam_master_server_port`, `-steam_authentication_port`. `-console` always on. `-players`, `-tick` only if the panel does not also write `max_players`/`tick_rate` to `cluster.ini` (flag wins over the file).

User-selectable extras with plain labels: `-offline` (bool, "LAN / offline mode"), `-bind_ip` (value, "Listen address (advanced)"), `-backup_log_count` (value, "Old log files to keep"; default UNVERIFIED), `-skip_update_server_mods` (bool), `-only_update_server_mods` (bool, one-shot action), `-ugc_directory` (value, "Shared Workshop mod folder"), `-monitor_parent_process` (value; only after it is tested).

First-creation-only: none of the flags is first-creation-only; but the files the flags point to (`cluster.ini`, `server.ini`, `cluster_token.txt` for online servers) must exist or be written by the panel before the first start for an online server (offline: the game wrote them itself in tests).

## UNVERIFIED list

1. What `-monitor_parent_process <pid>` does on Windows (exit when the parent dies? save first?). Only the name and Klei's Linux script use it; not tested.
2. Whether the console (stdin) works on Windows without `-console` (test run was stopped before any input); whether it works via a Node pipe.
3. Whether `-flag=value` is accepted (every source uses a space).
4. Handling of spaces in `-persistent_storage_root` / `-cluster` values (quoting).
5. Default of `-backup_log_count` and meaning of `-backup_log_period`.
6. Effect of `-bind_ip` (log shows no effective bind address) and its default when absent.
7. Purpose of `-master_port` (assumed to override `[SHARD] master_port`), `-external_port`, `-token`, `-ownernetid`, `-ownerdir`, `-sigprefix`, `-use_session_identifier`, `-secondary_log_prefix`, whether `-config_dir` is an alias of `-conf_dir`, and all `-cloudserver*` flags, `-locked`, `-steamnetwork*`.
8. What the exe does after an invalid-parameter message (exit or continue).
9. Real-world behaviour of `-only_update_server_mods` (exit time/exit code) and `-skip_update_server_mods` when mods are installed (not run with mods).
10. Whether `-players` above 31 works in practice (exe says 64, egg says 31).
11. Whether the log backup on every start (seen in tests without `-backup_logs`) is the default for all builds or limited by a default `-backup_log_count`.
12. The `-backup_log_period 0` example value came from a search-result snippet of a Scribd log I did not open.
13. Whether the 32-bit exe differs in behaviour (only the flag list was compared; `-jsh` extra).
