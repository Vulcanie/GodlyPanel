# Abiotic Factor dedicated server: launch arguments (section C)

Date: 2026-10-14. Server app 2857200. Build number not recorded by any source. Sources were fetched as raw text on this date.

Primary (official, Deep Field Games' wiki; DFJacob is the dev account that the Steam server page points to - the page's affiliation is UNVERIFIED, but the wiki is the one the community and hosts call "official"):
- LP = https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters (raw: https://raw.githubusercontent.com/wiki/DFJacob/AbioticFactorDedicatedServer/Technical-%E2%80%90-Launch-Parameters.md)
- QS = https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Quickstart (raw: https://raw.githubusercontent.com/wiki/DFJacob/AbioticFactorDedicatedServer/Guide-%E2%80%90-Quickstart.md)
- RS = https://raw.githubusercontent.com/DFJacob/AbioticFactorDedicatedServer/main/RunServer.Bat (official example start file)
Secondary (hosting vendor, third party):
- XG = https://xgamingserver.com/docs/abiotic-factor/launch-parameters.md
- XGP = https://xgamingserver.com/docs/abiotic-factor/server-ports.md (protocols)
- XGN = https://xgamingserver.com/docs/abiotic-factor/new-world.md
- GSK = https://www.gameserverkings.com/knowledge-base/abiotic-factor/abiotic-factor.md

Executable: the official quickstart/RunServer run `AbioticFactorServer-Win64-Shipping.exe` from `<install>\AbioticFactor\Binaries\Win64\` (QS, RS). The candidates file says `AbioticFactorServer.exe` (root launcher); I could not confirm that name in any source I opened (UNVERIFIED). The real process name for the panel to match is therefore `AbioticFactorServer-Win64-Shipping.exe` (QS).

## Form conventions
All game args use the **equals form** (`-NAME=value`), values with spaces in double quotes (`-SteamServerName="Your Server Name"`, QS). Bool flags are bare (`-log`). Argument name casing in sources is mixed (`-PORT`/`-QueryPort`/`-QUERYPORT`); Unreal Engine parses these case-insensitively in general, but that is not stated in any Abiotic source (UNVERIFIED), so use the casing from the official example (`-PORT=`, `-QueryPort=`).

## Table

Kind: V = value (`-FLAG=value`), B = bool flag (bare). Origin: GAME = Abiotic-specific per the dev wiki; UE = generic Unreal/engine flag; the dev wiki lists the UE ones as server options too. "First-creation only" noted in the panel-managed column where relevant.

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source URL |
|---|---|---|---|---|---|---|---|---|---|---|
| `-log` | bare | B (UE) | Show log output | Prints the server log. Together with `-newconsole` it opens a visible console window; without them the server runs in the background. | Saves and logs | `-log` | flag | not set | Yes: always include (needed for console output) | LP, QS, RS |
| `-newconsole` | bare | B (UE) | Open a console window | Opens the server in its own visible console window so you can watch the logs. Without `-log -newconsole` the server launches in the background. | Saves and logs | `-newconsole` | flag | not set | Panel decision. NOTE: with a panel that captures output, a new window may defeat capture - UNVERIFIED whether `-log` alone is enough (XG's own example uses `-log` without `-newconsole`) | LP, QS, RS, XG |
| `-PORT=` | equals | V (GAME/UE) | Game port | Port players connect to. Needs port forwarding. Source says UDP (XGP, third party). | Network | `-PORT=7777` | port number | 7777 (from the official example; the wiki gives no stated default) | YES (port) | LP, QS, XGP |
| `-QueryPort=` | equals | V | Query port | Port used to advertise the server on Steam and for the server browser. Recommended, "not fully required". UDP per XGP. | Network | `-QueryPort=27015` | port number | 27015 (example value; no stated default) | YES (port) | LP, QS, XGP |
| `-SteamServerName=` | equals, quote spaces | V | Server name | Name shown in the server browser. | Server | `-SteamServerName="My Server"` | text | no default stated (XG hosts default to a vendor string) | YES (name) | LP, QS |
| `-ServerPassword=` | equals | V | Server password | Password needed to join. Leave out for a public server. | Server | `-ServerPassword=secret` | text | none (no password) | YES (password) | LP, QS, XG |
| `-AdminPassword=` | equals | V | Admin password | Lets a player become an admin in-game by typing this password (separate from the server password). If omitted, password-based admin is disabled and admins must be listed in `Admin.ini` by SteamID (Steam only). Recommended for console (Xbox/PS) players. | Server | `-AdminPassword=adminpass` | text | none (disabled) | YES (password) | LP, QS |
| `-MaxServerPlayers=` | equals | V | Max players | Maximum players at once. Above 6 is not recommended and joiners get a warning popup. | Server | `-MaxServerPlayers=6` | integer 1 to 24 | 6 (QS example; GSK says "Default 6") | YES | LP, QS, GSK |
| `-WorldSaveName=` | equals | V | World save name | Name of the world save folder to use (under `AbioticFactor\Saved\SaveGames\Server\Worlds\`). A name that does not exist yet creates a fresh world (third-party XGN); the old world stays and returns if you switch back. | Saves and logs | `-WorldSaveName=Cascade` | folder-name text | `Cascade` | YES (save path / world). First-creation: choosing a new name creates a new world (XGN); the folder name is the identity of the world, so do not change it later unless you want a new world. | LP, XGN, GSK |
| `-SandboxIniPath=` | equals | V | SandboxSettings.ini location | Overrides where `SandboxSettings.ini` is read from. Path is relative to the `\Saved\` folder. By default the file lives in each world's folder. | Advanced | `-SandboxIniPath=Config/WindowsServer/Server1Sandbox.ini` | relative path | per-world file in `Saved\SaveGames\Server\Worlds\<World>\` | No (panel should keep default so the Settings form finds the file) | LP |
| `-AdminIniPath=` | equals | V | Admin.ini location | Overrides where `Admin.ini` is read from. Relative to `\Saved\`. | Advanced | `-AdminIniPath=Config\WindowsServer\Server1Admin.ini` | relative path | `<install>\AbioticFactor\Saved\SaveGames\Server\Admin.ini` | No | LP (its own example mistakenly shows `-SandboxIniPath=`; the Admin example above is adapted from it) |
| `-PlatformLimited=` | equals | V | Limit platforms (disable crossplay) | Restricts who can join. Omit for full crossplay (Steam, Xbox, PlayStation). | Network | `-PlatformLimited=PC` | `PC` = Steam users only; `Playstation` = PlayStation only; `Xbox` = Xbox and Windows Store only (omit for crossplay) | not set (crossplay on) | No | LP, XG |
| `-LANOnly` | bare | B | LAN only | Runs the server in LAN-only mode, found via the in-game server browser's LAN Only filter. Port 14001 must not be blocked on the local network (used for discovery). | Network | `-LANOnly` | flag | not set | No | LP |
| `-MultiHome=` | equals | V (UE) | Bind to IP | Binds/listens on one specific IP address. For machines with several network adapters or IPs. | Network | `-MultiHome=192.168.1.10` (example IP is illustrative) | an IP address | not set | No | LP |
| `-UseLocalIPs` | bare | B | Also bind local IPs | Like MultiHome but without an IP: also binds to local IPs. A fix if local connections fail. WARNING: may break joining from the internet. | Network | `-UseLocalIPs` | flag | not set | No | LP |
| `-useperfthreads` | bare | B (UE) | Use performance threads | Forces the server to use CPU performance threads. Optional; the wiki says used during development and currently recommended. | Performance | `-useperfthreads` | flag | not set (but included in the official example) | Include by default | LP, QS, RS |
| `-NoAsyncLoadingThread` | bare | B (UE) | Disable async loading thread | Makes the server stop and load new assets/level sectors instead of loading them gradually. LP says optional and "not currently recommended after server community feedback". CONFLICT: the QS and RS official example still include it, while the LP page header names the flag `-DisableAsyncLoadingThread` (its text says "used to be called -DisableAsyncLoadingThread", a self-reference, so the old/new naming is unclear). XG lists it as `-NoAsyncLoadingThread` and also says not recommended. | Performance | `-NoAsyncLoadingThread` | flag | not set | Default OFF (dev says not recommended). Offer as an Advanced toggle with the caveat. | LP, QS, RS, XG |
| `-DisableAsyncLoadingThread` | bare | B | (name as written on the LP page) | The heading on the dev's launch-parameter page; same description as above. Whether the game accepts this spelling is UNVERIFIED. Do not emit it; use `-NoAsyncLoadingThread` which both the dev's quickstart and example file use. | Performance | n/a | flag | not set | No | LP |
| `-NOSTEAM` | bare | B | DO NOT USE | Dev warning: "Do not -NOSTEAM when running your server"; XG says it breaks server functionality. Panel must never emit it. | n/a | n/a | n/a | n/a | Block it | LP, XG |

## Notes for the template

Minimum working start command (official, QS/RS, run from `<install>\AbioticFactor\Binaries\Win64\`):
`AbioticFactorServer-Win64-Shipping.exe -log -newconsole -useperfthreads -NoAsyncLoadingThread -MaxServerPlayers=6 -PORT=7777 -QueryPort=27015 -ServerPassword=YourServerPassword -AdminPassword=YourAdminPassword -SteamServerName="Your Server Name"`

The dev quickstart includes `-NoAsyncLoadingThread` but the dev launch-parameter page says it is not recommended, so a safe panel default is: `-log -newconsole -useperfthreads -MaxServerPlayers=.. -PORT=.. -QueryPort=.. -SteamServerName=".." [-ServerPassword=..] [-AdminPassword=..] [-WorldSaveName=..]` (matches XG's own example minus `-newconsole`).

Panel-managed set: `-PORT`, `-QueryPort`, `-SteamServerName`, `-ServerPassword`, `-AdminPassword`, `-MaxServerPlayers`, `-WorldSaveName`. `-AdminPassword` omitted when empty (omitting disables password-admin; do not pass an empty value).

First-creation only: no source labels any argument as first-creation only. `-WorldSaveName` behaves as "creates the world if that folder doesn't exist" (XGN), so treat it as chosen-once. `SandboxSettings.ini` is created per world save by the game (GSK) and `Admin.ini` appears after a first run (QS implies it; not stated explicitly).

Protocols (third-party only): game port 7777 UDP, query port 27015 UDP (XGP). Dev quickstart says only "port forward 7777 and 27015" (QS). LAN discovery port 14001 for `-LANOnly` (LP; protocol not stated).

Generic vs game-specific: the dev wiki itself documents all of the above as server arguments; I found no other engine args in a source (not `-ini:`, `-ExecCmds`, etc.). Only `-log`, `-newconsole`, `-useperfthreads`, `-NoAsyncLoadingThread`, `-MultiHome` are generic-engine flavored, and all are dev-documented, so safe; marked UE above is an inference from their names (the sources do not say which are engine vs game flags).

## UNVERIFIED
- Whether `-DisableAsyncLoadingThread` is a real accepted flag (LP header) versus `-NoAsyncLoadingThread` (QS, RS, XG); the LP page contradicts itself.
- Whether the root `AbioticFactorServer.exe` exists as a launcher (candidates note); only `AbioticFactorServer-Win64-Shipping.exe` is confirmed.
- Default values for `-PORT`, `-QueryPort`, `-SteamServerName`, `-ServerPassword` when the flag is omitted (no source states engine defaults; 7777/27015 are example values; XG's "A Pterodactyl Hosted Server" is a hosting-egg default).
- Case sensitivity of flags.
- Whether `-log` alone captures output without `-newconsole` (relevant to a panel that wants stdout).
- Whether `-AdminIniPath` works exactly as described (the wiki example is a copy-paste of the Sandbox one).
- Whether any argument is first-creation only; protocols beyond XG's third-party UDP claim.
- Any additional UE arguments (e.g. `-ini:`, `-ExecCmds`, `-NoPause`, `-unattended`, `-nosplash`, `-nullrhi`, `-stdout`) - none found in a source, not listed. `-Port` vs `-PORT` casing differs across third-party guides (supercraft, via search summary only; page not fetched).
- Whether a server-side RCON/stop command exists (outside this step).
- The official-ness of the DFJacob wiki is based on the Steam server tool page / community consensus; not independently confirmed in this pass.
- Raw saved copies: C:\Users\vulca\AppData\Local\Temp\claude\c--GodlyPanel\5e664e5d-9cf5-48e8-83cd-427e6c66bc6d\scratchpad\research\abiotic\raw\ (lp.md, qs.md, xg.html).
