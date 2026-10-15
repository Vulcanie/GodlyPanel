# Garry's Mod: verification on a real install (2026-10-15) - DRAFT after cycle 1

Install: scratch panel, template `garrysmod`, server "Scratch garrysmod", port 31130, 7 GB, install took 75 s.

| check | result | evidence |
|---|---|---|
| Creation completes, files written | PASS | job done in 75 s; warning about missing GSLT shown. Start_GarrysMod.bat: `start /MIN "Scratch garrysmod" srcds.exe -console -game garrysmod -port 31130 -strictportbind +maxplayers 16 +gamemode sandbox +map gm_construct -condebug`. autoexec.cfg has `hostname` and `sv_password` lines. shipped server.cfg is 4 bytes (empty). |
| srcds.exe is the process that stays; `-game garrysmod` accepted | PASS | one process `srcds.exe` (cmdline as the .bat), no launcher child; servers.json processName `srcds.exe`. Game ran (console.log shows map cycle, network line). |
| /api/status online | PASS | `online:true, playerCount:0` (process polling, "[poll] is now online"). |
| Ports bound vs template | PARTIAL | UDP 31130 (game), TCP 31130 (RCON). Extras the template does not mention: UDP 27020 (Steam client/HLTV, fixed), UDP random client port (44309), TCP 127.0.0.1:53529 (random local), outgoing TCP to Steam. Both game ports are bound only on the PC's first adapter address for TCP (100.93.186.48 here), see discrepancies. |
| console.log from -condebug | FAIL (name) | file is `garrysmod\console.log`, NOT `console.txt`. Template Logs entry `garrysmod/console.txt` would show nothing. |
| server.cfg runs at start | PASS | `echo MARK_SERVERCFG_RAN` in server.cfg appears in console.log at startup. |
| Stop | PASS | API "closed gracefully" in 4.5 s; no process left under the folder. |
