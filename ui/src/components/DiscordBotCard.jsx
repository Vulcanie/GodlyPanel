import React from "react";
import { Alert, Box, Chip, Link, Typography } from "@mui/material";
import { api } from "../api/client";
import InfoTip from "./InfoTip";
import SectionCard from "./ui/SectionCard";

const COLORS = { online: "success", connecting: "info", reconnecting: "warning", error: "error", off: "default" };
const LABELS = { online: "Online", connecting: "Connecting…", reconnecting: "Reconnecting…", error: "Needs attention", off: "Off" };

/** Is the Discord bot connected, and the link to invite it. The settings themselves are in the Discord section above. */
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
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					Discord bot
					<InfoTip id="card.discordBot" />
				</Box>
			}
			actions={<Chip size="small" color={COLORS[state.status] ?? "default"} label={LABELS[state.status] ?? state.status} />}
		>
			<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
				{state.user && <Typography variant="body2" sx={{ fontWeight: 600 }}>as {state.user}</Typography>}
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{state.detail}
				</Typography>
			</Box>
			{state.status === "off" || state.status === "error" ? (
				<Alert severity="info" sx={{ mt: 1.5 }}>
					Fill in the bot token, application ID and server ID in the Discord section above, then invite the bot
					{invite ? (
						<>
							{" "}
							with <Link href={invite} target="_blank" rel="noreferrer">this link</Link>
						</>
					) : (
						" (a link appears here once the application ID is filled in)"
					)}
					. Choose an admin role so only those people can start, stop and back up servers; with no role chosen, the bot only shows status.
				</Alert>
			) : null}
		</SectionCard>
	);
}

export default DiscordBotCard;
