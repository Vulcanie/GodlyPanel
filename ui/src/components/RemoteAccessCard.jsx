import React from "react";
import { Alert, Box, Chip, Link, Paper, Typography } from "@mui/material";
import { api } from "../api/client";

/**
 * How to open the panel from another device or away from home. The panel only answers on the
 * local network and mesh VPNs (Tailscale, ZeroTier) — it is never put on the open internet —
 * so the safe ways in are to be on the network, or to join it from outside with a mesh VPN.
 */
function RemoteAccessCard() {
	const [info, setInfo] = React.useState(null);
	React.useEffect(() => {
		api.get("/api/settings/access").then(setInfo).catch(() => {});
	}, []);
	if (!info) return null;
	const mesh = info.addresses.filter((a) => a.mesh);
	const lan = info.addresses.filter((a) => !a.mesh);

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Typography variant="subtitle2" sx={{ mb: 1 }}>
				Opening the panel from another device
			</Typography>
			{!info.bindAll ? (
				<Alert severity="warning" sx={{ mb: 1 }}>
					Only this PC can open the panel right now. Turn on "Allow access from your network" above, then restart the panel.
				</Alert>
			) : (
				<>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
						On the same network (Wi-Fi or cable), open one of these in a browser on the phone or other PC:
					</Typography>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
						{lan.length === 0 && <Typography variant="body2">No network address found on this PC.</Typography>}
						{lan.map((a) => (
							<Typography key={a.address} variant="body2" sx={{ fontFamily: "monospace" }}>
								{a.url} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({a.name})</Typography>
							</Typography>
						))}
						{mesh.map((a) => (
							<Typography key={a.address} variant="body2" sx={{ fontFamily: "monospace" }}>
								{a.url} <Chip size="small" label="mesh VPN" sx={{ ml: 0.5, height: 18 }} />
							</Typography>
						))}
					</Box>
				</>
			)}
			<Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
				From away from home
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				Don't forward the panel's port on your router: anyone on the internet could then reach a login page that controls your servers. Instead put this PC and your phone on a private mesh network. The easiest is{" "}
				<Link href="https://tailscale.com/download" target="_blank" rel="noreferrer">Tailscale</Link> (free for personal use): install it on this PC and on your phone, sign in to both with the same account, then open{" "}
				{mesh[0] ? <code>{mesh[0].url}</code> : <code>http://100.x.y.z:{info.port}/</code>} on the phone. {info.allowCgnat ? "The panel already accepts these addresses." : 'Turn on "Allow mesh VPN addresses" above first.'} ZeroTier works the same way. Friends who only want to see status don't need any of this: they can use the Discord bot.
			</Typography>
		</Paper>
	);
}

export default RemoteAccessCard;
