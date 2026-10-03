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
- [ ] **The `data` folder stays private.** It holds password hashes, the key that signs sign-ins, RCON
      passwords and your Discord, cloud-storage and tunnel secrets. The panel limits it to your Windows
      account, SYSTEM and Administrators. Don't copy `secrets.json` into a support thread or onto a
      shared drive, and remember a backup of `data` contains those secrets.
- [ ] **Backups to cloud storage use a key limited to one bucket**, not your main account key.
- [ ] You haven't clicked **Allow access** for programs you don't recognise. Windows adds firewall
      rules when you do, and they stay. Look through *Windows Security → Firewall & network
      protection → Allow an app through firewall* now and then and remove ones you don't need.

### Updating GodlyPanel

- [ ] Download only from the project's own [Releases page](https://github.com/Vulcanie/GodlyPanel/releases).
- [ ] **Compare the checksum.** Each release lists a SHA-256. In PowerShell:
      `Get-FileHash .\GodlyPanel-*-win.zip -Algorithm SHA256` should print the same value. The panel's
      own update download does this check for you.
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
4. Look at **Activity** (top right) for sign-ins and actions you don't recognise.
5. Revoke the **Discord bot token** and **webhooks**, regenerate **cloud-storage keys** and the **tunnel token**
   if the `data` folder or `secrets.json` may have been seen. Put the new ones in `Settings`.
6. Check your router's **port forwards** and Windows Firewall rules for entries you didn't make.

## Reporting a problem in GodlyPanel itself

If you find something that looks exploitable, please don't post it publicly. Use the repository's
**Security → Report a vulnerability** page. See [SECURITY.md](../SECURITY.md).
