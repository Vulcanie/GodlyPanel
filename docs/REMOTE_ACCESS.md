# Opening the panel from another device

GodlyPanel answers only on your **local network** and on **mesh VPNs** such as Tailscale and
ZeroTier. It refuses requests from the public internet on purpose: the panel can start, stop and
delete servers, and a login page on the open internet is found and attacked within hours.

## On the same network

1. Settings → "Allow access from your network" must be on (it is by default). Restart the panel
   after changing it.
2. Settings → "Opening the panel from another device" lists the addresses to use, such as
   `http://192.168.1.20:8765/`. Open one on the phone or other PC.
3. If it doesn't load, Windows Firewall may be blocking the panel's port. Open the panel's own
   port (8765 unless you changed it) for **Private** networks:
   `New-NetFirewallRule -DisplayName "GodlyPanel" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8765 -Profile Private`
   (run in an administrator PowerShell).

## From away from home: use a mesh VPN, not a port forward

**Tailscale** (free for personal use; recommended):

1. Install Tailscale on the PC running GodlyPanel and on your phone or laptop.
2. Sign in with the same account on both.
3. On the phone, open `http://100.x.y.z:8765/`, using the `100.` address Tailscale shows for the PC
   (also listed in the panel's Settings).
4. Keep Settings → "Allow mesh VPN addresses" on. Tailscale uses the `100.64.0.0/10` range.

**ZeroTier** works the same way: create a network, join both devices, and use the address ZeroTier
gives the PC. Add its range under Settings → "Additional allowed networks" if it isn't `100.64.0.0/10`.

**Why not port forwarding?** Forwarding the panel's port exposes the login page to everyone. If
you really want that, put it behind something that adds its own sign-in (Cloudflare Access, a
reverse proxy with client certificates). The panel will still refuse the requests, because they
don't come from an allowed network: add the proxy's address under "Additional allowed networks"
only if you understand what that opens.

## A public address for your community (no software for them to install)

Settings → **Community view (a public address)** → *Set up*. The panel itself stays on your network;
this publishes a separate, much smaller page through a **Cloudflare Tunnel** (an outbound connection
from this PC to Cloudflare, so nothing is opened on your router).

- **What people get:** a web address. They sign in as a **guest**, or choose *I have a community code*
  and make their own account (see the next section), and look at the dashboard: status, players, join
  address. They cannot start, stop, change or delete anything. Administrators and moderators can't
  sign in there either, unless you switch on **Let administrators and moderators sign in here too**
  (off by default): then they get the whole panel at that address, with the same powers as at home.
  That puts the sign-in page in front of the internet, so use long, unique passwords. Staff sign-in has
  its own, stricter lockout (five wrong guesses, ten minutes) that doesn't touch your sign-in at home,
  every staff sign-in from outside is recorded in Activity, and first-run setup is never offered there.
- **cloudflared** (Cloudflare's tunnel program) is downloaded once, only when you agree in the set-up
  dialog, from Cloudflare's official GitHub release, checked against its published checksum, and kept in
  the panel's own data folder. If you already have it, the panel uses that.
- **Three ways to choose the address:**
  1. *A temporary link:* no Cloudflare account. A random `...trycloudflare.com` address that changes each
     time it starts. Good for trying it. Cloudflare doesn't carry live streams on these, so the page
     refreshes every few seconds instead of live.
  2. *Your own address, with a tunnel already on this PC:* if you made one with `cloudflared tunnel create`,
     the dialog finds it. The panel runs it with a settings file of its own that points your address at
     the community view, and leaves yours alone. **Stop any other cloudflared running the same tunnel**
     (for example one started by PM2 or a service), or visitors will be split between the two.
  3. *Your own address, with a token:* in the Cloudflare dashboard (Zero Trust → Networks → Tunnels)
     create a tunnel, add a *Public Hostname* with service `HTTP` and URL `localhost:<the port shown>`,
     and paste the tunnel's token and the address in the dialog.
- **Turn it off** with one button. It starts again by itself when the panel starts, if it was on.
- The panel refuses any request that carries Cloudflare's headers, so a tunnel pointed at the panel itself
  (rather than at the community view) can't reach it.

## Letting administrators and moderators in from outside

By default staff (administrators and moderators) can only sign in on your own network or over a VPN. If some of
them are never at your home, there are two ways, and the first is the safer.

1. **A private network (Tailscale or ZeroTier), above.** They reach the panel as if at home. Nothing is open to
   the internet.
2. **Staff sign-in on the community address.** `Settings → Community view → Let administrators and moderators sign
   in here too`. It is **off until you switch it on**, and switching it on asks you to confirm.

What option 2 does, so you can decide:

- Staff sign in at the public address and get the **whole panel**, with the same powers as at home: a moderator is still a
  moderator, an administrator can do everything. Guests are unchanged.
- It adds a login page to the internet for the accounts that can control your PC. **Protect it with long, unique
  passwords.** The page locks sign-in after 5 wrong guesses for an account (or 12 from one address) for ten minutes, and
  that count is kept apart from your sign-in at home, so someone guessing from outside can't lock you out indoors.
- Every staff sign-in from outside is written to **Activity**, with the address it came from.
- First-run setup is never offered there, and a tunnel pointed at the *panel* instead of the community view still can't reach it.
- Switching it off signs staff out and closes their live views straight away.

If staff sign-in is off and a moderator or administrator uses the right password on the public address, the page tells them
so, plainly ("Your password is right, but admin accounts can't sign in on this public address…"). They should use the panel
on your network or VPN, or you can allow staff sign-in. More in the [security checklist](SECURITY_GUIDE.md#staff-sign-in-from-outside).

## Letting your community in (Tailscale + a guest account)

Two things are needed: a way to *reach* the panel, and an *account* in it.

**1. Reaching it: share this PC through Tailscale.** Install Tailscale on this PC and sign in. Don't invite
friends into your own Tailscale account: that puts them on the same network as every other device you own.
Instead, in the Tailscale admin console open *Machines*, choose this PC, then *Share…* and send the link.
Each friend installs Tailscale, signs in with their own account, accepts the share, and can then reach
**this PC and nothing else of yours**. The panel's Settings page shows whether Tailscale is connected and
the address to give them, such as `http://godly-pc.tail1234.ts.net:8765/` (the panel accepts this PC's own
Tailscale name as well as its `100.x.y.z` address).

**2. The account: a community code.** Settings → *Community access* → switch it on. The panel makes a code
such as `K7QM-2XPA`. Anyone who opens the panel, chooses *I have a community code* on the sign-in page and
enters it picks their own username and password and becomes a **guest**: they can look at the dashboard
(status, players, ports) and cannot change anything. The page also writes a ready-to-send message.

- The code can be switched off, replaced (the old one stops working at once), set to expire, and limited to a
  number of sign-ups. Accounts already made stay until you remove them under Users.
- A wrong code gets nothing and says nothing about whether an invite exists; repeated wrong guesses are
  slowed down for everyone for ten minutes.
- It only makes guests. Moderators and admins are still made by an administrator under Users.
- It only works for people who can already reach the panel: the code never opens the panel to the internet.

You can also skip the code and create each person's account yourself under Users.

## For people who only need to look

Friends and community members who only want to see whether a server is up don't need the panel at
all. Turn on the Discord bot (Settings → Discord) and they can use `/servers`, `/status` and
`/players` in your Discord server. Starting, stopping and backing up from Discord is limited to the
admin role you choose.

## Game servers are a different matter

Players join the **game servers**, not the panel. Those need their game ports open in Windows
Firewall and forwarded on your router. A server's **Network** information (its page → checklist)
lists the ports and whether Windows Firewall allows them.
