# Icarus: verification on a real install

Server build 3.0.31.158478 (Dangerous Horizons), install 9.7 GB, scratch panel, 2026-10-15. Two start/stop cycles plus one extra start for the status check.

| Check | Result | Evidence |
|---|---|---|
| 1. Creation, script, config | PASS | Job done in ~6 min. `Start_Icarus.bat` = `start /MIN "Scratch icarus" "Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe" -Log -SteamServerName="Scratch icarus" -PORT=31120 -QueryPort=31122`. `Icarus\Saved\Config\WindowsServer\ServerSettings.ini` written with the 12 keys of the notes (JoinPassword = server password, AdminPassword set, MaxPlayers=8). servers.json: processName `IcarusServer-Win64-Shipping.exe`. |
| 2a. Process that stays running | PASS | Shipping exe started directly stays running (command line identical to the script) with one child `Icarus\Plugins\Sentry\Binaries\Win64\crashpad_handler.exe`. No `IcarusServer.exe`, no launcher. processName matches. |
| 2b. Works without `IcarusServer.exe` / `steam_appid.txt` | PASS | Log: `Game Server API initialized 1` (AppId 1149460), `Match State Changed from EnteringMap to WaitingToStart`, `Dedicated server begin processing commands`, version `3.0.31.158478-Shipping-DangerousHorizons`. `steam_appid.txt` already ships in `Binaries\Win64`. |
| 2c. Ports | PASS | Log `SteamNetDriver bound to port 31120 / listening on port 31120`. netstat: UDP 31120 and UDP 31122 only (plus an outbound TCP to Steam :27018). Matches template: game UDP + query UDP, nothing else. (UDP 31120 also showed under the scratch StarRupture pid: scratch harness gave two servers the same port; harness artefact.) |
| 2d. `/api/status` | PASS | 40 s after Start: `{"type":"icarus","online":true,"playerCount":0,"playerList":[]}` (process check). |
| 3a. Where `Saved` lands | PASS | Inside the install: `scratch-icarus\Icarus\Saved\{Config,Logs}`. `%LOCALAPPDATA%\Icarus` does not exist. Official Server-Setup wording is right, panel paths are right. |
| 3b. Pre-written ServerSettings.ini is read | PASS | Edited `MaxPlayers=5` and `CreateProspect=Tier1_Forest_Recon_0 3 false TestProspect01`: A2S then reported max players 5 (8 before) and the log says `LogDedicatedServerEntry: Attempting to create prospect: Tier1_Forest_Recon_0`. The game did not overwrite the file. Password enforcement not provable without a client (A2S password flag stays 0 in lobby state). `GET /api/config/Scratch%20icarus?file=ServerSettings.ini` returns the 12 keys. |
| 3c. Files the game creates | PASS | `Saved\Config\WindowsServer\GameUserSettings.ini` (empty), `Saved\Config\CrashReportClient\...`, `Saved\Logs\Icarus.log`, and on every later start `Saved\Logs\Icarus-backup-<time>.log` (previous log kept), `Binaries\Win64\.sentry-native`. |
| 4a. Query port answers | PASS | A2S_INFO to UDP 31122: valid reply, protocol 17, name `Scratch icarus`, folder/game `Icarus`, players 0, max 8 (5 after the edit), type d, env w, VAC 1, edf game port 31120, keywords `...,SESSIONFLAGS:683,P_s:Lobby,G_s:3.0.31.158478-x-x`. A2S_PLAYER answers (challenge reply). The game port 31120 does not answer A2S. So the query port speaks Steam A2S. |
| 4b. `-SteamServerName` with spaces | PASS | A2S name = `Scratch icarus`. |
| 5. Stop | PARTIAL | Each Stop returned `Scratch icarus closed gracefully.`, process and crashpad child gone in under 6 s, nothing left under the folder. No Icarus log (3 checked) contains `Log file closed`, `LogExit` or any shutdown line, so the exit is abrupt (no normal Unreal shutdown sequence). |
| 5b. World creation / save on Stop | UNTESTED | With `CreateProspect` set the log stops after `GenerateProspects request` / `response - Succeeded` (`OnResGenerateProspects was not bound to a response handler`, `Login() failed: Empty Id`, `OnResUserTicket : No player found`). No `Saved\PlayerData`, no prospect JSON appeared in ~2.5 min. Without a client no world loaded, so what Stop does to a world is unknown. |
| 6. `-help` | N/A | Unreal shipping server has no usage output. All four arguments (`-Log -SteamServerName -PORT -QueryPort`) were honoured. |

## Not tested (needs a real client)
JoinPassword/AdminPassword enforcement, MaxPlayers above 8, world saved on Stop, whether 15 s is enough for a saving world, `.pak` mods folder, Windows prerequisites on a clean PC, ban list file names.

## Discrepancies to fix
1. `src/server/data/games/icarus.js` (notes decision 5, `method: "process"`): the query port answers A2S, so `method: "gamedig"`, type `icarus`, on the QUERY port (31122, not the game port) would give name/online state; player counts through A2S not proven with a client. Optional; `process` stays safe.
2. Stop is effectively a kill although the panel prints "closed gracefully" (the process simply exited within one poll). Keep the "no graceful stop" limitation text; do not claim a save. Adding `icarus` to `stopGraceMs` would not change anything (exit took under 6 s); advise users in the guide to let autosave happen or return to the lobby before Stop.
3. Notes item "ServerSettings.ini is never replaced": confirmed. Items 1, 2, 3, 5, 7 of "MUST be verified": confirmed as written. No change to `processName`, `configPaths`, log dir.
4. Add to the guide (optional): every start leaves an `Icarus-backup-<time>.log` in `Saved\Logs` (Logs tab will list several files; the Icarus.log is the current one).
5. `CreateProspect` in the ini is accepted and parsed, but creating a world at startup did not complete without a client; do not promise "the world starts automatically" in the CreateProspect text. Unverified after the log stalled.
