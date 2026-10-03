# What the messages mean

A message that isn't clear is a bug in the panel, not something you should have to work out. This page
explains the ones people ask about, grouped by what you were doing, with what to do next. Wording can be a
little different on screen; the start of each message is what to look for.

If a message isn't here, or the explanation doesn't help, please
[open an issue](https://github.com/Vulcanie/GodlyPanel/issues) and quote the message.

**Jump to:** [Signing in](#signing-in) · [A page that says "private"](#pages-that-say-no) ·
[Passwords and accounts](#passwords-and-accounts) · [Starting and stopping](#starting-stopping-and-consoles) ·
[Backups and restores](#backups-and-restores) · [Settings and ports](#settings-and-ports) ·
[Community view](#community-view-and-tunnels) · [Mods](#mods) · [Updates](#panel-updates) ·
[The data folder](#the-data-folder)

---

## Signing in

**Incorrect username or password.**
Either one is wrong, or the account doesn't exist, or it has been suspended. The panel deliberately doesn't say
which, so strangers can't use the page to find out who has an account. Check caps lock. If you've forgotten your
password, an administrator can set a new one for you under **People**.

**Too many failed sign-in attempts. Try again in N minute(s).**
Too many wrong passwords in a short time, for that account or from that address. Wait the time it says; it
clears by itself. This protects against someone guessing. Your real password still works once the wait is over.

**Your password is right, but admin accounts can't sign in on this public address…** *(or "moderator accounts")*
You're on the **community address** (the public page for friends), and administrator and moderator accounts
aren't allowed to sign in there unless the owner allowed it. Nothing is wrong with your account. Open the panel
on your own network (`http://<the PC's address>:8765`), through your VPN, or ask the owner to switch on
*Let administrators and moderators sign in here too* (`Settings → Community view`). See
[Security checklist](SECURITY_GUIDE.md#staff-sign-in-from-outside) before they do.

**That code isn't right…** / **That code isn't accepting new people any more. Ask the owner for a new one.**
The community code is mistyped, has been replaced, has expired, or has reached its limit of sign-ups. A code
looks like `ABCD-EFGH`. Ask the owner for the current one.

**Too many wrong codes. Try again in N minute(s).**
Guesses at the community code are slowed down for everyone. Wait, then try again with the right code.

**A code, a username and a password are all needed.**
You left one of the three boxes empty on the "I have a community code" form.

---

## Pages that say no

These appear when you open the panel from somewhere it won't answer. They are the panel working as designed.

**"This panel is private"** *(reference `lan_only`)*
You opened the panel's address from a device that isn't on the owner's network, such as mobile data or
another house. The panel never serves anyone outside the network it runs on. Guests and friends should use the
**community address** the owner gave them. Administrators and moderators can use the community address only if the
owner has allowed staff to, or a VPN such as Tailscale. If you're the owner and you're at home, check the device is on
the same network as the PC (not a guest Wi-Fi, not mobile data). The page shows the address the panel saw, which helps
when working out which network you're on.

**"Open it by this PC's address"** *(reference `bad_host`)*
The panel only answers when it's opened by the address of the PC it runs on (for example `http://192.168.1.20:8765`),
not by some other web name pointed at it. This stops a trick where a website you visit talks to your panel behind
your back. Use the address the PC shows. If you set up your own name on purpose, the owner can add it under
`Settings → Network → Additional allowed names`.

**"Not available through a tunnel"** *(reference `tunnel_refused`)*
Traffic from a Cloudflare tunnel reached the *panel* instead of the community view's small page. The tunnel should
point at the community view's port (shown in `Settings → Community view`), not at the panel.

**That request came from a different website or page than the panel, so it was refused.**
Something other than the panel's own page tried to make a change: a different website, or a page served by another
program on the same PC. Use the panel's own page. If you see this when you didn't expect to, close other browser tabs
you don't recognise.

**You don't have access to that.** / **You don't have access to that server.**
Your role can't do this (see [Accounts and roles](ACCOUNTS_AND_ROLES.md)), or a moderator who has been limited to some
servers tried another. Ask an administrator.

**Sign in required.**
You've been signed out: the sign-in expired (7 days), or your password or role was changed. Sign in again.

**Initial setup can only be completed on the computer running GodlyPanel.**
Creating the first administrator is limited to the PC itself, so nobody else on your network can claim the panel
before you. Do it from that PC.

**Slow down a little.** *(on the community address)*
One visitor made a lot of requests in a minute. It clears after a moment.

---

## Passwords and accounts

**Choose a password of at least 8 characters.**
Longer is better. A few unrelated words (`river-lantern-quiet-moss`) are easy to remember and hard to guess.

**That password is too long: 72 bytes is the most that can be used.**
Passwords are stored in a form that only uses the first 72 bytes, so anything longer would be silently ignored. Accented
characters count for more than one byte each. Choose a shorter one.

**That password is one of the most common ones…**
It's on lists attackers try first (`password123`, `qwertyuiop`). Pick something less guessable.

**The password can't be the same as the username.**
A name plus a number or a symbol counts as the name.

**A username is 3 to 32 characters long and can use letters, numbers, dots, dashes and underscores (no spaces).**

**A user named "…" already exists.** Names aren't case-sensitive. Pick another.

**Your current password is incorrect.**
In **Password** (top right) you have to give your current password before choosing a new one.

**Cannot change the role of / disable / delete the only admin account.**
The panel won't let you lock yourself out. Make another administrator first.

---

## Starting, stopping and consoles

**Stop the server first…** *(several versions: restoring, changing ports, editing settings, mods, cloning, deleting, the RCON password)*
A running game holds its files, ports and settings in use, and often writes its settings back when it stops, which
would undo your change. Stop the server (and wait for **Stopping…** to finish), then do it again.

**The panel doesn't know how to start this server, because it has no start script.**
Add a start script in the server's **Settings**, or set up the program under **Window & console** → **No window**.

**RCON isn't set up for this server.** / **The Telnet console isn't set up for this server.**
There is no console password and port recorded. Games without a console (Valheim, Enshrouded and others) can't take
commands.

**RCON authentication failed (wrong password): the game refused the password the panel has for it…**
The password the panel has doesn't match the one the game is using. This usually means it was changed in the game's own
files (or the game hasn't been restarted since the panel changed it). Make the two match: set the password in the
server's settings to what the game has, or use **Change the RCON password** on the **Automation** tab with the server
stopped, then start it.

**The RCON connection to the game was closed…**
The game closed the connection. It may be restarting or shutting down. Try again in a moment.

**This game has no console to do that from.** / **This game can't kick/ban players from here.**
Not every game offers those commands over the console. Where it doesn't, the panel doesn't pretend.

**SteamCMD isn't installed yet. Download it from Settings first.**
SteamCMD is the tool that downloads game servers. The panel fetches it for you, once, when you agree to it.

**Type the server's exact name to confirm.**
For anything that can't be undone (deleting, restoring) you type the name to show you meant it.

---

## Backups and restores

**None of this server's save folders exist yet, so there is nothing to back up. Start the server once so it creates them.**
A new game hasn't made its save folders. Start it, let it run a minute, then back up.

**No folders are set up to back up for this server.**
Choose folders under **What is backed up** on the **Backups** tab.

**The backup was written but couldn't be read back, so it was discarded.**
The panel checks every backup by reading it back. This one failed the check, so it kept nothing rather than
something it can't trust. The usual cause is a full or failing drive. Check free space and try again.

**Not enough room on the backup drive…** / **Not enough free space to restore…**
The drive would be left with less than your minimum free space (`Settings → Backups → Refuse backups below this
much free space`). Free some space, move the backup folder, or lower the minimum.

**That backup has no readable record of what it holds, so it can't be restored safely.**
The backup file is damaged or isn't one the panel made.

**That folder is inside (or contains) the local backup folder, so it wouldn't be a separate copy.**
A copy kept in the same place isn't protection against losing the drive. Pick a folder on another drive, share or
cloud-sync folder.

**Each backup folder needs a path. Remove any blank entry.**
A row in the folder list is empty.

---

## Settings and ports

**Port N is right after the game port. The game may use it for itself, so it's kept free.**
Games quietly use the port next to their game port. The panel stops you putting a query or RCON port there, so
nothing clashes. Choose a different number.

**Port N is used by <game> itself (…), so it can't be used for anything else.**
Same idea for a port the game is known to take.

**Choose a port from 1024 to 65535.**
Ports below 1024 belong to system services, so the panel keeps clear of them.

**That setting wasn't found in the file, so nothing was changed.** / **The settings file doesn't exist yet. Start the server once so the game creates it.**
Some games only make their settings file the first time they run. Start the server once, then edit.

---

## Community view and tunnels

**cloudflared isn't installed yet. Download it first.**
The tunnel program is downloaded from Cloudflare once, when you agree to it in the set-up dialog.

**Paste the tunnel token first.** / **That doesn't look like a tunnel token. Copy it whole from the Cloudflare dashboard.**
The token is long (over 40 characters) and has no spaces. Copy all of it.

**Enter the public address this tunnel serves.** / **That isn't a valid web address (use a name such as panel.example.com).**
Type the name only, such as `panel.example.com`.

**Port N is in use by something else. Choose another port for the community view.**
Another program holds the listener's port. Choose a different one in the set-up dialog.

**Another cloudflared on this PC is also running the tunnel "…".**
Two programs serving one tunnel split visitors between them, so about half land on the wrong one. Stop the other.

**This address isn't served here.** *(421)*
Someone opened the community listener by its number or under a name it doesn't answer to. Use the public address.

---

## Mods

**Stop the server first: a game reads its mods when it starts.**
Stop it, change the mods, start it.

**No CurseForge API key set. Add one in Settings (free, from console.curseforge.com) to install modpacks.**
Modpacks from CurseForge need a free key. Create one at console.curseforge.com and paste it under
`Settings → CurseForge API key`.

**manifest.json not found at the root of the zip — is this a CurseForge modpack export?**
Upload the pack's **server** export (the zip with `manifest.json` at its top), not a folder or the client download.

---

## Panel updates

**The download doesn't match the checksum in the release notes (got …, expected …), so it was deleted.**
The file you downloaded isn't the one that was published (corrupted, or tampered with). It was deleted. Try again,
and if it keeps happening, download from the project's Releases page and compare the SHA-256 yourself.

**That download isn't from a place the panel trusts, so it was not fetched.**
The panel only downloads updates from the project's GitHub releases.

---

## The data folder

**GodlyPanel can't read … (EACCES / EPERM / EBUSY). Check that this Windows account may open it and that no other
program has it locked; the file was not changed.**
The panel found one of its own data files but couldn't open it. It stopped instead of treating it as empty, which would
have looked like a fresh install and could have overwritten your accounts or settings. The usual causes are that the file
was copied from another Windows account, or something (antivirus, a backup tool) is holding it open. Close that program, or
make sure your Windows account can open the `data` folder, then start the panel again.
