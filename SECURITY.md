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
