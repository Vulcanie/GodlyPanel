# Security

GodlyPanel controls processes and files on the computer it runs on, so security
reports are taken seriously, and are wanted.

## Reporting a problem

Please **don't open a public issue** for something exploitable. Use GitHub's
private reporting instead: on the repository page choose **Security → Report a
vulnerability**. Include what you found, how to reproduce it, and which version.

This is a one-person project, so replies are best-effort rather than on a schedule,
but a report with clear steps to reproduce is looked at promptly.

## What the panel is designed to defend against

It is a tool for a trusted home or community network, not the open internet. It
assumes:

- the computer running it is yours, and whoever has an **admin** account is trusted
  to run programs on it (an admin can already do that by editing a server's start
  script, so the panel doesn't pretend otherwise);
- **moderators** are trusted to run servers (start, stop, update, back up, read logs, use the console,
  kick and ban) but not to see passwords, change settings or delete anything;
- **guests** (called Viewers in the interface) are not trusted, and can only see server status;
- the network is not hostile.

Against that model it does the following:

- accepts connections only from local-network addresses, and answers to an IP
  address, `localhost` or the computer's own name, which blocks DNS-rebinding
  attacks from web pages;
- has server-enforced roles on every route, with sessions revoked immediately when
  a role or password changes;
- hashes passwords with bcrypt, rate-limits sign-in per account and per address,
  and takes the same time to answer for unknown and known usernames;
- keeps sessions in HttpOnly, SameSite=Strict cookies, and rejects unsigned tokens;
- keeps file access, config editing and uploads within the server folders it
  manages, identifies uploaded images by their bytes, and never puts a command
  from a config file through a shell;
- keeps API keys and webhooks in a separate file from ordinary settings, so a
  settings file is safe to paste into a support thread.

### The newer surfaces

- **Off-machine backups.** The secret key of an S3-compatible destination is kept in
  `secrets.json`, never in `config.json` or in anything the interface can read back (it only
  ever learns that a key is set). A folder destination can't be inside the local backup folder.
  Use a key limited to one bucket; the panel only ever lists, uploads, downloads and deletes
  objects under its own server folders in it.
- **Kicking and banning.** Names and ids typed into the panel are checked against what the game
  accepts and refused if they could end a console command and start another (line breaks,
  quotes, semicolons). Every action is in the activity log with who did it. Kick needs the
  moderator role or above; ban and list changes the same.
- **The Discord bot.** It uses the bot token from `secrets.json` and answers only in the Discord
  server it was set up for, never in private messages, and never mentions anyone. Looking at
  servers is open to everyone in that Discord server; starting, stopping, restarting, backing
  up and broadcasting need the admin role chosen in Settings. With no role chosen nothing can be
  changed from Discord. Being a Discord administrator is not enough on its own.
- **Windows Firewall.** The panel only reads the rule list. Adding a rule is an explicit button
  press by an administrator, builds the command from validated port numbers and a name stripped
  to plain characters, and runs it through Windows' own permission prompt on the PC.
- **Server tags** are plain labels (letters, numbers, spaces, dots, dashes, underscores).
- **The community code and the community view.** The code only ever makes *guest* accounts,
  can be switched off, replaced, set to expire and capped, and wrong guesses are slowed down
  for everyone. The community view is the one part meant to be reachable from the internet, so
  it is a separate, small web server on `127.0.0.1` (published only by a Cloudflare Tunnel the
  panel starts) rather than the panel: it answers only to its public name; serves the page,
  guest sign-in and sign-up, and the read-only status a guest sees; refuses administrator and
  moderator sign-ins unless the owner has switched on staff sign-in (below). A wrong password, an
  unknown name and a suspended account all read the same, and only the *right* password for a staff
  account is told why it can't sign in there, so the page reveals nothing a guesser didn't already
  have. Their sessions are otherwise ignored. It has no route that starts, stops, edits, deletes or reads settings; caps live
  streams and requests per visitor (using Cloudflare's reported address); and marks its cookie
  Secure. The panel itself refuses any request that carries Cloudflare's headers, so a tunnel
  pointed at it by mistake still can't reach it. The tunnel token is kept in `secrets.json`
  and handed to cloudflared through its environment, not its command line. cloudflared is
  downloaded only on request, from Cloudflare's GitHub release, and checked against the
  checksum GitHub publishes. Cloudflare can see the traffic that passes through its tunnel.

### Staff sign-in from outside (optional, off by default)

Administrators and moderators can normally sign in only on the local network. A switch under
Settings → Community view lets them sign in at the community address too, for people who are never at
home. It is **off** until an administrator turns it on (with a confirmation), and turning it on puts the
sign-in for accounts that can control the PC in front of the internet, so it is documented as a risk the owner
accepts. When it is on:

- the community listener hands signed-in staff the panel's own route table, with the same per-route role
  and per-server checks, so a moderator is still a moderator; first-run setup and sign-in are not part of
  it, and the request body limit rises to the panel's own only for a signed-in staff member;
- staff sign-in has its own, stricter, wrong-guess counter (5 per account, 12 per address, ten
  minutes), kept apart from the panel's, so guessing from the internet cannot lock an administrator out at home;
- every staff sign-in from outside is recorded in the activity log with the visitor's address, and so is switching
  the setting on or off;
- switching it off ends staff sessions' live streams at once, and their cookies stop working immediately.

The safer way to give trusted people remote access is still a mesh VPN, which opens nothing.

### Hardening applied to the panel and the desktop app

- **Browser-side limits.** Every page is sent with a Content-Security-Policy (own-origin scripts only, no framing, no
  plugins), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a Permissions-Policy that turns
  off camera, microphone, location and the like. A browser test checks the real interface loads under it and that an
  injected script does not run.
- **Same-origin changes only.** A request that changes something is refused if the browser says it was started by
  another site, or by a page on another *port* of the same PC (which `SameSite=Strict` alone does not stop, since
  "same site" ignores the port), using the browser's own `Sec-Fetch-Site` label, with a comparison of `Origin` and
  `Host` for browsers that lack it.
- **The data folder is private.** `data` holds the password hashes, the key that signs sessions, RCON
  passwords and the Discord, cloud-storage and tunnel secrets. A folder made under the root of a drive inherits
  permissions that let every account on the PC read it and any signed-in account change it, so the panel limits `data`
  (and everything in it, including files made later) to the account running the panel, SYSTEM and Administrators,
  using well-known SIDs so it works in any Windows language. If it can't change permissions it carries on and logs why.
- **A file it can't open is not an empty file.** If the account, secrets, server or settings file exists but can't
  be read, the panel stops with a clear message instead of starting as if new and later overwriting it.
- **Passwords.** 8 to 72 bytes (bcrypt only uses the first 72, so longer would be silently cut), not one of the most
  common passwords, and not the username. Anyone can change their own password (the current one is asked for), and an
  administrator can set another person's; either ends that person's other sessions.
- **The desktop window.** No Node access in pages, a sandboxed and context-isolated renderer, web views blocked, every
  browser permission refused, the developer tools off in the packaged app (`GP_DEVTOOLS=1` turns them on for support),
  navigation away from the panel's own origin (compared by origin, not by the start of the address) and any redirect
  handed to the real browser, and only `http`/`https` links ever passed to the system.
- **Honest firewall check.** The check for whether a server's ports are open reads Windows Firewall through its COM
  interface, which any account can read. An earlier version used cmdlets that refuse a bulk read for a non-administrator
  and swallowed the error, which made every rule look as if it covered every port. Rules tied to one network adapter, one
  kind of connection or one local address (Tailscale adds an "allow everything" rule for its own address) are not counted
  as opening a game's ports.
- **Readable refusals.** A browser that is turned away (not on the network, a wrong host name, or arriving through a
  tunnel) gets a page that says why and what to do, while the app and scripts still get JSON.

### Updating

**Update now** (see [Updating GodlyPanel](docs/UPDATING.md)) makes the panel replace its own program files, so it is
held to the following.

- **Administrators only, and not from outside.** The button is an admin action, and it is refused when the request came
  through the public address (the community view), so a stolen or phished staff session from the internet can't change
  what the panel runs.
- **Only GitHub, only the release's own files.** The panel fetches an update from GitHub over HTTPS, by the file names the
  release's `update-manifest.json` gives, and follows no redirect off GitHub's download hosts. It only ever moves to a
  *newer* version.
- **Checked twice before anything is replaced.** The download must match the SHA-256 the release publishes (and its size),
  and, once unpacked, every file must match the list inside the archive. A release that publishes no checksum is never
  installed by itself. An archive with an entry outside its own folder, a link, or (for the small update) anything but
  the app's own files is refused.
- **The desktop app checks again.** The Electron process that does the hand-over re-validates the request: the unpacked
  files must be inside the panel's own updates folder, and the script that swaps them is the copy shipped inside the
  app, run from a temporary copy so replacing the app can't change it mid-run.
- **Nothing is replaced in the middle of other work,** and the swap is made by renaming, so each step is instant and can be
  undone. The new version has to report that it is running; if it doesn't, the old files are put back and the old version
  is started again.
- **Game servers and the `data` folder are never touched.**

What this does not do: **it can't protect you from someone who controls the project's GitHub releases.** The checksum is
published in the same place as the files, so it proves the download is the one that was published (not corrupted, not
swapped in transit), not that the publisher is honest. The program isn't code-signed yet ([plan](docs/CODE_SIGNING.md)), so
Windows can't vouch for it either. If that matters to you, leave **Update now** alone and verify releases yourself.

## What it does not protect against

- **A hostile local network.** The panel is served over plain HTTP, so someone who
  can capture traffic on your network can read a session cookie. HTTPS isn't used
  because it needs a certificate that a home network can't get without either
  browser warnings or exposing the panel publicly. Don't use it on a network you
  don't trust.
- **An admin account that is compromised.** Admins can run programs on the host.
- **The internet, for the panel itself.** There is deliberately no port forwarding, and exposing the
  panel's own port to the internet is unsupported (it refuses such connections anyway). The community view is the one
  deliberate door, and it serves guests only, unless the owner switches on staff sign-in.
- **A weak or reused staff password, when staff sign-in from outside is on.** Lockouts slow guessing; they do not
  make a guessable password safe.
- **Another account on the same PC with administrator rights**, or malware running as your own Windows account.
  Limiting the data folder protects it from other ordinary accounts, not from those.
- **Code that hasn't been audited.** See the note in the README about how this
  project is built. It has an extensive automated test suite, but no independent
  security review.
