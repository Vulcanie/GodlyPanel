import React from "react";
import { Box, Typography } from "@mui/material";
import { Info as InfoIcon, ShowChart as ChartIcon } from "@mui/icons-material";
import ServerControls from "./ServerControls";
import RconConsole from "./RconConsole";
import StatsPanel from "./StatsPanel";
import SessionEditor from "./SessionEditor";
import TagsEditor from "./TagsEditor";
import ServerLocations from "./ServerLocations";
import SectionCard from "./ui/SectionCard";
import InfoTip from "./InfoTip";
import { api } from "../api/client";

/**
 * A server at a glance: the buttons to run it, its console if the game has one, its labels, and how busy it has been.
 */
function ServerOverview({ serverName, serverStatus, isAdmin }) {
	const [hasRcon, setHasRcon] = React.useState(false);

	React.useEffect(() => {
		let alive = true;
		api
			.get(`/api/server/${encodeURIComponent(serverName)}/overview`)
			.then((r) => alive && setHasRcon(Boolean(r.hasRcon)))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [serverName]);

	return (
		<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 3fr) minmax(0, 2fr)" }, gap: 2.5, alignItems: "start" }}>
			<Box sx={{ minWidth: 0 }}>
				<ServerControls serverName={serverName} serverStatus={serverStatus} isAdmin={isAdmin} />
				{hasRcon && <RconConsole serverName={serverName} />}
				<SectionCard title="Performance" subtitle="CPU, memory and players over time" icon={<ChartIcon />}>
					<StatsPanel serverName={serverName} />
				</SectionCard>
			</Box>

			<Box sx={{ minWidth: 0 }}>
				{isAdmin && (
					<SectionCard title="Labels" icon={<InfoIcon />}>
						<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								Session label
							</Typography>
							<InfoTip id="server.session" />
						</Box>
						<SessionEditor serverName={serverName} status={serverStatus} />
						<Box sx={{ display: "flex", alignItems: "center", mb: 0.5, mt: 1 }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								Tags
							</Typography>
							<InfoTip id="server.tags" />
						</Box>
						<TagsEditor serverName={serverName} tags={serverStatus?.tags ?? []} />
					</SectionCard>
				)}
				<SectionCard title="Where it lives" subtitle="This server's folder on the PC">
					<ServerLocations only={serverName} />
				</SectionCard>
			</Box>
		</Box>
	);
}

export default ServerOverview;
