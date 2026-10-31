import React from "react";
import { Alert, Box, Chip, Link, Typography } from "@mui/material";
import { api } from "../api/client";
import { t, useT } from "../i18n";
import { rich } from "../i18n/rich";
import InfoTip from "./InfoTip";
import SectionCard from "./ui/SectionCard";

const COLORS = { online: "success", connecting: "info", reconnecting: "warning", error: "error", off: "default" };

const statusLabel = (status) =>
	({
		online: t("common.online"),
		connecting: t("discord.connecting"),
		reconnecting: t("discord.reconnecting"),
		error: t("common.needsAttention"),
		off: t("common.off"),
	})[status] ?? status;

/** Is the Discord bot connected, and the link to invite it. The settings themselves are in the Discord section above. */
function DiscordBotCard({ applicationId, refreshKey }) {
	useT();
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
					{t("discord.botTitle")}
					<InfoTip id="card.discordBot" />
				</Box>
			}
			actions={<Chip size="small" color={COLORS[state.status] ?? "default"} label={statusLabel(state.status)} />}
		>
			<Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
				{state.user && <Typography variant="body2" sx={{ fontWeight: 600 }}>{t("discord.as", { name: state.user })}</Typography>}
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{state.detail}
				</Typography>
			</Box>
			{state.status === "off" || state.status === "error" ? (
				<Alert severity="info" sx={{ mt: 1.5 }}>
					{invite
						? rich(t("discord.inviteLink"), { link: <Link href={invite} target="_blank" rel="noreferrer">{t("discord.thisLink")}</Link> })
						: t("discord.inviteNoLink")}
				</Alert>
			) : null}
		</SectionCard>
	);
}

export default DiscordBotCard;
