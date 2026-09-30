import React from "react";
import { Alert, Box, Chip, Link, Paper, Typography } from "@mui/material";
import { api } from "../api/client";

const COLORS = { online: "success", connecting: "info", reconnecting: "warning", error: "error", off: "default" };
const LABELS = { online: "Online", connecting: "Connecting…", reconnecting: "Reconnecting…", error: "Needs attention", off: "Off" };

/** Is the Discord bot connected, and how to set it up. The settings themselves are in the Discord group above. */
function DiscordBotCard({ applicationId, refreshKey }) {
	const [state, setState] = React.useState(null);

	React.useEffect(() => {
		let alive = true;
		const load = () => api.get("/api/settings/discord-bot").then((s) => alive && setState(s)).catch(() => {});
		load();
		const timer = setInterval(load, 4000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [refreshKey]);

	if (!state) return null;
	const invite = applicationId ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(applicationId)}&scope=applications.commands` : null;

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
				<Typography variant="subtitle2">Discord bot</Typography>
				<Chip size="small" color={COLORS[state.status] ?? "default"} label={LABELS[state.status] ?? state.status} />
				{state.user && <Typography variant="body2" sx={{ color: "text.secondary" }}>as {state.user}</Typography>}
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
				{state.detail}
			</Typography>
			{state.status === "off" || state.status === "error" ? (
				<Alert severity="info">
					To set it up: create an application at the Discord developer portal, add a bot to it and copy its token into the field above, then fill in the application ID and your server's ID. Invite it to your server
					{invite ? (
						<>
							{" "}
							with <Link href={invite} target="_blank" rel="noreferrer">this link</Link>
						</>
					) : (
						" (a link appears here once the application ID is filled in)"
					)}
					. Choose an admin role in "Discord admin role" so only those people can start, stop and back up servers. With no role chosen, the bot only shows status.
				</Alert>
			) : null}
		</Paper>
	);
}

export default DiscordBotCard;
