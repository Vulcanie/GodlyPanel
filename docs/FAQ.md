# Frequently asked questions

## Using it

**Do my servers stop if I close the panel?**
No. Closing the window leaves the panel in the system tray, and even quitting it leaves your game servers running. They're
separate programs. Quitting the panel does stop its scheduled jobs and its crash recovery until you start it again.

**Does it work on Linux or Mac?**
No. GodlyPanel is for Windows 10 and 11 (64-bit), and manages the Windows versions of game servers.

**Can I run more than one server of the same game?**
Yes. Each gets its own folder (or, for games that share one install, its own start script), its own ports and its own
settings. The panel checks the ports don't clash.

**Where are my servers installed?**
`Settings → Folders` lists every server's folder under *Where your servers are now*, and each server's Settings tab says
"Installed in" at the top. The *Server install folder* setting above that list only decides where **new** servers go.

**Where is my data?**
In the `data` folder next to the app. Back that folder up to back up your accounts, settings and server list. Your worlds
are backed up separately, from each server's **Backups** tab.

**Can I move it to another PC?**
Copy the whole folder, including `data`. Game servers are separate installs and need moving or re-creating, and your
router forwards need pointing at the new PC. Copy the folder with Explorer rather than a tool that preserves permissions,
so the `data` folder takes the new account's permissions.

**How do I update GodlyPanel?**
`Settings → Panel updates` tells you when there's a new version and can download and verify it. You then unzip it over the old
app, leaving `data` alone. It never installs by itself. Back up `data` first.

## Friends and access

**What's the difference between a Viewer, a Moderator and an Administrator?**
A Viewer looks, a Moderator runs servers, an Administrator does everything. See [Accounts and roles](ACCOUNTS_AND_ROLES.md).

**Can people see my server's join password?**
Viewers can't. Only administrators can read passwords. Share a join password with the people you want to play with.

**Do my friends need to install anything?**
No. To *see* your servers they open a web address. To *play*, they just need the game.

**How do friends see the panel from outside my home?**
Through the **community view**: a small public page, set up from inside the app, that shows status and how to join. See
[Remote access](REMOTE_ACCESS.md).

**Can my moderators manage things when they're away from home?**
Two ways. A **private network** (Tailscale) lets them open the panel as if at home and needs no open door. Or you can switch on
**Let administrators and moderators sign in here too** under `Settings → Community view`, which lets staff sign in on the public
community address. Read the [security note](SECURITY_GUIDE.md#staff-sign-in-from-outside) first.

**Do I need to open port 8765 on my router?**
No, and you shouldn't. Open only the games' own ports. See [Ports and firewall](PORTS_AND_FIREWALL.md).

## Safety

**Is it safe to open ports for a game server?**
It's as safe as any game server: an open port is a door anyone can knock on. Use join passwords, keep the game updated, open only
the ports the **Network** tab lists, and don't open RCON. See the [security checklist](SECURITY_GUIDE.md).

**Why does Windows warn me about the download?**
Because the app isn't code-signed yet (signing costs money; it's planned). Unblock the zip before unzipping and check the
SHA-256 against the release notes. See [Getting started](GETTING_STARTED.md).

**What does the panel do with my passwords?**
Account passwords are stored only as bcrypt hashes. Game and RCON passwords are stored in the server list and shown only to
administrators, and masked in logs. Everything lives in your `data` folder, which the panel limits to your Windows account.

**I think my RCON password leaked. What now?**
Stop the server, use **Change the RCON password** on its **Automation** tab, and start it again. See
[Managing servers](MANAGING_SERVERS.md#changing-the-rcon-password).

## Problems

**The panel says "This panel is private".**
You opened it from outside the owner's network. See [the messages](WHAT_THE_MESSAGES_MEAN.md#pages-that-say-no).

**I'm an administrator and the public page says my password is right but I can't sign in.**
Staff sign-in on the public address is off. See [Accounts and roles](ACCOUNTS_AND_ROLES.md#where-each-kind-of-account-can-sign-in).

**More help:** [Troubleshooting](TROUBLESHOOTING.md).
