# Game support: what has been checked against a real install

Each game here was **installed for real with SteamCMD into a throwaway folder, started, backed up,
stopped, restored, crashed on purpose and restarted, cloned and deleted**, by `tests/real/conformance.mjs`,
one game at a time, on ports reserved for testing, with the folder deleted afterwards. Running that
against real installs found a fair number of things the templates got wrong; they are listed per game, so
a failure on your own PC can be compared with what was already seen.

"Verified" means the whole run passed against the version of the game that was current on
30 September 2026. A game update can change things; the harness is there to be re-run.

| Game | Status | Real-install findings fixed |
|---|---|---|
| Valheim | Verified | Files land in the server folder root, not `steamapps\common\...`; worlds and logs now go in the server's own folder (`-savedir`, `-logFile`) so servers don't share a world; ports are game, +1 and (reserved) +2; stopping one server no longer stops others |
| Enshrouded | Verified | The two player groups must have different passwords or the game refuses to start (the admin password is now separate and never equal to the join password) |
| RuneScape: Dragonwilds | Verified | Its program name is 38 characters long; a name comparison that cut at 25 characters never saw it running |
| Palworld | Verified | Fresh install lives in the folder root; the panel needs the game's REST API (and RCON) switched on in `PalWorldSettings.ini`, which a fresh install doesn't have; its RCON answers with a different reply id than it was sent, so every command used to time out (save, stop and broadcast included); it writes no log file |
| 7 Days to Die | Verified | Created servers had no Telnet port, so the panel could never save before a stop; saves go in the server's own folder (`-UserDataFolder`); the game binds the game port (UDP+TCP) and +2 (UDP); its Telnet answers arrive between its own log lines, read out by `cleanTelnetOutput` |
| ARK: Survival Evolved | Verified (the server's log file stays empty while it runs) | RCON is only switched on by launch-line options (`?RCONEnabled=True?RCONPort=` and `?ServerAdminPassword=`); the `-RCON...` flags the template used are ignored; files are in the folder root |
| ARK: Survival Ascended | Verified | The admin password has to be the `-ServerAdminPassword=` flag; the query port is UDP |
| Conan Exiles | Verified earlier (see below) | RCON port lives in `Game.ini`; its RCON replies are out of step (handled) |
| Rust | See the status line at the end of this file | |
| Windrose | **Not run** | Its server binds 7777 and 7778, which a real server on the same PC was using, so it can't be tested there without risking that server. The install layout was corrected from what SteamCMD does for every other game here |
| Subsistence | **Not run** | A real Subsistence server was running on the machine the tests ran on, so the test was skipped by design. Layout corrected the same way as Windrose |
| Minecraft (modpacks) | See the status line at the end of this file | |

## What the harness checks

A run is: install, start (and wait for the panel to see it online), ports actually bound, log file found and
non-empty, players view, kick/ban/lists (answers recorded), backup (its zip holds the world and a marker file),
stop (the game exits), restore (the marker is back), crash recovery (kill the game; the panel notices,
restarts it and sees it online again), mods folder, a port change on the stopped server (and that the new
number is in the game's own files), clone, then delete everything it made.

The harness refuses to start a game if a program of that name is already running on the PC, or if a port it
needs is in use, and only ever stops programs that run from inside its own test folder.

## What could not be verified without accounts

- **Discord bot:** tested against a stand-in Discord (its gateway and web calls, including rejected tokens
  and reconnects). Not tried against Discord itself, which needs a bot token.
- **Cloud storage:** the S3 client is tested against a stand-in that checks request signatures, and against
  `rclone serve s3`, an independent implementation, for upload (including multipart), download, listing and
  deleting. Not tried against Backblaze, Wasabi, R2 or Amazon.
- **Code signing:** prepared (see CODE_SIGNING.md) but needs the repository public and an approved
  SignPath application.
- **Windows Firewall rule creation:** the rule list is read for real; adding a rule needs a permission prompt
  on the PC and is tested only as the command it would run.

## Games not included

- **Don't Starve Together** needs a server token from a Klei account before its server will start, so it can't
  be installed and checked unattended.
