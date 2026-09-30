import React from "react";
import {
	Box,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Typography,
	Chip,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { getGameInfo } from "../gameCatalog";
import ServerTile from "./ServerTile";

function GameCard({
	gameType,
	instances,
	onNavigate,
	userRole,
	allowedServers = null,
	showOffline,
	serverStats,
	isOpen,
	onToggle,
	appearance,
}) {
	const { title, banner, gradient } = getGameInfo(gameType, appearance);

	const rows = React.useMemo(
		() => (showOffline ? instances : instances.filter((i) => i.online)),
		[instances, showOffline],
	);

	const statsByName = React.useMemo(() => {
		const map = {};
		for (const s of serverStats || []) map[s.name] = s;
		return map;
	}, [serverStats]);

	const { onlineCount, totalPlayers } = React.useMemo(() => {
		let online = 0;
		let players = 0;
		for (const i of instances) {
			if (i.online) online += 1;
			players += i.playerCount ?? 0;
		}
		return { onlineCount: online, totalPlayers: players };
	}, [instances]);

	if (rows.length === 0) return null;

	// Administrators and moderators open a server; a moderator limited to some
	// servers opens only those.
	const operator = userRole === "admin" || userRole === "moderator";

	return (
		<Accordion
			expanded={isOpen}
			onChange={onToggle}
			disableGutters
			elevation={0}
			sx={{
				transition: "box-shadow 0.2s ease",
				"&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.4)" },
			}}
		>
			<AccordionSummary
				expandIcon={
					<ExpandMoreIcon
						sx={{
							color: "#fff",
							bgcolor: "rgba(0,0,0,0.35)",
							borderRadius: "50%",
						}}
					/>
				}
				sx={{ minHeight: 120, "&.Mui-expanded": { minHeight: 120 } }}
			>
				<Box
					sx={{
						position: "relative",
						height: 120,
						width: "100%",
						overflow: "hidden",
					}}
				>
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							// Gradient sits underneath the artwork, so if the
							// image can't be fetched (no internet on a fresh
							// install) the card still looks deliberate rather
							// than blank.
							backgroundImage: banner ? `url(${banner}), ${gradient}` : gradient,
							backgroundSize: "cover",
							backgroundPosition: "center",
							transition: "transform 0.3s ease",
							".MuiAccordion-root:hover &": {
								transform: "scale(1.03)",
							},
						}}
					/>
					<Box
						sx={{
							position: "absolute",
							inset: 0,
							background:
								"linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)",
						}}
					/>
					<Typography
						variant="h5"
						sx={{
							position: "absolute",
							left: 16,
							bottom: 12,
							color: "white",
							fontWeight: 600,
							textShadow: "0 1px 4px rgba(0,0,0,0.6)",
						}}
					>
						{title}
					</Typography>
					<Box sx={{ position: "absolute", right: 56, bottom: 12, display: "flex", gap: 1 }}>
						<Chip
							size="small"
							label={`${onlineCount}/${instances.length} online`}
							sx={{
								bgcolor: onlineCount > 0 ? "rgba(46,125,50,0.85)" : "rgba(0,0,0,0.5)",
								color: "white",
							}}
						/>
						{totalPlayers > 0 && (
							<Chip
								size="small"
								label={`${totalPlayers} players`}
								sx={{ bgcolor: "rgba(0,0,0,0.5)", color: "white" }}
							/>
						)}
					</Box>
				</Box>
			</AccordionSummary>

			<AccordionDetails sx={{ p: 0 }}>
				{rows.map((srv) => (
					<ServerTile
						key={srv.name}
						srv={srv}
						stats={statsByName[srv.name]}
						clickable={operator && (!allowedServers || allowedServers.includes(srv.name))}
						onClick={operator && (!allowedServers || allowedServers.includes(srv.name)) ? () => onNavigate(srv.name) : undefined}
					/>
				))}
			</AccordionDetails>
		</Accordion>
	);
}

export default React.memo(GameCard);
