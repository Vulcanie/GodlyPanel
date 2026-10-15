# Garry's Mod: implementation notes (2026-10-15)

Nothing was run on a real install. Facts come from the dossier (01..04) only.

## Files created (no existing file edited, not registered)
- `src/server/data/games/garrysmod.js` (template, backup, logs, launchOptions: true)
- `ui/src/catalog/games/garrysmod.js` (files, launch, guide)
- `tests/unit/game-garrysmod.test.js` (25 tests, pass), `ui/src/__tests__/game-garrysmod.test.js` (28 tests, pass)
- Lead must add `import garrysmod from "./garrysmod.js"` and the entry to both `index.js` lists (server and ui).

## What was built
- Template: id/type `garrysmod`, displayName "Garry's Mod", method `process`, updateAppId 4020, storeAppId 4000, installLayoutRoot "", processName `srcds.exe`.
  Fields: sessionName, serverPassword, mapCode (mapChoices gm_construct, gm_flatgrass), gslt, mods (one Workshop collection id or link). gslt/mods use fieldMeta labels only (no existing file touched).
  Port: one `port`, default **27145** (UDP; offset 1 kept free by the panel's precaution rule). 27015 is Core Keeper's, 27115/27116 clashed with Space Engineers' 27116 (its +1 rule), 27315 is Unturned's. Checked against all current `GAME_TEMPLATES` plus the unregistered soulmask and spaceengineers modules.
- Start script: `start /MIN "<name>" srcds.exe -console -game garrysmod -port N -strictportbind +maxplayers N +gamemode sandbox +map <map> -condebug` then `+sv_setsteamaccount <GSLT>` and `+host_workshop_collection <id>` only if given. Nothing has to be last, so the Launch options form is on. All inputs are validated in `resolveParams` (and re-checked while building the script, so a hostile value is dropped, never written).
- Launch catalog: 19 arguments, 16 editable. Non-editable and managed: `-console`, `-game`, `-condebug`. Editable: `-port`, `-strictportbind`, `-ip`, `-tickrate`, `+maxplayers`, `+gamemode` (sandbox/terrortown, custom allowed), `+map`, `+sv_setsteamaccount`, `+host_workshop_collection`, `-disableluarefresh`, `-noworkshop`, `-noaddons`, `-noconclr`, `-allowlocalhttp`, `-nocrashdialog`, `-insecure`. Style "plus" as in Rust's definition; minus flags carry style "space" (the parser treats the two the same).
  Only one spelling of each pair is listed (`+maxplayers` not `-maxplayers`, `-port` not `+hostport`, `-ip` not `+ip`) because the form key is the flag without its sign, so two spellings would collide.
- Settings catalog: `autoexec.cfg` 2 settings (hostname, sv_password); `server.cfg` 145 settings in 16 groups (access/security, voice, gameplay, physics, network, downloads/Workshop, RCON, logging, Sandbox limits and rules, TTT rounds/roles/credits/karma/players). Parser `convar` (the Rust one) for both. On/off settings are 0/1 dropdowns; `mp_falldamage` also accepts a typed value.
- Backup: garrysmod/data, garrysmod/cfg, garrysmod/settings/users.txt, garrysmod/lua/autorun/server, garrysmod/addons. Logs: `garrysmod/console.txt` (written because of `-condebug`, per the Facepunch ConVars page).

## Deviations from the brief and the dossier
1. **Name and password go in `autoexec.cfg`, not `server.cfg`.** The panel updates with `+app_update ... validate`, which restores files the game ships; `server.cfg` is shipped (empty), so the panel's hostname/password would be wiped by the first update. `autoexec.cfg` is not shipped and the shipped `valve.rc` runs it (dossier 02). Everything else is in `server.cfg`, which the user edits. Both files appear in the Settings tab. Cost: if the same setting is in both, the later one wins and the dossier could not say which runs later (U2).
2. **method `process`, not `rcon`.** The Source RCON is real (Valve: TCP on the game port, `rcon_password`; the panel's rcon-client speaks it), but `stopCommandFor` in `src/server/services/gameCommands.js` returns "DoExit" for any type it does not know, which Source ignores; the panel would report "stop command sent" while the server kept running. Fixing this needs an edit to an existing file (see lead actions). No rconPort/rconPassword on the entry; `rcon_password` stays an optional setting in `server.cfg`.
3. GSLT is a template field (as Unturned does), written on the launch line (the documented place; a convar in a cfg may run too late). `-authkey` left out entirely (UNVERIFIED, probably ignored).
4. Max players ceiling of 128 is mine (dossier: UNVERIFIED, "limited by the game/mod"); default 16 (LinuxGSM).
5. No `estimatedInstallBytes` (the dossier has no size).
6. The map dropdown at creation has two maps (the two the Facepunch wiki and guides name). Any other map is set with the Map launch argument.

## Left out, and why
`-authkey`, `-clientport`/`+clientport`, `-sport`/`-steamport`, `+tv_port`, `-nohltv`, `-multirun`, `-p2p`, `-netconport`/`-netconpassword`, `-threads`, `-heapsize`, `-norestart`, `-autoupdate` and the other `srcds_run` options (all UNVERIFIED for Garry's Mod on Windows or not relevant). `+hostname` (the dossier: spaces fail) and `+sv_lan`/`+hide_server` (those are in `server.cfg`). `sv_region`, `fps_max`, `sv_pure`, `net_maxfilesize` (direction disputed), `mp_timelimit`, `mapcycle.txt` (the shipped file says GMod does not use it), `srcds_workshop_ids.txt` (new, layout partly unverified), `toolmode_allow_<tool>`, the unexplained TTT variables, DarkRP/Murder/Prop Hunt settings, `sk_*` NPC files, `users.txt` (KeyValues, no reader), `sv_location` list. Defaults are mentioned only for TTT (literal in the shipped Lua) and `sv_gravity` (two lists agree).

## Must be verified on a real install
1. `srcds.exe` is the process that stays running in the install folder (not a launcher), and `-game garrysmod` is accepted.
2. `hostname` and `sv_password` set in `autoexec.cfg` really apply (server name in browser, password asked), and `server.cfg` lines override them or not.
3. When `server.cfg` runs (once, or every map load) and that `ttt_*` / `sbox_*` lines in it take effect.
4. Does `validate` reset `server.cfg` (deviation 1 assumes yes) and leave `autoexec.cfg` alone.
5. Stop: does the panel's window-close shut srcds down, and does it run the ShutDown hooks (Sandbox saves persistent props on ShutDown)? If not, data since the last save is lost.
6. `-condebug` writes `garrysmod/console.txt` and the Logs tab shows it.
7. The `+host_workshop_collection` download works with no `-authkey`; players' client-download behaviour with only a collection (the panel warns).
8. A server without a GSLT starts and what the server list does; an invalid one blocks start (per the wiki).
9. `-strictportbind` is accepted; Source RCON/query on the same port number as the game port; `+maxplayers` upper limit.
10. Two servers on one PC (default Steam port 26900 and client port 27005 are shared by Source servers).

## Panel limits for this game
- No graceful stop or save command (see deviation 2); process polling gives no player count (A2S exists on the game port but the dossier does not verify the `gamedig` type name).
- The Stop-with-RCON option, save-before-stop and broadcasts would need `gameCommands.js` entries for `garrysmod`.

## Lead actions
- Register in both `index.js` files.
- Optional follow-up to enable RCON: in `gameCommands.js` add `garrysmod` to `stopCommandFor` (Source's `quit`, not verified in the dossier), then switch the template to method `rcon` with `rconPort: p.port`, field `rconPassword`, and write `rcon_password` into `autoexec.cfg`.
