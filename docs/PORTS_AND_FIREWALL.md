# Ports and firewall: letting friends join

When friends outside your home want to join a game server, three things have to line up:

1. **The game server is running** and listening on its port.
2. **Windows Firewall on your PC** lets that port in.
3. **Your router** sends traffic for that port to your PC. This is called *port forwarding*.

The panel can check the first two for you. It **can't see your router**, so the third is
always done by hand.

## The one rule that matters most

> **Open only the game's own ports. Never open the panel's port, or any RCON, Telnet or
> admin port.**

| Port | What it is | Open it to the internet? |
|---|---|---|
| The game's **game port** and the ports the game takes next to it | What players connect to | **Yes**, this is the point |
| The game's **query port** (when the game uses it for server lists) | Lets server browsers see the server | Yes, if the game needs it (the panel's list says) |
| **8765** (the panel itself) | The control panel | **Never.** It would put your admin tool on the internet |
| **8766** (the community view's listener) | Listens on this PC only | **Never.** It is reached through the tunnel, not the router |
| **RCON** port | Lets the panel send console commands | **Never.** The panel uses it on this PC only |
| **Telnet** port (7 Days to Die) | Console for saving and commands | **Never** |
| Palworld's **REST API** port | Lets the panel read the server | **Never** |

The panel keeps to this itself: its list of **Ports players need** never includes RCON,
Telnet or REST ports, and the button that adds Windows Firewall rules only adds the ports
players need.

## Which ports does my server need?

Open the server's **Network** tab. Under **Ports players need** you'll see exactly the ports
for that game, with a column that says **Allowed** or **No rule** for each. Most games use
**UDP** on the game port plus the port next to it. A few differ:

- **Minecraft** uses TCP on its one port.
- **7 Days to Die** uses TCP on the game port and UDP on three ports in a row.
- **Satisfactory** uses UDP and TCP on the game port, plus a TCP port for reliable messaging.
- **Palworld** uses UDP on the game port; its query port is the REST API and stays private.
- **Subsistence** uses UDP on its game port and query port (the form suggests 8900 and 8902), plus two fixed
  Steam ports, UDP **13000** and **41765**, which don't change with the settings. That also means one
  Subsistence server per PC unless you change those.
- **Windrose** needs **no port opened** in its default mode: players join with the server's *invite code*
  through the game's own relay. (If you turn on direct connection in its settings, open the port you choose there.)

The list is built from checking each game against a real install ([game support](GAME_SUPPORT.md)),
so trust it over a guide for a different server tool.

When you create a server, the form tells you which ports to open before you finish.

## Step 1: Windows Firewall

On the **Network** tab, if a port says **No rule**:

1. Choose **Allow these ports in Windows Firewall**.
2. Windows asks for permission (the usual prompt that asks for an administrator). Say yes.
3. The panel adds the rules and the list changes to **Allowed**.

Notes:

- Rules are added for your **Private** and **Domain** networks (home and work). Tick *Also on
  public networks (less safe)* only if your PC connects through a network Windows has labelled
  Public, such as a café or hotel, and you really mean to host there.
- A rule for the game's *program* counts too. Windows creates one when it asks "Allow access?"
  the first time a game listens.
- A "Windows Firewall allows everything for Tailscale" rule does **not** count as opening the
  game's ports. It only covers Tailscale's own network adapter, and the panel knows that.

## Step 2: Your router

Every router looks different, but the idea is the same:

1. Find your PC's address on the network: the **Network** tab shows it under **Joining from the
   same network** (something like `192.168.1.20`).
2. Log in to your router (its address is usually `192.168.0.1` or `192.168.1.1`, printed on the
   router).
3. Find **Port forwarding** (sometimes *Virtual server*, *NAT* or *Applications*).
4. Add an entry for each port from the list: the **same number** for the external and internal
   port, the **right protocol** (UDP, TCP, or both if you're unsure), pointing at your PC's address.
5. **Give your PC a fixed address** (a *DHCP reservation* or *static lease* in the router). If the
   address changes, the forward points at nothing and friends can't join.

Friends then join with your **public IP address** and the game port: `203.0.113.5:8892`, say.
Search "what is my IP" from your PC to find it. It can change when your router restarts; a free
dynamic-DNS name (DuckDNS, No-IP) gives you a name that follows it.

### If your own PC can't join using the public address

That is normal for many routers (they won't loop traffic back inside). When *you* play from the
same network, join with the PC's network address instead (`192.168.1.20:8892`).

## Checking that it works

- The panel's **Network** tab confirms the Windows Firewall part.
- The only real test of the router part is a player **outside** your network trying to join. Ask
  a friend, or use your phone on mobile data with the game's own server browser or direct-connect.
- "Open port checker" websites mostly test TCP and are unreliable for the UDP ports most games use.

## When forwarding just won't work

Some internet providers put many homes behind one public address (called **CGNAT**). If your
router's "WAN" or "Internet" address starts with `100.64`–`100.127`, or is a private address
such as `10.x` or `192.168.x`, or it doesn't match what "what is my IP" says, no router setting
can fix it. Your options:

- ask your provider for a public IP address (often free or cheap);
- have friends connect through **Tailscale**: they install it, you share your PC with them, and they
  join using your PC's Tailscale address. No forwarding needed (see [Remote access](REMOTE_ACCESS.md));
- host the server somewhere that has a public address.

## Staying safe while ports are open

An open game port is a door anyone on the internet can knock on. To keep it uneventful:

- **Set a join password** on the server if the game supports one, and don't reuse a password you
  use anywhere else.
- **Keep the game updated.** Game servers get security fixes. The panel can check Steam for
  new versions (`Settings → Refresh rates → Check Steam for game updates`) and run an update
  from a schedule (the server's **Schedules** tab).
- **Open only what you need**, and remove a forward when you delete or retire a server.
- **Don't expose admin or RCON passwords** to players, and use [a strong, different RCON
  password](MANAGING_SERVERS.md#changing-the-rcon-password) for each server.
- Treat a server on a **shared PC** as a risk to whatever else is on that PC. If one game has a
  weakness, the server runs as your Windows account.

See also the [security checklist](SECURITY_GUIDE.md).
