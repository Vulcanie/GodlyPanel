# Soulmask - 05-implementation-notes.md

Built 2026-10-15 from 01-basics.md, 02-config.md (early draft only), 03-launch-args.md, 04-mods.md and the raw sources in `raw/`.

## What was built (new files only)
- `src/server/data/games/soulmask.js` - template, backup, logs, launchOptions. Not registered in `games/index.js` (lead does that).
- `ui/src/catalog/games/soulmask.js` - `{ type, title, files: {}, launch, guide }`. 28 launch arguments, 0 settings (no settings file in the form, like Core Keeper / Satisfactory).
- `tests/unit/game-soulmask.test.js` (21 tests, node:test, pass) and `ui/src/__tests__/game-soulmask.test.js` (16 tests, vitest, pass).

## PROMINENT LIMITATION: no graceful stop
The only safe save/stop is the telnet console on EchoPort (`saveworld 1`, then `quit 30`; Fandom). The panel cannot send it, and recording the port as `telnetPort` would make the panel send 7 Days to Die's `saveworld` line to it (serverControl.js), whose format for Soulmask is unverified, so `telnetPort` is NOT recorded. The panel closes the window and force-kills after 15 s. Fandom and SARA both warn that closing the window can roll the world back. The world reaches disk every `-backup` seconds (900 as started), so a Stop can lose up to 15 minutes. Mitigations in place: the guide's first note says so and tells the user to lower `-backup` (editable in Launch options) or save by hand over telnet first. SARA also claims Ctrl+C in the console saves and exits; the panel does not send Ctrl+C. RCON (`-rconpsw`, port 19000) exists per SARA but its protocol is unverified and the panel does not use it (`method: "process"`).

## How the server is started
```
@echo off
cd /d "%~dp0"
set SteamAppId=2646460
start /MIN "<name>" "WS\Binaries\Win64\WSServer-Win64-Shipping.exe" Level01_Main -log -server -UTF8Output -PORT=8777 -QueryPort=8779 -EchoPort=18888 -forcepassthrough -SteamServerName="<name>" -MaxPlayers=20 [-PSW="<pw>"] -adminpsw="<pw>" -pve -saving=600 -backup=900 -serverpm=2 [-mod="ID1,ID2"]
```
Modelled on SARA's verbatim `serve.bat` (same order and flags, plus the Shipping exe path and `SteamAppId`), with SIB/GSM agreeing that the Shipping exe is launched directly.

## Decisions and deviations from the dossier
- **Process name: `WSServer-Win64-Shipping.exe`** (UNVERIFIED, see below). Reason: SARA, SIB and GSM all run the Shipping exe directly, SIB says explicitly not the `WSServer.exe` wrapper; so with this script the Shipping exe is certainly the process the panel starts. Only Fandom (firewall FAQ) names `WSServer.exe`.
- **Ports**: game `8777` UDP (the game's own default), query `8779` UDP (not 27015, which Core Keeper uses; game + 2 because the port after the game port is kept free), console `18888` TCP (game default). Checked against every default in GAME_TEMPLATES plus their implicit ports: no clash (test enforces it). The console port is a template port with key `echoPort`, recorded in the entry as `echoPort`; the panel's clash check only reads `port/queryPort/rconPort`, and its Ports editor only knows those, so the console port is not clash-checked and is changed in Launch options (documented in the guide).
- **Max players**: not a template field; `p.maxPlayers` from the create form (optional), default 20 (Fandom Engine.ini sample). Accepts 1 to 9999 (sanity bound only; the real limit, ~70 claimed by two third parties, is unverified).
- **-pve is written by default** (Fandom's examples use it; Engine.ini sample shows pvp=False; IB image defaults to pve). There is no form field for it. `-pvp` is an editable flag; the form description tells the user to use one or the other. What `-pve/-pvp` change in the game's settings is unknown (SARA does not list it).
- **-saving=600 -backup=900** written explicitly (SARA's example; equal to the Fandom sample defaults). The 300 vs 600 conflict (GAZ) was resolved to 600 (SARA, Fandom, LOW, IB).
- **-serverpm=2 written by default**: SARA and SIB both say without it all ban/allow lists are off after every restart so bans do not hold; SIB defaults to 2.
- **Admin password**: if the form field is empty a random 12-hex-character one is generated (SARA: "always set one"). It is only in the start script / Launch options (never logged, not in the server entry). What the game does with no `-adminpsw` at all is unknown, which is why one is always set. Join password: `-PSW` is left off when empty (open server).
- **Map choice** uses the template's `mapChoices` (Level01_Main = Cloud Mist Forest; DLC_Level01_Main = Shifting Sands, needs the DLC). The dossier says first-creation-only; the level name is validated against this list. The DLC map is single-/few-source (IB README, SIB, games.gg).
- **Mods field** per 04-mods.md: `resolveParams` validates with DST's `parseWorkshopIds` (ids or Workshop links, digits only, deduplicated, order kept, max 100); the line gets `-mod="ID1,ID2"` only when non-empty. No loader, no extra download step. `-mod` is editable in Launch options, but a `-mod` added later from the form (not already on the line) is written without quotes (the editor quotes only values with spaces); see verification item 7.
- **Steam DLLs**: `copyInstalledFiles` copies `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` from the install root to `WS\Binaries\Win64` (IONOS names these three; SARA's update.bat copies the root DLLs). The hook never overwrites an existing file and only logs if a source is missing. The copies are not refreshed by a later update. `crashhandler64.dll` (anecdotal, from a Steam client install) not included.
- **steam_appid.txt** is not written by the panel (`SteamAppId` env var is set in the script instead, as SARA/SIB do; Fandom says the file is shipped).
- Backups: `WS/Saved/Worlds` (both maps, plus the game's own `.db` backups wherever they land), `WS/Saved/GameplaySettings`, `Engine.ini`, and the five permission list files (names from SARA's permissions page). Logs: dir `WS/Saved/Logs` (WS.log).

## Left out, and why
- **GameXishu.json (no settings form)**: the file is JSON with 152 keys x 3 groups ("0","1","2"; a dedicated server reads "1"; only `GameWorldDayTimePortion` differs between groups in the gitlab copy), so the json parser could read it as `1.<Key>`, but NO source in the dossier explains any key (pinyin names such as `CaiJiDiaoLuoRatio`; 02-config.md is an early draft with URLs only). Rule: no explanation guessed, so no catalog entries. It is backed up and the guide explains where it is and that group 1 is what counts. If a later research pass sources key meanings, add `files: { "GameXishu.json": { parser: "json", ... } }` with keys `"1.<Key>"` (and a template `configPaths` entry; none is recorded now). Also unknown: whether the game rewrites floats such as 0.699999988079071 on save, and `-coef` renames the file to `GameXishu_<Name>.json`.
- **Engine.ini** (`[Dedicated.Settings]`, `[Server.SafeIP]`): not offered; the dossier says the command line takes precedence and most options are command-line only; the file may not exist.
- Arguments not offered: `-forcepassword`, `-mapcycle` (no source, per the brief); `-online=Steam`, `-SILENT` (undescribed Docker-example flags); `-gamedistindex` (obsolete); `-NOSTEAM`; level suffixes `?CustomGameMode`, `?ND` (ignored / broken); generic UE4 switches (none sourced).
- Explained but `edit: false` (add by editing the script): `-coef`, `-serverid`, `-mainserverport`, `-clientserverconnect` (data-changing cluster/identity flags), and the four required flags `-server -forcepassthrough -log -UTF8Output`.
- Not recorded/used: RCON (`-rconpsw/-rconaddr/-rconport` explained and editable, but the panel does not use them), A2S query (unverified), `telnetPort` (see above), the shipped `StartServer.bat` (contents unknown; own script written).
- `rconPassword` field not asked for.

## Needs real-install verification
1. **Which process stays running**: `WSServer-Win64-Shipping.exe` (chosen) versus a `WSServer.exe` wrapper. With the direct launch, check Task Manager that the Shipping exe stays and the panel shows the server running/stopped correctly; check where the exe really is (`WS\Binaries\Win64` per games.gg/IONOS/SARA; one Steam post says `Engine\Binaries\Win64`) and that `-log` console window appears and closes on Stop.
2. **Steam init**: `WS\Saved\Logs\WS.log` shows `[AppId: 2646460] Game Server API initialized 1` with `SteamAppId` set and the copied DLLs; whether the DLL copy is still needed, whether the three root DLLs exist after SteamCMD, whether `WS\Binaries\Win64\steam_appid.txt` is shipped.
3. **Stop behaviour**: after Stop (window close then force kill) and restart, is the world rolled back to the last `-backup` write? Does a window-close save? Test `saveworld 1` / `quit 30` over telnet 127.0.0.1:18888 (line format, replies, whether `quit` saves).
4. **Quoted values on a `.bat`**: `-SteamServerName="a b"` and `-PSW`/`-adminpsw` with spaces, `%%` becoming `%`, reach the game intact when started through `start` (the Shipping exe directly).
5. **Settings file**: that `WS\Saved\GameplaySettings\GameXishu.json` appears on the first start (with the `0/1/2` groups), the world folder name (`Worlds\Dedicated\Level01_Main`) and whether the DLC map uses `DLC_Level01_Main`; location of the game's own auto-backup files.
6. **Defaults without flags** (`-MaxPlayers` upper limit, `-saving` default, what `-pve` changes, what happens with no `-adminpsw`, whether `-serverpm=2` creates the ban list files in `WS\Saved`).
7. **Mods**: `-mod="ID"` in the `.bat` with one small mod; where it downloads (`WS\Mods\`); whether an unquoted `-mod=1,2` (added from the Launch options form later) survives cmd's comma handling.
8. **Ports**: that `-PORT=8779`-style non-default ports work (query port 8779 instead of 27015) and the server list finds it; `-PORT` vs `-Port` case; first-start Windows Firewall prompt (program name).
9. Startup takes 2 to 5 minutes and ~12 GB memory; the panel's start/online detection should not mark it failed in that time (process method polls only the process).
10. DLC map `DLC_Level01_Main` starts on the dedicated server with no extra step.

## Panel limitations for this game
- No graceful stop (above). No player list / A2S status verified. Echo port not in the Ports section nor clash-checked. Launch editor appends new args at the end, harmless here (the level name is first and nothing needs to be last). If lead registers this module, the generated launch-arguments guide in docs/ (if a test checks it) may need regenerating.
