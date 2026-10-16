# VEIN - MODS

Sources used (from sources.md MODS list):
- GSK-MODS: https://www.gameserverkings.com/knowledge-base/vein/vein-mods/ (saved: raw/mods_gsk.txt, raw/mods_gsk.html)
- GSK-SERVER: https://www.gameserverkings.com/knowledge-base/vein/vein-dedicated-server/ (saved: raw/server_gsk.txt, raw/server_gsk.html)

Also read (official Ramjet Notion pages, from the BASICS list, checked for mod text):
- https://ramjet.notion.site/dedicated-servers (saved: raw/ramjet_dedicated_servers.txt)
- https://ramjet.notion.site/Initial-Setup-279f9ec29f17809c9ebce81e96ec48e7 (saved: raw/ramjet_initial_setup.txt)

## Lines

- Does the dedicated server support mods: NOT FOUND as an official feature. The sources show no official server mod support. Only community-run options are described: pak mods "may work" on the Linux server, and this is untested by the publisher of the page ("treat this as an experiment") (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/). UE4SS mods "can't run on it" (same URL).
- Official mod support: "Official mod support is on the roadmap, but it's a long way off." Lead developer, March 2026: "done a little bit of work on modding. Don't get too excited, as we're still super early with this work, and it isn't a high priority at all." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Steam Workshop: "There's no Steam Workshop for VEIN and no built-in mod menu." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Mod sources: "Every VEIN mod is community-made, most of them hosted on Nexus Mods." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Pak mod install (PC): "copy the .pak file (plus any .utoc/.ucas files with the same name) into Vein\Content\Paks." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Pak mod install (server, untested): "Upload the same .pak file (and its .utoc/.ucas, if it has them) that every player has installed." Folder: "Vein/Content/Paks" (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- UE4SS mod install (PC): "first extract the VEIN build of UE4SS into Vein\Binaries\Win64, so that a ue4ss folder appears next to the game's executable. Then extract each mod into Vein\Binaries\Win64\ue4ss\Mods." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- UE4SS on server: "UE4SS mods can't run on it. They install into Binaries\Win64, which is part of the Windows game. The Linux server has no Win64 folder for them to go in." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Folder paths: PC install folder "...\steamapps\common\Vein\Vein\Content\Paks" (pak) and "...\Vein\Vein\Binaries\Win64\ue4ss\Mods" (UE4SS) (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/). Server pak folder: "Vein/Content/Paks" (same URL).
- Config or file names involved: NOT FOUND for mods in config files. The page names no mod config file. Server settings in Game.ini are not described as mod settings on this page.
- Do clients need the same mods: Yes for UE4SS: "In order to work ServerSide all clients will require to have the mod installed." (Move Everything, Custom Container Weights and Item Modifier pages, quoted at https://www.gameserverkings.com/knowledge-base/vein/vein-mods/). Pak mods: "Assume every player and the server need the same file at the same version." (same URL; page's own advice, authors not tested). Translations and visual-only mods: "should be fine on your PC alone." (same URL).
- Version matching: "clients need the same mod at the same version" is the page's advice (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/). Auto update: server "Auto update setting (Startup tab, on by default) updates VEIN every time the server starts." (same URL)
- Loader/framework needed: UE4SS for UE4SS mods. "Mods for VEIN must be run with the experimental version of UE4SS", quoted from the Nexus prepackaged VEIN build author (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/). Pak mods need no loader on this page.
- Warning in game: "Since 0.024 Hotfix 2 the game even shows a warning when it detects mods." (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
- Popular mods/frameworks named (no Nexus ids shown on the page):
  1. UE4SS (framework; "the VEIN build of UE4SS", experimental) (https://www.gameserverkings.com/knowledge-base/vein/vein-mods/)
  2. Move Everything (UE4SS mod) (same URL)
  3. Custom Container Weights (UE4SS mod) (same URL)
  4. Item Modifier (UE4SS mod) (same URL)
  5. 0.023 Hotfix 4 megapack on Nexus (pak megapack; named without an id; author "doesn't test combinations") (same URL). The page names no fifth distinct pak or framework by name; the megapack is the only other one named.
- Mod ids: NOT FOUND (no Nexus or workshop ids shown on either page).

## Other notes (from the pages, not rows above)

- Ramjet Notion pages (Dedicated Servers, Initial Setup): no mention of mods. Initial Setup says ports UDP 27015 (Steam check) and 7777 (gameplay). The Config, Troubleshooting and Bans sub-pages were linked from the Dedicated Servers page as text but I did not find their URLs in the page links, so they were not opened.
- GSK-SERVER page: only a link to the mods page ("VEIN mods: what works on your PC and on a dedicated server"), no server-side mod steps of its own.

## NOT FOUND / UNSURE

- Official server mod support: NOT FOUND on any read page. Community pak mods on the server are untested per the source.
- Mod config file names: NOT FOUND.
- Mod ids (Nexus or workshop): NOT FOUND.
- Whether a pak mod works on the server: UNSURE. The source says it "may work" but is untested.
- Ramjet Config page: not read (no URL found in the page's links).
