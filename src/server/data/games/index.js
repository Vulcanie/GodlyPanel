// Games added one module each. A game's module (src/server/data/games/<id>.js) default-exports
//   { template, backup, logs, launchOptions, mods }
//   template       the same recipe as an entry of GAME_TEMPLATES in ../gameTemplates.js
//   backup         { paths: [...] } for ../backupTemplates.js (what a backup of this game's server keeps)
//   logs           [...] for ../logTemplates.js (the log files the Logs tab reads)
//   launchOptions  true when the game's start script gets a "Launch options" form on the Settings tab
//   mods           the game's mod block for ../modTemplates.js, when its mods folder is documented
// and is listed here. The settings, launch arguments and wording the interface shows for the same game are in
// ui/src/catalog/games/<type>.js.
import abiotic from "./abiotic.js";
import dst from "./dst.js";
import icarus from "./icarus.js";
import scum from "./scum.js";
import starrupture from "./starrupture.js";
import soulmask from "./soulmask.js";
import garrysmod from "./garrysmod.js";
import barotrauma from "./barotrauma.js";
import necesse from "./necesse.js";
import l4d2 from "./l4d2.js";
import squad from "./squad.js";
import armareforger from "./armareforger.js";
import vein from "./vein.js";
import unturned from "./unturned.js";
import spaceengineers from "./spaceengineers.js";
import terraria from "./terraria.js";
import svencoop from "./svencoop.js";
import css from "./css.js";
import hl2dm from "./hl2dm.js";
import astroneer from "./astroneer.js";
import avorion from "./avorion.js";
import minecraftVanilla from "./minecraft-vanilla.js";
import terrariaVanilla from "./terraria-vanilla.js";
import theforest from "./theforest.js";
import wurmunlimited from "./wurmunlimited.js";
import theisle from "./theisle.js";
import mordhau from "./mordhau.js";
import teamfortress2 from "./teamfortress2.js";
import counterstrike2 from "./counterstrike2.js";
import bannerlord from "./bannerlord.js";
import insurgencysandstorm from "./insurgencysandstorm.js";
import l4d from "./l4d.js";
import zps from "./zps.js";
import brainbread2 from "./brainbread2.js";
import dods from "./dods.js";
import fof from "./fof.js";
import nmrih from "./nmrih.js";
import insurgency from "./insurgency.js";
import pvkii from "./pvkii.js";
import dystopia from "./dystopia.js";
import empires from "./empires.js";
import doubleaction from "./doubleaction.js";
import hlds from "./hlds.js";
import iosoccer from "./iosoccer.js";
import battalionlegacy from "./battalionlegacy.js";
import blackmesa from "./blackmesa.js";
import militaryconflictvietnam from "./militaryconflictvietnam.js";
import scpsl from "./scpsl.js";
import colonysurvival from "./colonysurvival.js";
import risingworld from "./risingworld.js";
import warfork from "./warfork.js";
import ns2 from "./ns2.js";
import chivalry from "./chivalry.js";
import hurtworld from "./hurtworld.js";
import ets2 from "./ets2.js";
import ats from "./ats.js";
import medievalengineers from "./medievalengineers.js";
import pixark from "./pixark.js";
import stationeers from "./stationeers.js";
import wreckfest from "./wreckfest.js";
import ohd from "./ohd.js";
import risingstorm2 from "./risingstorm2.js";
import miscreated from "./miscreated.js";
import craftopia from "./craftopia.js";
import ballisticoverkill from "./ballisticoverkill.js";
import ageofchivalry from "./ageofchivalry.js";
import humanitz from "./humanitz.js";
import survivethenights from "./survivethenights.js";
import towerunite from "./towerunite.js";
import thefront from "./thefront.js";
import dayofdragons from "./dayofdragons.js";
import hyperchargeunboxed from "./hyperchargeunboxed.js";
import dayofinfamy from "./dayofinfamy.js";
import killingfloor2 from "./killingfloor2.js";
import empyrion from "./empyrion.js";
import atlas from "./atlas.js";
// bladesymphony.js is built but not registered: its server app 228780 installs only the binaries (bin\win64\srcds.exe); the game content in the berimbau folder comes from the base game (app 225600), which needs a Steam account that owns it. With only the anonymous install srcds.exe exits at once.
// killingfloor.js is built but not registered: its server app 215350 fails anonymous install with "No subscription", so it needs a Steam account that owns Killing Floor, which the panel cannot offer.
// redorchestra.js is built but not registered: its server app 223240 fails anonymous install with "No subscription", so it needs a Steam account that owns Red Orchestra: Ostfront 41-45, which the panel cannot offer.
// acc.js is built but not registered: its server app 1430110 fails anonymous install with "No subscription", so it needs a Steam account that owns Assetto Corsa Competizione, which the panel cannot offer.
// assettocorsa.js is built but not registered: its server app 302550 fails anonymous install with "No subscription", so it needs a Steam account that owns Assetto Corsa, which the panel cannot offer.
// eco.js is built but not registered: EcoServer.exe installs anonymously but stops at start with "Server startup was canceled by user" at a Strange Loop (StrangeCloudLogin) username and password prompt, so it needs an account the panel cannot offer.
// starbound.js is built but not registered: its server app 533830 needs a Steam account that owns the game (anonymous login: "No subscription"), which the panel cannot offer.
// stormworks.js is built but not registered: its server app 1247090 installs only a stub that points to the base game (app 573090), which needs a Steam account that owns it.
// tf2classified.js is built but not registered: the anonymous install works, but srcds_win64.exe exits at once after "No SteamApps connection." (tried with and without +map, -dedicated, -insecure), so the cause is unknown and the server never starts.

// nucleardawn.js is built but not registered: the anonymous install (app 111710) gives only about 65 MB of Steam libraries, an empty nucleardawncfg and no ndsrv.exe, so no Windows server can be installed without an account that owns the game or another depot.
// arma3.js is built but not registered: its server app 233780 needs a Steam account that owns the game (anonymous login: "No subscription"), which the panel cannot offer.
// motortown.js is built but not registered: its server app 2223650 needs a Steam account that owns the game plus a beta code (anonymous login: "No subscription"), and the create flow has no account sign-in hook.
export const GAME_MODULES = [abiotic, dst, icarus, scum, starrupture, unturned, soulmask, garrysmod, barotrauma, necesse, l4d2, squad, armareforger, vein, spaceengineers, terraria, svencoop, css, hl2dm, astroneer, avorion, minecraftVanilla, terrariaVanilla, theforest, wurmunlimited, theisle, mordhau, teamfortress2, counterstrike2, bannerlord, insurgencysandstorm, l4d, zps, brainbread2, dods, fof, nmrih, insurgency, pvkii, dystopia, empires, doubleaction, hlds, iosoccer, battalionlegacy, blackmesa, militaryconflictvietnam, scpsl, colonysurvival, risingworld, warfork, ns2, chivalry, hurtworld, ets2, ats, medievalengineers, pixark, stationeers, wreckfest, ohd, risingstorm2, miscreated, craftopia, ballisticoverkill, ageofchivalry, humanitz, survivethenights, towerunite, thefront, dayofdragons, hyperchargeunboxed, dayofinfamy, killingfloor2, empyrion, atlas];
