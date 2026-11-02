# Game support: what has been checked against a real install

GodlyPanel can create servers for **93 games**. They are not all equally proven, and this page says how far
each group got.

| Group | Games | How far it got |
|---|---|---|
| **Fully verified** | The first 17 (the table just below) | Installed, started, backed up, stopped, restored, crashed on purpose, restarted, cloned and deleted, one game at a time |
| **Started on a real install, checked in part** | Most of the other 76 | Installed and started through the panel; ports, status, config read-back and stop checked; backup, restore and crash recovery not run through the full harness |
| **Built from research only** | A handful (listed [below](#the-games-added-since-the-first-17)) | Settings, ports and launch line come from cited sources; no real-install check recorded, or the check showed a blocker |

The 17 were each **installed for real with SteamCMD into a throwaway folder, started, backed up,
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
| ARK: Survival Ascended | Verified | The admin password has to be the `-ServerAdminPassword=` flag; the query port is UDP. Each map sharing an install has its own `GameUserSettings.ini` and `Game.ini` (kept in `GodlyPanelConfigs\<map>` and copied to where the game reads them just before that map starts), so changing one map's rules no longer changes the others; servers made earlier are moved over when the panel starts |
| Conan Exiles | Verified earlier (see below) | RCON port lives in `Game.ini`; its RCON replies are out of step (handled) |
| Rust | Verified | Source RCON (`say` gets no reply, so the panel doesn't wait for one); the world is saved and the server stopped with `quit` |
| Project Zomboid | Verified | Brings its own Java; saves, settings and its database live in a `zomboid` folder inside the server's own folder (`-cachedir`); its console answers "User ... doesn't exist" for a name nobody has, read as "nothing happened" |
| Satisfactory | Verified | The game port is used over UDP *and* TCP, plus a TCP "reliable messaging" port; the save folder only appears after the first save |
| V Rising | Verified | No RCON at all (a template that asked for one hung every Stop); the panel stops it by process; saves, settings and the admin/ban lists live in `save-data` |
| Core Keeper | Verified | Saves go in a `data` folder inside the server's own folder (`-datapath`); the log is `CoreKeeperServerLog.txt` |
| Sons of the Forest | Verified | Three UDP ports (game, +2 and query); saves and the owners list live in a `userdata` folder in the server's own folder |
| Windrose | Verified | Players join with the server's **invite code** through the game's own relay (`UseDirectConnection` is false by default), so the server listens on no port of its own: it listened on one TCP port nobody configured and no UDP port. The template used to list a port to open that the game never used; the Network tab now says no port needs opening. The install layout was corrected from what SteamCMD does for every other game here |
| Subsistence | Verified | Two real bugs, both fixed. The generated `UpdateandRun.bat` didn't change into its own folder, so it couldn't find `Start_Server.bat` beside it (the panel starts this launcher without a working folder of its own). And the game ignores the command line for its ports, keeping 7777 and 27015 whatever the form said; they live in `UDKGameConfigUDKEngine.ini`, which the game writes itself the first time it runs, so creation now makes that file with just the port and query port and the game builds the rest around them (its own `PreserveKey` lines keep both). It also keeps two fixed Steam ports, UDP 13000 and 41765. Its log is `UDKGameLogsLaunch.log` |
| Minecraft (modpacks) | Verified | Run with a CurseForge-format pack that holds only a Fabric loader (so no CurseForge key is needed); the install, start, RCON/console, backup, restore, crash recovery, mod upload and clone all pass. Java is shared with other programs, so the test finds its server by the test-only ports it listens on |

## The games added since the first 17

76 more games have a template. Each was built from a sourced research dossier (the dossiers for the first batches of games are kept in `docs/research/games/<game>/`; the rest are summarised in the notes at the top of each game's module):
a setting, default, dropdown value or launch argument is only in the panel if a source is cited for it, and
anything unconfirmed is left unexplained rather than guessed. Each game also has its own automated tests
(`tests/unit/game-<id>.test.js`). What was then tried on a real install is recorded in the research notes,
[`docs/research/games/README.md`](research/games/README.md), with the date; it is summarised here.

**Run end to end through the panel's create flow, with real findings fixed:** Unturned, Abiotic Factor, SCUM
(the server asks for administrator rights, so the panel starts it un-elevated so it can see and stop it; its
clean exit takes about 15 seconds), Icarus, Soulmask (the panel sends `saveworld 1` before a stop, since
closing the window alone does not save), Space Engineers (Stop ends the program; it autosaves every 5 minutes)
and Terraria with tModLoader (installed from the tModLoader GitHub release, see below).

**Started on a real install, checked in part** (install, start, ports, status, config read-back, stop): Don't
Starve Together (offline, no Klei token; the first version runs the overworld shard only, with no Caves),
StarRupture, Garry's Mod, Minecraft (vanilla), Terraria (vanilla), The Forest (the window close crashes it, so Stop
ends the process after 15 seconds), Wurm Unlimited, Team Fortress 2, Mordhau, Insurgency: Sandstorm, Left 4
Dead, No More Room in Hell, Day of Defeat: Source, Fistful of Frags, Zombie Panic! Source, BrainBread 2, Empires,
Double Action: Boogaloo, Dystopia, Insurgency (2014), Pirates, Vikings, and Knights II, Half-Life Dedicated
Server (Counter-Strike 1.6; no graceful stop, and Windows asks about the firewall on first start), Black Mesa,
Military Conflict: Vietnam, SCP: Secret Laboratory, Colony Survival, Rising World, Warfork, Natural Selection 2,
Chivalry: Medieval Warfare, Hurtworld, Medieval Engineers, PixARK, Stationeers, Wreckfest, Rising Storm 2:
Vietnam, Operation: Harsh Doorstop, Miscreated, Craftopia, Ballistic Overkill, Age of Chivalry, HumanitZ,
Survive the Nights, Tower Unite, The Front, Day of Dragons, HYPERCHARGE: Unboxed, Day of Infamy, Killing Floor
2, Empyrion: Galactic Survival, ATLAS, IOSoccer and BATTALION: Legacy.

**Built from research, with no full real-install check, or with a blocker found:** Barotrauma, Necesse (no
graceful stop: its `quit` cannot be sent), Left 4 Dead 2, Squad, Arma Reforger, VEIN, Astroneer, Avorion,
Counter-Strike: Source, Half-Life 2: Deathmatch and Sven Co-op (no check recorded); Counter-Strike 2 (the
install is over 60 GB, past the test limit); Mount & Blade II: Bannerlord (no port opens without a login
token); The Isle (the server exits at once without Epic Online Services credentials); Euro Truck Simulator 2
and American Truck Simulator (they will not start until you copy `server_packages.sii` and
`server_packages.dat`, exported from a copy of the game, into the server's data folder).

### What some of them need from you

| Game | Needs |
|---|---|
| Don't Starve Together | A cluster token from your Klei account for online play (the create form asks for it); without one the server is LAN-only |
| Mount & Blade II: Bannerlord | A login token from TaleWorlds; the panel puts it on the launch line |
| Counter-Strike 2 | A Steam game server login token (`sv_setsteamaccount`) to be listed publicly |
| The Isle (Evrima) | Epic Online Services credentials in `Engine.ini`; without them the server exits |
| Euro Truck Simulator 2, American Truck Simulator | `server_packages.sii` and `.dat` from a copy of the game |
| Killing Floor 2, Rising Storm 2: Vietnam | The Visual C++ 2012 x64 runtime (it ships in the install: `Binaries\Redist\vcredist_x64.exe`); without it the process sits idle with no port |
| Terraria (vanilla) | The XNA Framework files; the panel unpacks them from Microsoft's signed installer after you agree |
| Tower Unite | Login tokens, to be listed on the server list; the panel does not ask for them |
| HYPERCHARGE: Unboxed | Nothing, but the game connects players through PlayFab with an invite code, so the ports the panel passes are not used |

### Installed from somewhere other than Steam

Four games are not downloaded through SteamCMD. In every case the panel asks first, shows what it will fetch
and from where, and refuses anything that doesn't match.

- **Minecraft (Java, vanilla)** and **Terraria (vanilla)** come from Mojang's and terraria.org's own sites. The
  address must be https on a fixed list of hosts, within a size limit, and checked against the SHA-1 or SHA-256 the
  maker publishes. Where the maker publishes none, the SHA-256 the panel computed is written to the install log.
- **Terraria (tModLoader)** comes from the tModLoader GitHub release. It is installed only if GitHub publishes a
  SHA-256 for the file and the download matches it, from GitHub hosts only, and unpacked only after every name in
  the archive has been checked to stay inside the server's folder.
- **Minecraft (modpack)** is the uploaded CurseForge *server* export plus the mods fetched through the CurseForge API.

### Games with a mods folder the panel manages

Minecraft (modpack), 7 Days to Die, Palworld, Garry's Mod, Left 4 Dead and Left 4 Dead 2 and HumanitZ use a
mods (or add-ons) folder; Conan Exiles uses Steam Workshop items; Valheim uses Thunderstore; ARK uses mod numbers in
the start script. For the rest, mods can still be added by hand in the server's folder, or with the Files tab.

## "No window" mode, checked per game

The same real-install run, repeated with the server set to **No window**, then again checking what appears on
the taskbar: after the first start and again after a crash and automatic restart. A game passes only if the
whole run passes (start, ports, backup, stop, restore, crash recovery, clone) **and** no window is left showing.
Run with `node tests/real/conformance.mjs --game <id> --window windowless` (also `hidden` and `minimized`; see
`tests/real/run-window-batch.sh`). A control run in Minimized mode confirms the check really does see a window.

| Game | No window | Notes |
|---|---|---|
| Enshrouded | Passed | |
| 7 Days to Die | Passed | |
| Palworld | Passed (also in Hidden) | Its launcher starts the real server as a console of its own, which on Windows 11 opens a Windows Terminal window. Both Hidden and No window used to leave that window showing; they now hide it. |
| Rust | Passed | |
| Project Zomboid | Passed | |
| Satisfactory | Passed | |
| V Rising | Passed | |
| Core Keeper | Passed | |
| Sons of the Forest | Passed | Its start script writes `steam_appid.txt` before launching; "No window" used to skip that, so a server never started from its script never bound its ports. It now carries that file along. |
| Conan Exiles | Passed | |
| ARK: Survival Evolved | Passed windows; one check not applicable | The game's own log file stays empty while it runs, so "the log has content" can't pass. |
| ARK: Survival Ascended | Passed | |
| Minecraft (modpacks) | Passed | The generated start script can't be read, so the launch is copied from the running server (the owner's route). That copy used to fail for servers the panel created; it now finds the Java program by the ports it listens on. |
| Valheim | Passed | |
| RuneScape: Dragonwilds | Passed | |
| Windrose | Passed | Invite-code mode, so there are no ports to check. |
| Subsistence | Passed | After the two fixes described above. |

What the check can't see: a window that belongs to a program it doesn't recognise as the game's. It recognises
windows owned by the game or its children, and console windows (Windows Terminal, conhost, cmd, PowerShell) that
appear while the game starts.

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

## Games built but not offered

These have a module in the source but are **not** registered, because the panel installs games by signing in to
Steam anonymously and each of these needs more than that. They will appear when there is a way to ask for it.

| Game | Why it isn't offered |
|---|---|
| Arma 3, Assetto Corsa, Assetto Corsa Competizione, Killing Floor, Red Orchestra: Ostfront 41-45, Starbound | The dedicated server needs a Steam account that **owns the game** ("No subscription" for an anonymous login) |
| Stormworks, Blade Symphony | The anonymous install is only a stub or the binaries; the content comes from the base game, which needs an owning account |
| Motor Town | Needs an owning account and a beta code |
| Eco | Installs, but stops at a Strange Loop account sign-in prompt |
| Nuclear Dawn | The anonymous install has no Windows server program |
| Team Fortress 2 Classified | Installs, but the server exits at once ("No SteamApps connection.") for a cause that isn't known |
| Pavlov VR, Quake Live | Linux-only servers |

Some games also have no dedicated server a hosting panel can use at all (Ready or Not, Hell Let Loose, Medieval
Dynasty), and DayZ needs a Steam login.

## Player admin (kick, ban, lists) by game

Kick/ban answers were recorded from real servers for Minecraft, Rust, Project Zomboid, 7 Days to Die and ARK
(both). Valheim, V Rising and Sons of the Forest have no console for it, so the panel edits their admin/ban/
whitelist (Sons of the Forest: owners) files (the game reads them when it starts). Palworld uses its own admin commands over RCON. Games
not listed (Satisfactory, Core Keeper, Conan Exiles, Enshrouded, Dragonwilds, and every game added since the first 17, apart
from Minecraft modpack servers) show no player-admin controls; for those, use the game's own console where the panel has one.
