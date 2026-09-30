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

## For people who only need to look

Friends and community members who only want to see whether a server is up don't need the panel at
all. Turn on the Discord bot (Settings → Discord) and they can use `/servers`, `/status` and
`/players` in your Discord server. Starting, stopping and backing up from Discord is limited to the
admin role you choose.

## Game servers are a different matter

Players join the **game servers**, not the panel. Those need their game ports open in Windows
Firewall and forwarded on your router. A server's **Network** information (its page → checklist)
lists the ports and whether Windows Firewall allows them.
