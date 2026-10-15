# Garry's Mod dedicated server: basics (DRAFT 1, researched 2026-10-14)

Store app 4000, dedicated server app 4020. Facts are for the current stable ("public") branch as documented 2026-10-14.

## SteamCMD
- App id 4020, anonymous login works: `steamcmd.exe +login anonymous +force_install_dir c:\my_garrysmod_server\ +app_update 4020 validate +quit` (Facepunch wiki: https://wiki.facepunch.com/gmod/Downloading_a_Dedicated_Server)
- Same page warns `force_install_dir` set before login can cause update failures (page text says it can; it suggests logging in after setting it). Panel note: put `+force_install_dir` before `+login`? Page order shown above is login first, then force_install_dir. Follow the page order.
- Beta branches: `-beta dev`, `-beta prerelease`, `-beta x86-64`, back to stable with `-beta public` (same page).

## Launch (Windows)
- Page example: `srcds.exe +maxplayers 20 -console +gamemode sandbox +map gm_construct +sv_setsteamaccount <your token>` (same page).
- Workshop: `+host_workshop_collection <id>` (https://wiki.facepunch.com/gmod/Workshop_for_Dedicated_Servers)

(continuing research; sections below to be completed)
