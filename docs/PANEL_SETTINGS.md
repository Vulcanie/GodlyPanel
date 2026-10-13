<!-- Generated from the help text in the interface (ui/src/help). Edit it there, then run `npm run build:guides`. -->

# Panel settings guide

Everything on the panel's **Settings** page, what it does and when to change it. This page is what the (i) icons beside each setting link to.

Settings are saved in `config.json` in your data folder. Keys and passwords are kept separately, in a private folder, so a settings file is safe to share when you ask for help. Some settings only take effect after the panel restarts; the page says so when you save.

## Contents

- [Access](#access)
- [Folders](#folders)
- [Ports for new servers](#ports-for-new-servers)
- [Refresh rates](#refresh-rates)
- [Storage](#storage)
- [New servers](#new-servers)
- [Discord](#discord)
- [Backups](#backups)
- [Starting with Windows](#starting-with-windows)
- [Charts and history](#charts-and-history)
- [Panel updates](#panel-updates)
- [Notifications](#notifications)
- [Crash recovery](#crash-recovery)
- [Keys and webhooks](#keys-and-webhooks)
- [SteamCMD](#steamcmd)
- [Remote access](#remote-access)
- [Community view](#community-view)
- [Community access](#community-access)
- [Copies of backups off this PC](#copies-of-backups-off-this-pc)
- [Appearance](#appearance)

## Access

### Web port

The port the panel is served on. Changing it restarts the panel's background service.

This is the number after the colon in the address you open, for example the 8765 in `http://192.168.1.20:8765`. Pick a number from 1024 to 65535 that nothing else on this PC uses. After you save, restart the panel from the tray menu (Restart API) and open it at the new address. Bookmarks and any tunnel pointing at the old port need updating.

### Allow access from your network

Off means only this computer can open the panel.

With this on, other devices on your home or community network can open the panel at this PC's address, and they still have to sign in. Turn it off if the panel should only ever be used on the PC it runs on. This never exposes the panel to the internet: it refuses addresses that are not local (see the Security guide). Takes effect after a restart.

### Public address of this PC

Your public IP address or a domain name that points at it. Each server's join address is shown as this plus its game port.

Friends outside your home network connect to your public address, not the local one. Put either your public IP (search for "what is my IP") or a domain name here, without a port: `203.0.113.9` or `play.example.com`. The dashboard and Discord then show `203.0.113.9:7777` for a server on port 7777. Leave it blank to show nothing of the kind. It does not open any ports: see the Ports and firewall guide for that.

### Allow mesh VPN addresses

Tailscale and ZeroTier use the 100.64.0.0/10 range. Turn off to allow only ordinary local addresses.

Leave this on if you reach the panel over Tailscale or ZeroTier. Turn it off only if you want the panel to answer nothing but ordinary home-network addresses (192.168.x.x, 10.x.x.x and 172.16-31.x.x).

### Allow link-local addresses

Used when two machines are connected directly with no router.

Link-local addresses (169.254.x.x) appear when two computers are joined by a cable with no router handing out addresses. Almost nobody needs them; leaving this on is harmless on a normal network.

### Additional allowed networks

Extra IP ranges to accept, such as 10.8.0.0/24 for a VPN.

The panel only answers local addresses. If your VPN gives out addresses the panel does not recognise as local, list its range here in CIDR form (`10.8.0.0/24`), separated by commas. Do not list a range you do not control.

### Additional allowed names

Names you type in the address bar to reach the panel, besides its IP address and the computer's own name.

To protect against a website tricking your browser into talking to the panel, it only answers when opened by an IP address, `localhost` or this PC's own name. If your router gives the PC another name (`gamepc.lan`), add it here, separated by commas.

## Folders

### Server install folder

Where new game servers are installed. Blank uses a folder inside your data directory.

Games are big, so choose a drive with plenty of room (an SSD is best). This only affects servers you create from now on: changing it never moves a server that already exists. Each server gets its own folder inside it.

### SteamCMD location

Blank downloads and manages SteamCMD automatically.

SteamCMD is Valve's tool for installing and updating game servers. Leave this blank and the panel downloads it for you. Set it only if you already have a copy you want to reuse: give the full path to `steamcmd.exe`.

### jcmd location

Part of a JDK; used for Minecraft heap stats. Blank uses jcmd from PATH.

Only matters for Minecraft servers: the panel runs `jcmd` to read how much of the Java heap the server is using. If you installed a JDK in an unusual place, give the full path to `jcmd.exe`.

### Where your servers are now

The folder each server lives in, how big it is and which drive it is on.

The Server install folder setting only decides where servers made from now on go, so servers made earlier, or added by hand, can be anywhere: this list says where. A server whose folder is missing is flagged, and so is one that shares its folder with another server. The copy button puts a folder's path on your clipboard.

## Ports for new servers

### Game ports start at

A new server's game port, the port after it and its query port are kept together, starting here.

When you create a server the panel suggests free ports so you do not have to pick them. The game port, the one after it and the query port are handed out as a set. Setting a start of 8000 and a step of 3 gives 8000-8002 to the first server, 8003-8005 to the next, and so on. Only affects servers created from now on.

### Game ports move by

How far the next server's game ports are from the last one. Negative counts down; 0 is treated as 1.

Use 3 or more so servers do not overlap (most games use the game port plus one or two more). A negative number counts down instead of up.

### RCON ports start at

A new server's RCON (and telnet) port starts here.

RCON is the remote console the panel uses to save and stop games. These ports are only used on this PC, never opened to the internet, so they are kept apart from the game ports.

### RCON ports move by

How far the next RCON port is from the last one. Negative counts down; 0 is treated as 1.

The default of -1 counts down from the start (26000, 25999, ...), which keeps these well away from game ports counting up.

### Reserved ports

Ports that should never be suggested for a new server.

List ports that other programs on this PC use (a web server on 8080, say), separated by commas. The panel skips them when suggesting ports.

### Server port list

Every server and the ports it uses, to pick a free one or find what is in the way.

A port that two servers both claim is marked with who. Ports a game keeps for itself next to its game port are shown dimmed: you do not type them anywhere, but they are taken. Only ports GodlyPanel knows about are listed, so something else on this PC can still be using one.

## Refresh rates

### Server status interval (ms)

How often each server is checked for online/offline, player count and ping.

Milliseconds between checks: 7500 is every 7.5 seconds. Lower is more up to date but asks every game more often; raising it is the first thing to try on a slow PC. Between 2000 and 120000.

### System stats interval (ms)

How often the whole PC's CPU and memory readings are refreshed.

These readings are cheap. 10000 (10 seconds) is a good balance.

### Per-server CPU/RAM interval (ms)

How often each server's own CPU and memory use is read.

This asks Windows about every game process, which is heavier than the other checks. 15000 is a good balance; raise it on a low-powered PC.

### Steam update check interval (ms)

How often Steam is asked whether a game has a new version.

Used only when "Check Steam for game updates" is on. 900000 is every 15 minutes.

### Abandoned upload cleanup interval (ms)

How often leftovers from unfinished uploads (like modpack zips) are removed.

Uploads that were never used are deleted after a day. 3600000 checks hourly; there is rarely a reason to change this.

### Collect per-server CPU/RAM

The heaviest recurring check. Turn off on a low-powered machine.

Turning this off removes the CPU/RAM figures from the dashboard and the per-server charts, but also stops the panel asking Windows about every game process every few seconds.

### Collect Minecraft heap usage

Needs a JDK installed. Ignored if jcmd isn't available.

Shows how full a Minecraft server's Java memory is. Without a JDK (not just a JRE) there is nothing to read, so it quietly does nothing.

### Check Steam for game updates

When on, servers with auto-update enabled will update and restart themselves.

Off by default because an update stops the server. Turn it on, then switch on auto-update for each server that should follow Steam (on its page). The panel warns players in game before it restarts the server where the game has a way to do so.

## Storage

### Storage limit (bytes)

0 means no limit. Applies to your servers and app data combined.

A size in bytes: 500 GB is 536870912000. Useful if the drive is shared with other things. With no limit nothing is checked.

### When the limit is reached

Off ignores the limit, Warn shows it on the dashboard, Block also refuses new installs. Starting a server is never blocked.

Pick Warn to be told early and Block to stop new servers from filling the drive. Existing servers keep running either way.

### Storage recheck interval (ms)

How often the size of every server folder is measured.

Measuring walks every file, so it runs in the background, hourly by default (3600000). Raise it if you have huge installs on a slow disk.

### Folders scanned at once

How many folders are measured in parallel.

1 or 2 is gentle on the disk. Higher is faster but can make servers lag while a scan runs.

### Storage use

How much disk space your servers use.

Measured in the background, so a brand-new server says "not measured yet" for a while. Recalculate re-measures everything now.

## New servers

### RCON password for new servers

Generate gives each server its own random password; Fixed reuses the Fixed RCON password just below.

Generating is safer: one leaked password opens only one server. Choose Fixed only if you have other tools that need the same RCON password everywhere, then fill in Fixed RCON password just below.

### Server windows

Minimized keeps a taskbar entry, Hidden hides the window at once, No window starts the game directly with no window at all.

The default for new servers; each server can override it on its own page. Hidden works with any start script. No window is the tidiest (the panel shows the live console itself) but skips whatever else a start script does, such as a SteamCMD update check.

## Discord

### Post status to Discord

Posts one status message that updates in place, and update announcements.

Needs the Discord status webhook, just below in the same section. The message lists each server's state, join password, CPU and memory. Because the join password appears in it, only use a private channel.

### Discord admin role mention

A role to mention in status posts. Optional.

Paste the role as `<@&123456789>` or just the number. In Discord, turn on Developer Mode, right-click the role and choose Copy Role ID. The same role is who may start, stop and restart servers through the bot.

### Discord bot (slash commands)

Lets people in your Discord server see servers with /servers, /status and /players; the admin role can start, stop, restart and back them up.

You create the bot yourself in Discord's developer portal, then fill in its token (in the same section), application ID and your server's ID. Anyone in that Discord server can look; only the admin role can change anything. With no admin role chosen nothing can be changed from Discord.

### Discord bot application ID

From the Discord developer portal: your application's General Information page.

A long number. It is used to register the slash commands and to build the link that invites the bot to your server.

### Discord server (guild) ID

Turn on Developer Mode in Discord, then right-click your server and choose Copy Server ID. The bot only answers there.

The bot ignores every other Discord server and all private messages.

### Discord bot

Slash commands in your Discord server.

See the Discord section above for the token and the IDs you need. The card shows whether the bot is connected and gives the invite link.

## Backups

### Backup folder

Where backups are stored. Blank uses a folder inside your data directory. Put it on another drive to survive a disk failure.

Backups on the same drive as the servers do not help if that drive dies. Pick a folder on a different drive, or add an off-site copy (Copies of backups off this PC). Changing it does not move old backups.

### Scheduled backups to keep

Per server. Older scheduled backups are deleted; ones you made by hand never are.

10 means the ten newest scheduled backups of each server are kept. A server can override this on its own Backups tab.

### Delete scheduled backups older than (days)

0 keeps them until the count above pushes them out.

Use this to stop old backups piling up, for example 14 keeps two weeks of scheduled backups.

### Refuse backups below this much free space (GB)

A backup that would leave the drive with less than this is not started.

Stops a backup from filling the drive and taking the servers down with it. The default of 2 GB is a sensible floor.

## Starting with Windows

### Start GodlyPanel when I sign in to Windows

The panel starts by itself when you sign in.

Combine with each server's "Start it when GodlyPanel starts" (Automation tab) to bring your servers up after the PC restarts.

### Start in the tray, without opening the window

Starts quietly in the system tray instead of opening the panel's window.

Open it again from the tray icon. Only affects the panel's own window, not your servers.

### Delay between starting servers at launch (seconds)

For servers set to start with the panel. Spaces them apart so they do not all load at once.

Game servers are heavy to start. 20 seconds between each is gentle on most PCs; use more on a slow disk.

## Charts and history

### Keep a history of CPU, memory and players

Stores readings for each server's charts: one point a minute for a week and one an hour for three months.

It is a few megabytes at most. Turn it off to stop recording; existing history stays until it ages out.

### Seconds between readings

How often a reading is taken for the charts.

30 is plenty; shorter intervals do not add much to charts that are averaged per minute.

## Panel updates

### Check for new versions of GodlyPanel

Asks GitHub's public releases list every few hours. Nothing about you is sent. It never installs anything by itself.

When a new version exists a banner appears for administrators. Installing is always your choice, from the Panel version and updates section.

### Include pre-release (alpha/beta) versions

Also offers alpha and beta releases.

While GodlyPanel itself is in alpha every release is a pre-release, so leave this on unless you want to wait for a stable one.

### Where releases are published

owner/name on GitHub.

Leave as it is unless you run your own fork. Updates are only installed if their manifest is signed with the key built into the app.

### Panel version and updates

Your version, and whether a newer one exists.

Downloading checks the file's signature before anything is installed. Your game servers keep running while the panel restarts, and the old version is put back if the new one will not start.

## Notifications

### Show Windows notifications

A pop-up on the PC for the events below.

Webhook (Discord, Slack and similar) and email alerts are set up with their own addresses in the Alerts and Email sections.

### Events to tell you about

Tick the events you want a notification for.

Applies to every way of being notified (Windows, webhook and email). Crashes, failed backups and low disk space are on by default; "A backup finished" is off because it is noisy.

### Send a test notification

Sends a real test through every way of being notified that is set up.

Save your changes first: the test uses what is saved, not what is typed in the boxes. The result lists each way (Windows notification, webhook, email) as sent, not set up, or failed with the reason.

### Warn when a backup hasn't reached its off-site destination after (hours, 0 = never)

A backup this old that still isn't copied to an off-site destination triggers a warning.

Catches an unplugged drive, a full share or a revoked cloud key. You are reminded daily while it lasts and told when it has caught up.

### Warn when a drive has less free space than (GB)

0 turns the low-space warning off.

Applies to every drive that holds a server or backups.

### Send email

Also email the events you picked.

Fill in the mail server, account and addresses below, and the account password below.

### Mail server

The address of your mail provider's SMTP server.

For example `smtp.gmail.com` or `smtp.office365.com`. Your provider's help pages list it.

### Mail server port

587 for most providers (STARTTLS), 465 for TLS from the start.

If you tick "Use TLS from the start" use 465; otherwise 587.

### Use TLS from the start (port 465)

Turn on for port 465. Leave off for port 587.

Wrong combinations show up as a connection error when you send a test.

### Mail account name

The login for the mail server, usually your full email address.

Many providers require an app password rather than your normal password.

### Send from

The sender address on the emails.

Some providers only allow the account's own address.

### Send to

Who receives the emails.

One address, or several separated by commas.

## Crash recovery

### Seconds down before it counts as a crash

A server must stay down this long before the panel treats it as crashed.

Avoids reacting to a blip such as a server restarting itself on purpose. 45 seconds suits most games.

### Automatic restarts before giving up

Within the window below. Stops a server that crashes every time it starts from restarting forever.

When it gives up you are notified. The count resets when the window passes or you start the server yourself.

### Window for counting restarts (minutes)

The period the restart limit applies to.

With 3 restarts in 15 minutes, a fourth crash inside 15 minutes makes the panel stop trying.

### Minutes a restarted server gets to come online

A restarted server is given this long to load before it is judged again.

Big worlds take a while: raise this if a slow game is restarted again before it finishes loading.

## Keys and webhooks

### Discord status webhook

The webhook address the status message is posted to.

In Discord: channel settings, Integrations, Webhooks, New Webhook, Copy Webhook URL. Stored apart from the other settings so a settings file is safe to share.

### Discord bot token

The bot's secret token from the Discord developer portal.

Anyone with the token controls your bot, so never share it. Leave the box blank to keep the saved one.

### Discord update webhook

A webhook where new panel versions are announced.

Optional. Useful if you want a community channel to see when the panel is updated.

### CurseForge API key

Needed to download mods when you create a modded Minecraft server.

Get a free key at console.curseforge.com. It is only used while a modpack is being installed.

### Fixed RCON password

The one RCON password used when new servers are set to Fixed.

Only used when "RCON password for new servers" is Fixed. Pick something long: it opens each server's console.

### Alert webhook (Discord, Slack, ...)

Where the events you picked are posted.

Any webhook that accepts a simple JSON message works. Discord and Slack are the usual choices.

### Audit webhook

Posts every sign-in and change to a private channel outside this PC as it happens.

Gives you a record that someone with access to this PC cannot quietly erase. Use a private channel: it names who did what.

### Mail account password

The password (or app password) for the mail account.

Needed only if Send email is on.

## SteamCMD

Valve's tool for installing and updating game servers.

It is not bundled with the panel. The button downloads it once from Valve. Without it, creating or updating Steam game servers will not work.

## Remote access

### Opening the panel from another device

The addresses other devices can use, including Tailscale and other mesh VPNs.

On the same network, open the address shown. From elsewhere, a mesh VPN such as Tailscale is the safest option because it opens nothing on your router. Do not forward the panel's port on your router: anyone on the internet could then reach a login page that controls your servers. Install Tailscale (free for personal use) on this PC and on your phone, sign in to the same account, then open this PC's Tailscale address; ZeroTier works the same way. For friends, do not invite them into your own Tailscale account, because that puts them on the same network as all your other devices. Instead, in the Tailscale admin console choose Machines, this PC, Share, and send them the link: they can then reach this PC and nothing else of yours. Give them a guest account with the community code.

## Community view

### Community view (a public address)

A small guest-only page for friends, published through a Cloudflare Tunnel.

Nothing is opened on your router and friends install nothing. Guests see what is running and how to join; they cannot change anything or see passwords. By default it is a separate, much smaller page: administrators and moderators cannot sign in on it, and nothing can be started, stopped or changed through it.

### Let administrators and moderators sign in here too

Lets staff sign in on the public address as well as your network.

Off by default. Turning it on puts the sign-in for accounts that can control this PC in front of the internet. Use it only for people who are never at home, and prefer a VPN. Every outside staff sign-in is recorded in Activity.

### Public address

The name your tunnel answers to, such as panel.example.com.

It must be routed to this tunnel in Cloudflare. A quick tunnel without your own domain gets a temporary address instead.

### Tunnel token

The token from your tunnel in Cloudflare's dashboard.

Stored privately and handed to the tunnel program through its environment, never on a command line.

### Address type

A temporary link, a tunnel already on this PC, or one you made in Cloudflare's dashboard.

A temporary link needs no Cloudflare account but is a random address that changes each time the community view starts, and the page refreshes every few seconds instead of live. Your own address stays the same and updates live: use the tunnel already on this PC if one is found, otherwise paste the token of a tunnel from the Cloudflare dashboard (Zero Trust, Networks, Tunnels) and add a public hostname pointing at the small server's address shown in the guide.

## Community access

The code friends use to make their own guest account.

Guests can look but not change anything. The code can be switched off, replaced, set to expire and capped, so you can open signups for a weekend and close them again. A new code stops the old one working; accounts already made stay (remove them under People).

### Anyone with the code can make a guest account

Turns the community code on or off.

Off stops new accounts being created; existing guests keep their access.

### Expiry

When the code stops working.

Pick a short life for a one-off event. Keep the current setting leaves it as it is.

### Most people

How many accounts the code can make. Blank means no limit.

Handy for a fixed group: a limit of 10 closes signups after ten people have joined.

### Message to send them

Ready-made instructions with your address and code, to copy and send to a friend.

It uses the community view's public address when that is on, otherwise your Tailscale address. Guests need some way to reach the panel, so turn one of those on first.

## Copies of backups off this PC

Copy every backup to another drive, a network share, a cloud-sync folder or S3-compatible storage.

A backup on the same drive as the server is lost with it. Add a destination and each new backup is copied in the background; a failed copy is shown and retried.

### Destination name

A label for this place, such as NAS or Backblaze.

Shown beside each backup so you can see where its copies are.

### Destination kind

A folder (another drive, a share, a cloud-sync folder) or S3-compatible storage.

Folder covers USB drives, \\nas\share paths and the folders OneDrive, Dropbox and Google Drive sync. S3 covers Backblaze B2, Wasabi, Cloudflare R2, MinIO and Amazon S3.

### Destination folder

Where copies are written.

A full path such as `D:\Backups` or `\\nas\share\backups`. It cannot be inside the local backup folder.

### S3 endpoint

The service's address.

Choosing a service fills in a typical address; use the exact endpoint shown on your bucket's page.

### S3 bucket

The bucket that holds the copies.

Create it in your provider first. Use an access key limited to this one bucket.

### S3 region

The region the bucket lives in.

Must match the endpoint. Cloudflare R2 uses `auto`.

### Folder inside the bucket

An optional folder name inside the bucket.

Lets one bucket serve several things. The panel only lists, uploads, downloads and deletes under its own folders.

### Access key ID

The key's public half.

Create a key that can only touch this bucket.

### Secret access key

The key's secret half.

Stored privately and never shown again. Leave blank when editing to keep the saved one.

### Scheduled backups to keep here

How many scheduled backups this destination keeps. Blank follows the main setting.

Lets a cheap big drive keep more history than the local one.

### Delete older than (days)

Age limit for copies here. Blank follows the main setting.

Combine with the count: whichever deletes more wins.

### Also copy the backups that already exist

Copies old backups too, instead of only new ones.

Turn on when adding a destination you want to be complete; leave off to start fresh.

### S3 service

Picks your provider and fills in a typical endpoint and region for it.

Backblaze B2, Wasabi, Cloudflare R2, Amazon S3 and MinIO are listed. The addresses filled in are examples: replace them with the exact endpoint your provider shows for your bucket.

### Destination on or off

Off pauses copying to this place without removing it.

Backups made while it is off are not copied there. After turning it back on, use Copy all existing backups on a server's Backups tab to catch up.

### Bring back a backup

Downloads a copy from this place into the server's own backup list.

Once it is back, restore it from the list like any other backup. A backup that is also on this PC does not need bringing back.

## Appearance

Artwork, colours and images for your servers' dashboard cards.

By default each game's artwork is fetched from Steam and cached on this PC. Replace any of it with your own image or a flat colour.

### Banner

Automatic, a colour, or your own image.

Automatic uses Steam's artwork. Colour paints a gradient. Image lets you upload a picture (identified by its contents, not its name).

### Image

Your own picture for the banner. PNG or JPEG.

The banner is wide and short, so a wide picture of the recommended size works best; anything taller is cropped top and bottom. It is stored with your data and not uploaded anywhere.

### Steam app ID

Only needed to override which Steam artwork is used.

It is the number in the game's store page address, for example the 892970 in store.steampowered.com/app/892970.

### Colour

The card's colour.

Pair with "Fades to" for a gradient.

### Fades to

The second colour of the gradient.

Leave both colours the same for a flat colour.
