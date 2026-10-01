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
- **guests** are not trusted, and can only see server status;
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
  moderator sign-ins (a right password reads exactly like a wrong one) and ignores their
  sessions; has no route that starts, stops, edits, deletes or reads settings; caps live
  streams and requests per visitor (using Cloudflare's reported address); and marks its cookie
  Secure. The panel itself refuses any request that carries Cloudflare's headers, so a tunnel
  pointed at it by mistake still can't reach it. The tunnel token is kept in `secrets.json`
  and handed to cloudflared through its environment, not its command line. cloudflared is
  downloaded only on request, from Cloudflare's GitHub release, and checked against the
  checksum GitHub publishes. Cloudflare can see the traffic that passes through its tunnel.

## What it does not protect against

- **A hostile local network.** The panel is served over plain HTTP, so someone who
  can capture traffic on your network can read a session cookie. HTTPS isn't used
  because it needs a certificate that a home network can't get without either
  browser warnings or exposing the panel publicly. Don't use it on a network you
  don't trust.
- **An admin account that is compromised.** Admins can run programs on the host.
- **The internet.** There is deliberately no port-forwarding or tunnelling, and
  exposing the panel's own port to the internet is unsupported.
- **Code that hasn't been audited.** See the note in the README about how this
  project is built. It has an extensive automated test suite, but no independent
  security review.
