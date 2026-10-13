import React from "react";
import { Alert, Box, Chip, Link, Typography } from "@mui/material";
import { api } from "../api/client";
import InfoTip from "./InfoTip";
import SectionCard from "./ui/SectionCard";

/**
 * How to open the panel from another device or away from home. The panel only answers on the
 * local network and mesh VPNs (Tailscale, ZeroTier) — it is never put on the open internet —
 * so the safe ways in are to be on the network, or to join it from outside with a mesh VPN.
 * The longer explanation is behind the (i).
 */
function RemoteAccessCard() {
	const [info, setInfo] = React.useState(null);
	React.useEffect(() => {
		api.get("/api/settings/access").then(setInfo).catch(() => {});
	}, []);
	if (!info) return null;
	const mesh = info.addresses.filter((a) => a.mesh);
	const lan = info.addresses.filter((a) => !a.mesh);
	const ts = info.tailscale;
	const tsHost = ts?.running ? ts.dnsName || ts.ips?.[0] : null;
	const tsUrl = tsHost ? `http://${tsHost}:${info.port}/` : mesh[0]?.url ?? null;

	const address = (a, tag) => (
		<Box key={a.address} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
			<Typography variant="body2" sx={{ fontFamily: (t) => t.custom.mono, wordBreak: "break-all" }}>
				{a.url}
			</Typography>
			{tag ?? (
				<Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
					{a.name}
				</Typography>
			)}
		</Box>
	);

	return (
		<SectionCard title={<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>Opening the panel from another device<InfoTip id="card.remoteAccess" /></Box>}>
			{!info.bindAll ? (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Only this PC can open the panel right now. Turn on "Allow access from your network" under General, Access, then restart the panel.
				</Alert>
			) : (
				<Box sx={{ mb: 2 }}>
					<Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
						On this network
					</Typography>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
						{lan.length === 0 && <Typography variant="body2">No network address found on this PC.</Typography>}
						{lan.map((a) => address(a))}
						{mesh.map((a) => address(a, <Chip size="small" label="mesh VPN" sx={{ height: 20 }} />))}
					</Box>
				</Box>
			)}

			<Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
				Away from home, and for friends
			</Typography>
			{ts && (
				<Alert severity={!ts.installed ? "info" : ts.running ? "success" : "warning"} sx={{ mb: 1.5 }}>
					{!ts.installed
						? "Tailscale isn't installed on this PC yet."
						: ts.running
							? `Tailscale is connected on this PC as ${ts.dnsName ?? ts.ips[0]}. Open ${tsUrl} from a device on your Tailscale network.`
							: ts.state === "NeedsLogin"
								? "Tailscale is installed but needs signing in. Open it from the tray and sign in."
								: "Tailscale is installed but isn't connected. Open it from the tray and turn it on."}
				</Alert>
			)}
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				Don't forward the panel's port on your router. Use a private mesh network such as{" "}
				<Link href="https://tailscale.com/download" target="_blank" rel="noreferrer">
					Tailscale
				</Link>{" "}
				instead, then open {tsUrl ? <code>{tsUrl}</code> : <code>http://100.x.y.z:{info.port}/</code>}.{" "}
				{info.allowCgnat ? "The panel already accepts these addresses." : 'Turn on "Allow mesh VPN addresses" under General, Access first.'}
			</Typography>
		</SectionCard>
	);
}

export default RemoteAccessCard;
