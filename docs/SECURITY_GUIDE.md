# Security checklist

GodlyPanel controls programs and files on your PC, so a little care goes a long way. This page is
the practical version; [SECURITY.md](../SECURITY.md) is the technical description of how the panel
defends itself.

## What is and isn't exposed by default

Out of the box, **nothing** is reachable from the internet.

- The **panel** (port 8765) only answers computers on your own network. If someone elsewhere tries,
  they get a page that says *"This panel is private"* and nothing else.
- The **community view** (a public page for friends) is **off** until you set it up. When it's on, it
  is a separate small page that shows server status to Viewers. It can't start, stop, change or read
  anything else.
- **Game ports** are open only if *you* forward them on your router.

Most of this page is about the three things you might choose to turn on.

## The checklist

### Accounts

- [ ] **Everyone has their own account**, and nobody shares the administrator's.
- [ ] **Passwords are long and not reused anywhere else.** A few random words are fine. The panel
      refuses the most common ones.
- [ ] **Few administrators.** Most helpers need *Moderator*, not *Administrator*. An administrator can
      make a server run any program, which in effect means using your PC.
- [ ] **Suspend or delete accounts people don't use any more** (`People`).
- [ ] **Look at `Sessions` now and then**, and end any sign-in you don't recognise.
- [ ] After someone leaves your community, change the **community code** (`People → Community access`).

### Ports and the router

- [ ] **Only game ports are forwarded.** Never the panel's port (8765), the community listener (8766),
      or any RCON, Telnet or REST port. See [Ports and firewall](PORTS_AND_FIREWALL.md).
- [ ] **Each forward still has a server behind it.** Remove forwards for servers you've deleted.
- [ ] **Join passwords are set** where the game supports one.
- [ ] **Games are kept up to date.** Game updates often fix security problems.

### RCON

RCON is the remote console. With its password, anyone who can reach the port can run admin commands.

- [ ] It stays **on this PC only**. Don't forward it.
- [ ] Each server has **its own** long random password. Use **Change the RCON password** on the
      server's **Automation** tab (see [Managing servers](MANAGING_SERVERS.md#changing-the-rcon-password)).
- [ ] If a password was ever posted somewhere, assume it's known and change it.

### Your PC

- [ ] **Windows is up to date**, and it's a Windows account only you (and people you trust) use. The
      panel runs as that account, and so do your game servers.
- [ ] **The `data` folder and the hidden `.godlypanel-secrets` folder beside it stay private.** `data` holds
      password hashes and every server's RCON password; `.godlypanel-secrets` holds the key that signs
      sign-ins and your Discord, cloud-storage and tunnel secrets, and is kept out of `data` so a copy of
      `data` doesn't include them. The panel limits both to your Windows account, SYSTEM and Administrators.
      Don't put `secrets.json` in a support thread or on a shared drive, and remember a backup of `data`
      still contains the password hashes and RCON passwords.
- [ ] **Backups to cloud storage use a key limited to one bucket**, not your main account key.
- [ ] You haven't clicked **Allow access** for programs you don't recognise. Windows adds firewall
      rules when you do, and they stay. Look through *Windows Security → Firewall & network
      protection → Allow an app through firewall* now and then and remove ones you don't need.

### Updating GodlyPanel

- [ ] Download only from the project's own [Releases page](https://github.com/Vulcanie/GodlyPanel/releases).
- [ ] **Compare the checksum.** Each release lists a SHA-256. In PowerShell:
      `Get-FileHash .\GodlyPanel-*-win.zip -Algorithm SHA256` should print the same value. The panel's
      own update does this check for you, and also checks the project's signature on the release, so it
      refuses a release that was altered or put there by someone else. (A checksum shown beside a download is
      only as good as the page it is on; the signature is not.)
- [ ] The app isn't code-signed yet, so Windows will warn on first run. Unblock the zip before
      unzipping (see [Getting started](GETTING_STARTED.md)). The warning isn't a sign anything is wrong, but
      the checksum is how you know the file is the real one.

## Choices that open a door

### Staff sign-in from outside

By default, **administrators and moderators can only sign in from your own network.** That is the safest
setting: the people who can control your servers can't be attacked from the internet.

The switch **Let administrators and moderators sign in here too** (`Settings → Community view`) lets
staff sign in at the community's public address, for people who aren't at home. Turning it on means:

- a password someone **guesses or has reused from a leaked site** is now enough to control your PC from
  anywhere, not just from inside your house;
- administrators can do anything an administrator can at home: start and stop servers, change settings,
  manage people and run batch files.

What protects you if you turn it on:

- **Long, unique passwords.** This is the whole defence. A passphrase of four or five random words is
  far stronger than a short password with a number on the end.
- **A strict lockout.** Five wrong guesses for one account, or twelve from one address, within ten
  minutes, locks sign-in at the public address for a while. Your own sign-in at home is counted
  separately and isn't affected.
- **A record.** Every staff sign-in from outside is written to **Activity** with the address it came
  from. Look at it from time to time. A sign-in you don't recognise means change that password.
- **An off switch that takes effect at once.** Turning it off signs staff out and closes their live views
  immediately.

Use it only for the people who need it, and turn it **off** when nobody does. If you can, the safer way to
let a trusted person manage things from away is a private network such as **Tailscale**
([Remote access](REMOTE_ACCESS.md)), which needs no open door at all.

If an administrator or moderator tries to sign in at the public address while the switch is off, the page
says their password is right but their kind of account can't sign in there. That is the setting working.

### The community view and the community code

The community view only ever shows what a **Viewer** can see: which servers are up, who's on, how to join.
Viewers can't read passwords or settings. Anyone with the **community code** can make a Viewer account, so:

- turn the code **off** when you don't need new people, or set it to **expire** or to a **limit** of sign-ups;
- change it if it has been shared more widely than you meant;
- remember that a join password for a game server is something a Viewer *can't* see, so share those
  only with people you intend to play with.

### Forwarding the panel's port

Don't. If you do anyway, the panel still refuses connections from outside your network, but that wall is the
only thing between the internet and an administrator login, and it isn't designed to be the only one.

## Keeping a record

**Activity** (left-hand menu) lists every sign-in by an administrator or moderator, every sign-in that failed
(the name tried and the address it came from, never the password), and every change anyone made: who
started, stopped or restored a server, who made or removed an account, and *which* settings and secrets
were changed (never their values). A request someone wasn't allowed to make is listed too, marked
"refused".

- **Where I'm signed in** (your menu, at the bottom of the left-hand menu) lists every place you are signed in: the browser, roughly where from, when you
  signed in and when it was last used. End any of them, or **Sign out everywhere else**. Administrators also
  see everyone else's, and on **People** can sign a person out everywhere (it doesn't stop them signing in
  again with their password; suspend the account for that). Signing out, changing your password and ending a
  session all take effect at once, including for a copy of the sign-in cookie.
- **Export** (administrators, at the bottom of Activity) saves the whole log, not just what is on screen,
  as a CSV file for a spreadsheet or as JSON Lines for anything that reads logs.
- **Audit webhook** (in `Settings`, with the other webhooks) posts each of those entries to a Discord channel as it happens.
  Make the channel one only you can read. A copy that lives on another service is one that somebody who
  got into this PC can't quietly edit. Nothing is posted about what viewers do.

The log is kept to roughly the last 4 MB; export it now and then if you want a longer history.

## Limits worth knowing about

- **The panel is served over plain HTTP** on your network, as home networks can't easily get a certificate
  that browsers trust. On a network with strangers on it (a dorm, a café, shared Wi-Fi), someone could read a
  sign-in cookie out of the air. Use the panel on networks you trust, or through Tailscale, which encrypts
  everything.
- **An administrator account that is compromised** can run programs on your PC. Protect those passwords
  first.
- **Nobody independent has audited this code.** It has a large automated test suite and the weak spots
  found are fixed as they're found, but treat it as a hobby project, not a hardened product.

## If you think something has leaked

Do these in this order. None of them takes long.

1. **Turn off** what you don't need: *Staff sign-in from outside*, the community view, the community code.
2. **Change the passwords** of the accounts involved (the **Password** button for yours; **People** for others).
3. **Change the RCON passwords** of every server (stopped servers first; restart the running ones when you can).
4. Look at **Activity** (left-hand menu) for sign-ins and actions you don't recognise.
5. Revoke the **Discord bot token** and **webhooks**, regenerate **cloud-storage keys** and the **tunnel token**
   if the `data` folder or `.godlypanel-secretssecrets.json` may have been seen. Put the new ones in `Settings`.
6. Check your router's **port forwards** and Windows Firewall rules for entries you didn't make.

## Reporting a problem in GodlyPanel itself

If you find something that looks exploitable, please don't post it publicly. Use the repository's
**Security → Report a vulnerability** page. See [SECURITY.md](../SECURITY.md).
