import React from "react";
import { Box, Button, Chip, Tab, Tabs, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import ConfigPage from "./ConfigPage";
import ServerControls from "./ServerControls";
import BackupsPanel from "./BackupsPanel";
import SchedulesPanel from "./SchedulesPanel";
import LogsPanel from "./LogsPanel";
import PlayersPanel from "./PlayersPanel";
import ModsPanel from "./ModsPanel";
import ActivityPanel from "./ActivityPanel";
import AutomationPanel from "./AutomationPanel";
import ConfigHistoryPanel from "./ConfigHistoryPanel";
import StatsPanel from "./StatsPanel";
import TagsEditor from "./TagsEditor";
import NetworkPanel from "./NetworkPanel";
import { useOperation, operationLabel } from "../OperationsContext";

/**
 * Everything about one server, in tabs. Administrators get the settings page and
 * the management tabs; a moderator gets the controls and the day-to-day ones.
 */
function ServerWorkspace({ serverName, serverStatus, servers, userRole, onBack, onEditBatchFiles, onOpenServer }) {
	const isAdmin = userRole === "admin";
	const operation = useOperation(serverName);
	const serverNames = React.useMemo(() => Object.keys(servers ?? {}), [servers]);

	const tabs = React.useMemo(
		() =>
			[
				isAdmin ? { key: "settings", label: "Settings" } : { key: "controls", label: "Controls" },
				{ key: "backups", label: "Backups" },
				{ key: "schedules", label: "Schedules" },
				{ key: "logs", label: "Logs" },
				{ key: "players", label: "Players" },
				{ key: "stats", label: "Stats" },
				{ key: "network", label: "Network" },
				isAdmin && { key: "mods", label: "Mods" },
				{ key: "activity", label: "Activity" },
				isAdmin && { key: "history", label: "History" },
				isAdmin && { key: "automation", label: "Automation" },
			].filter(Boolean),
		[isAdmin],
	);

	const [tab, setTab] = React.useState(() => {
		try {
			return sessionStorage.getItem("gp.serverTab") || tabs[0].key;
		} catch {
			return tabs[0].key;
		}
	});
	const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
	const choose = (key) => {
		setTab(key);
		try {
			sessionStorage.setItem("gp.serverTab", key);
		} catch {
			// Remembering the tab is a convenience.
		}
	};

	const online = Boolean(serverStatus?.online);

	return (
		<Box sx={{ mt: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1, flexWrap: "wrap" }}>
				<Button startIcon={<ArrowBackIcon />} onClick={onBack}>
					Back to Dashboard
				</Button>
				<Typography variant="h5" sx={{ mr: 1 }}>
					{serverName}
				</Typography>
				<Chip size="small" label={online ? "Online" : "Offline"} color={online ? "success" : "default"} />
				{operation && <Chip size="small" color="info" variant="outlined" label={operationLabel(operation)} />}
				{isAdmin && (
					<Button sx={{ ml: "auto" }} variant="outlined" size="small" color="warning" onClick={onEditBatchFiles}>
						Edit Batch Files
					</Button>
				)}
			</Box>

			{isAdmin && <TagsEditor serverName={serverName} tags={serverStatus?.tags ?? []} />}

			<Tabs value={active} onChange={(_, v) => choose(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				{tabs.map((t) => (
					<Tab key={t.key} value={t.key} label={t.label} />
				))}
			</Tabs>

			{active === "settings" && <ConfigPage embedded serverName={serverName} serverStatus={serverStatus} onBack={onBack} userRole={userRole} onEditBatchFiles={onEditBatchFiles} />}
			{active === "controls" && <ServerControls serverName={serverName} serverStatus={serverStatus} />}
			{active === "backups" && <BackupsPanel serverName={serverName} serverStatus={serverStatus} canManage={isAdmin} />}
			{active === "schedules" && <SchedulesPanel serverName={serverName} serverNames={serverNames} canManage={isAdmin} />}
			{active === "logs" && <LogsPanel serverName={serverName} />}
			{active === "players" && <PlayersPanel serverName={serverName} />}
			{active === "stats" && <StatsPanel serverName={serverName} />}
			{active === "network" && <NetworkPanel serverName={serverName} canChangeFirewall={isAdmin} />}
			{active === "mods" && <ModsPanel serverName={serverName} serverStatus={serverStatus} />}
			{active === "activity" && <ActivityPanel serverName={serverName} />}
			{active === "history" && <ConfigHistoryPanel serverName={serverName} serverStatus={serverStatus} />}
			{active === "automation" && <AutomationPanel serverName={serverName} serverStatus={serverStatus} onCloned={onOpenServer} />}
		</Box>
	);
}

export default ServerWorkspace;
