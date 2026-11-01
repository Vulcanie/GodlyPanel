# Troubleshooting

Find what you're seeing, then work down the list. For the exact wording of a message, see
[What the messages mean](WHAT_THE_MESSAGES_MEAN.md).

- [I can't open the panel from another device](#i-cant-open-the-panel-from-another-device)
- [I can't sign in](#i-cant-sign-in)
- [GodlyPanel won't start](#godlypanel-wont-start)
- [A server won't start](#a-server-wont-start)
- [A server is running but the panel says it's offline](#a-server-is-running-but-the-panel-says-its-offline)
- [A server keeps restarting, or the panel gave up on it](#a-server-keeps-restarting-or-the-panel-gave-up-on-it)
- [Friends can't join](#friends-cant-join)
- [A backup failed or a restore won't run](#a-backup-failed-or-a-restore-wont-run)
- [A game I created won't come online (one of the newer games)](#a-game-i-created-wont-come-online-one-of-the-newer-games)
- [A game update went wrong](#a-game-update-went-wrong)
- [Mods won't install or update](#mods-wont-install-or-update)
- [The Files tab refuses something](#the-files-tab-refuses-something)
- [Moving a server to another PC didn't work](#moving-a-server-to-another-pc-didnt-work)
- [A console window shows up when it shouldn't](#a-console-window-shows-up-when-it-shouldnt)
- [The community address doesn't work](#the-community-address-doesnt-work)
- [Discord or notifications aren't arriving](#discord-or-notifications-arent-arriving)
- [Getting help](#getting-help)

---

## I can't open the panel from another device

Open `http://<the PC's address>:8765` (not `https`), from a device on the **same network** as the PC.

1. **Right address?** The panel's own window and the server's **Network** tab show the PC's address
   (something like `192.168.1.20`). Use that, with `:8765` on the end.
2. **Same network?** Not guest Wi-Fi, not mobile data, not a VPN that routes everything elsewhere. Many
   routers keep guest Wi-Fi separate from the main network.
3. **Is it switched on for the network?** `Settings → Access → Allow access from your network` must be on
   (it is by default). When it's off, only the PC itself can open the panel.
4. **Windows Firewall.** The first time the panel ran, Windows asked whether to allow it on the network.
   If that was refused, other devices can't connect. Add an inbound rule for GodlyPanel on **Private**
   networks (Windows Security → Firewall & network protection → Allow an app through firewall).
5. **Do you see a page that says "This panel is private" or "Open it by this PC's address"?** That's
   the panel answering and refusing: see [the messages](WHAT_THE_MESSAGES_MEAN.md#pages-that-say-no).
6. **Using a name instead of the address?** A name only works if the owner has added it under
   `Settings → Network → Additional allowed names`.

## I can't sign in

- **Wrong username or password** reads the same either way. Check caps lock; usernames aren't
  case-sensitive but passwords are.
- **"Too many failed sign-in attempts"**: wait the time it says.
- **"Your password is right, but … accounts can't sign in on this public address"**: you're on the community
  address. Use the panel on your own network instead.
- **Forgotten your password?** Another administrator can set a new one for you on **People**. If you're the
  only administrator and you've forgotten it, close the panel, rename `users.json` in the `data` folder to
  `users.json.old`, start the panel on that PC, and it will ask you to create a new administrator. (Your servers
  and settings are kept. People you'd added need adding again, or copy their entries back from the old file.)
- **Signed out unexpectedly?** Sign-ins last 7 days, and end sooner if your password or role was changed.

## GodlyPanel won't start

- **"Port 8765 is already in use — another program (or a second copy of GodlyPanel) has it."** Another copy is
  probably already running; look in the system tray. Otherwise change the port: `Settings → Access → Web port`
  (or close what's using it).
- **Nothing happens when you start it.** It may be running already, hidden in the tray. A second launch just
  brings the first one to the front.
- **"GodlyPanel can't read … (EACCES/EPERM/EBUSY)"**: see [the data folder](WHAT_THE_MESSAGES_MEAN.md#the-data-folder).
- **Windows says "Windows protected your PC".** The app isn't code-signed yet. **More info → Run anyway**, or
  unblock the zip before unzipping next time.
- **It's installed in `C:\Program Files`.** Windows won't let programs save there. Move it, for example to `D:\GodlyPanel`.

## A server won't start

1. Open the server's **Logs** tab. The game usually says what's wrong in its last few lines.
2. **Ports clash.** Another program (often another copy of the same game) holds the port. The server's
   **Settings** tab ports editor shows clashes; pick different ports.
3. **No start script.** *"The panel doesn't know how to start this server…"*: add one in **Settings**, or set up
   **No window** mode under **Window & console**.
4. **Missing files.** If a game update failed halfway, run the update again (**Controls**, or **Schedules**).
5. **First start takes a while.** Some games need a few minutes to build a world before they answer. The tile
   says **Starting…** until they do. Games that finish loading but never show **Online** may have a wrong query
   port; compare the **Network** tab with the game's own settings.
6. **Not enough memory or disk.** Check **Stats** and the drive's free space.
7. **A new game and no settings file yet.** Start it once so the game creates its files, then change settings.

## A server is running but the panel says it's offline

- **The game's query port is wrong or blocked.** The panel finds out a server is online by asking it (and, for
  games with a console, by connecting to RCON). If the **Network** tab shows the wrong port, or something blocks
  it, the panel can't ask.
- **The RCON password doesn't match.** *"RCON authentication failed"*. See
  [the messages](WHAT_THE_MESSAGES_MEAN.md#starting-stopping-and-consoles).
- **The server runs from a different folder than the panel has recorded.** The panel only treats a program as a
  server's own if it runs from inside that server's folder (so stopping one server never stops another that
  happens to use the same program). If you moved the server's files, update its folder in **Settings**.
- **Just started?** Give a big world a few minutes.

## A server keeps restarting, or the panel gave up on it

With **Restart it if it crashes** on, the panel starts a crashed server again, but **gives up after a few tries**
so one that crashes at every start doesn't loop forever (you're notified when it gives up). The limits are
under `Settings → Crash recovery`.

Find out why it's crashing before raising the limits: read **Logs** and the **Activity** tab around the crash
times. Common causes: a mod that doesn't match the game version, a corrupt save (restore a backup), not enough memory,
or a port clash with another server.

## Friends can't join

Work from the PC outwards. The panel does the first two for you.

1. **Is it online?** The tile should say **Online**.
2. **Windows Firewall.** The **Network** tab, **Ports players need**, should say **Allowed** for every port.
   If it says **No rule**, choose **Allow these ports in Windows Firewall**.
3. **Can people on your own network join using the PC's address?** (Under **Joining from the same network**.)
   If they can't, the problem is the game or its password, not your router.
4. **Router forwarding.** Every port in that list, with the same number, the right protocol (UDP/TCP), pointing at
   this PC's address, and that address reserved so it doesn't change.
5. **Are they using your public IP** and the game port, from *outside* your network? Join from inside your home with
   the PC's network address instead; the public address often doesn't work from inside.
6. **CGNAT.** If your provider shares one public address between many homes, forwarding can't work.
   See [Ports and firewall](PORTS_AND_FIREWALL.md#when-forwarding-just-wont-work).
7. **Game version and password.** Players need the same game version as the server, and the right join password.

## A backup failed or a restore won't run

- **"None of this server's save folders exist yet…"**: start the server once so it creates them.
- **"Not enough room on the backup drive…"**: free some space, change the **Backup folder**, or lower the
  minimum free space (`Settings → Backups`).
- **"couldn't be read back, so it was discarded"**: the drive may be full or failing. Check it, then try again.
- **A restore says "Stop the server first".** Restoring replaces files the game is using. Use **Restart and use
  this backup** (it stops the server for you), or stop it yourself, wait for **Stopping…** to finish, and restore.
- **The server didn't come back after "Restart and use this backup".** The backup was put back, but the game didn't
  answer in time (or wouldn't start). Look at its **Logs** tab. If the backup itself is the problem, the **Before a
  restore** backup in the list holds what was there before: use that to go back.
- **A restore says a folder "is no longer one of this server's backup folders".** The backup was taken with
  different folders chosen. Choose them again under **Choose folders & rules**, or restore by hand.
- **Backups of a running game look inconsistent.** Games that can't save on command are stopped for the copy by
  default. If you chose to keep them running, a backup can catch a save halfway.

More: [Managing servers → Backups](MANAGING_SERVERS.md#backups).

## A game I created won't come online (one of the newer games)

The first 17 games were tested end to end; the 76 added since were checked less (see [Game support](GAME_SUPPORT.md)). If one won't
start, or starts but never shows **Online**:

1. Read the server's **Logs** tab: the game says what's missing in its last lines.
2. Check [what some games need from you](GAME_SUPPORT.md#what-some-of-them-need-from-you): a Klei token (Don't Starve Together), a
   login token (Bannerlord), Epic credentials (The Isle), `server_packages` files (the truck simulators), or the Visual C++ 2012
   runtime (Killing Floor 2, Rising Storm 2: Vietnam). Without these a process can sit idle with no port and no log.
3. A few games ignore the ports given to them, or use a different query port from the game port, so the tile can say offline
   while the game runs. Compare the **Network** tab with the game's own files.
4. A first start can be slow while the game builds a world, downloads a runtime (tModLoader) or shows a Windows Firewall prompt
   on the PC itself: look at the PC's screen once.
5. Still stuck? [Open an issue](https://github.com/Vulcanie/GodlyPanel/issues) with the game, the last lines of its log, and how you
   start it by hand if you know. Those reports are how the less-tested games get fixed.

## A game update went wrong

On the server's **Overview** tab, the **Game updates** card shows how the last update ended.

- **Did not come back.** The server didn't report online within the wait (`Settings → More settings`). Read **Logs**. If the world is
  damaged, stop the server and choose **Roll back saves**, which restores the backup taken just before the update. If the game
  itself won't run, rolling back won't help, since only the saves go back; run **Update** again, which re-checks the game files.
- **"The panel did not back this server up before that update, so there is nothing to roll back to."** The backup before an update was off
  for that server. Turn on **Back up this server before every game update** for next time.
- **"Stop the server first. Rolling back replaces files the game is using."** Stop it, wait for **Stopping…** to finish, then roll back.
- **"The backup before the update failed."** The panel asks whether to update without one. Fix the cause (usually disk space, see
  [a backup failed](#a-backup-failed-or-a-restore-wont-run)) rather than skipping it.

## Mods won't install or update

- **"Stop the server first: a game reads its mods when it starts."** Stop it, change the mods, start it.
- **"I don't recognise that link."** Paste a mod's page address or a direct file link, or a name the game's source understands
  (Thunderstore: `Owner-Name`).
- **"This address isn't one of the known mod sites."** The panel only downloads from sites it knows without asking. Tick **I trust this
  address** if you do trust it. Addresses that lead to a private network address are always refused.
- **It asks you to choose between files.** A release has several files that could be the mod (a client and a server build, say); pick the one for the server.
- **"This mod is for players only, so it isn't installed on the server."** It is a client-side mod. Players install it; add it to the shared player pack
  if the game supports that.
- **"The mod couldn't be installed. The panel's log has the details."** The download or its checksum failed, or a dependency did.
  Nothing was left half-installed. Try again, and look at the panel's log (`data\logs`) if it repeats.
- **A mod shows "file missing" or "changed".** Something outside the panel altered the mods folder. Reinstall that mod, or ignore it if you did it on purpose.
- **Minecraft: "No CurseForge API key set."** CurseForge modpacks need the free key (`Settings → CurseForge API key`). Modrinth, GitHub and direct links don't.
- **Conan Exiles Workshop items don't download.** Some Workshop items need a signed-in Steam account, which SteamCMD's anonymous login doesn't have.

## The Files tab refuses something

- **"You don't have permission to see this server's files."** Your role lacks "Browse files". Ask an administrator.
- **"Only an administrator can save that kind of file."** Scripts and programs (`.bat`, `.ps1`, `.exe` and similar) run on the PC, so only an administrator may save, upload or rename to one.
- **"That path is outside this server's folder."** The panel never leaves the server's folder. A link or junction that points elsewhere counts as outside.
- **"That file isn't text, so it can't be opened or changed here."** Download it, or edit it with a program on the PC. Text files over 2 MB can't be edited here either.
- **"The panel keeps that item for itself, so it can't be changed here."** Settings files the panel owns, the trash and `.bak` files can be read but not changed.
- **"Something is already there with that name."** Unpacking and renaming never overwrite. Rename or remove the existing item first.
- **"This server's folder holds the panel's own data, so it can't be browsed here."** A server pointed at the panel's `data` folder is blocked on purpose.

## Moving a server to another PC didn't work

- **"Stop the server first, so its files are copied in one piece."** Stop it, then export.
- **"This game's servers share one install, so only a server in a folder of its own can be exported."** Several ARK maps share one install; export isn't available for them.
- **"This game can't be downloaded again, so export everything instead."** Choose **Everything** (Minecraft and Terraria have no Steam download to repeat).
- **"That is not a GodlyPanel server file."** / **"That file was refused because it is not safe to open."** The file isn't a bundle from GodlyPanel, or it contained something the panel won't unpack (a link, a path outside the new folder).
- **"That file was made by a newer GodlyPanel. Update this one first."** Update the importing PC (`Settings → Panel updates`) and try again.
- **"A server with that name already exists. Pick another name."** / **"There is not enough free space for this server."** Rename it, or free space on the drive.
- **"Another import is running. Wait for it to finish."** One at a time.
- **"SteamCMD isn't installed yet…"** after an import of saves only: download SteamCMD from `Settings → SteamCMD`, then run **Update** on the imported server to fetch the game.

## A console window shows up when it shouldn't

The panel can run each server minimized, hidden or with no window at all (see
[Managing servers](MANAGING_SERVERS.md#windows-and-consoles)). On Windows 11 a console program's window usually
belongs to **Windows Terminal**, and some games start a second console of their own a moment after launch.

- In **Hidden** and **No window** modes the panel watches for such windows for about a minute and a half after a start
  (and after an automatic restart) and hides them. You may see one flash by.
- If a window stays visible, tell us which game and your Windows version in an
  [issue](https://github.com/Vulcanie/GodlyPanel/issues). The panel recognises these windows by the game's folder and
  program name, so it helps to know what the window's title says.
- If you'd rather see the console, choose **Minimized**.

## The community address doesn't work

- **It's a temporary link** ("a random address that changes every time"): it changes whenever the view or the panel
  restarts. Use your own address (a Cloudflare tunnel token) for a permanent one.
- **The page says "This address isn't served here".** You reached the listener by number or under another name. Use the public
  address shown on the community view card.
- **cloudflared isn't running.** Open `Settings → Community view → Details` to see the tunnel's state and last lines.
- **"Another cloudflared on this PC is also running the tunnel."** Stop the other one, or half your visitors land on it.
- **Port in use.** Choose another port in the set-up dialog.
- **Staff can't sign in there.** That's by design unless you've switched on staff sign-in. See the
  [security checklist](SECURITY_GUIDE.md#staff-sign-in-from-outside).

## Discord or notifications aren't arriving

- **Windows notifications:** `Settings → Notifications` has *Show Windows notifications* and *Events to tell you about*.
  Windows' own **Focus assist / Do not disturb** can hide them.
- **Discord status message:** the webhook address in `Settings` must be a Discord webhook for a channel that still exists.
  Webhooks are secrets; if one has leaked, delete it in Discord and make a new one.
- **Discord bot commands:** the application ID, server ID and bot token all have to be set, and an *admin role* chosen, or
  commands that change anything are refused (looking is open to everyone in that Discord server).
- **Email:** all of *Mail server*, *Mail server port*, account and addresses must be filled in, and many providers need an
  app password rather than your normal one.

## Getting help

When you ask for help, it saves time to include:

- the **version** (`Settings → GodlyPanel version`);
- the **game** and what you did just before;
- the exact **message** you saw (a screenshot is fine);
- the server's last few lines from **Logs**, and anything in **Activity** around that time.

`config.json` is safe to share. **Never share `secrets.json`** (it's in the hidden `.godlypanel-secrets` folder beside `data`), and check a log for passwords before posting it (the
panel masks them in what it shows, but not in files you copy by hand).

Ask in an [issue](https://github.com/Vulcanie/GodlyPanel/issues). For something that looks like a security hole, use
**Security → Report a vulnerability** instead, so it isn't public.
