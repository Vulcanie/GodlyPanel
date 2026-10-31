import React from "react";
import { Box, Tab, Tabs } from "@mui/material";
import ServerHeader from "./ServerHeader";
import ServerOverview from "./ServerOverview";
import ServerSettingsTab from "./ServerSettingsTab";
import ServerNetworkTab from "./ServerNetworkTab";
import ServerAdvancedTab from "./ServerAdvancedTab";
import BackupsPanel from "./BackupsPanel";
import SchedulesPanel from "./SchedulesPanel";
import LogsPanel from "./LogsPanel";
import PlayersPanel from "./PlayersPanel";
import ModsPanel from "./ModsPanel";
import FilesPanel from "./FilesPanel";
import ActivityPanel from "./ActivityPanel";
import AutomationPanel from "./AutomationPanel";
import { serverTabs, DEFAULT_TAB } from "../serverTabs";
import { useSession } from "../SessionContext";

const REMEMBER = "gp.serverTab";

/**
 * Everything about one server: its header (status, join details, Start/Stop/Restart) and tabs for each thing you do with it.
 * Administrators get all of them; anyone else gets the ones their permissions reach on this server.
 */
function ServerWorkspace({ serverName, serverStatus, serverStats, servers, appearance, userRole, tab, onTab, onBack, onEditBatchFiles, onOpenServer, onAction }) {
	const isAdmin = userRole === "admin";
	const { can } = useSession();
	const tabs = React.useMemo(() => serverTabs(isAdmin, (permission) => can(permission, serverName)), [isAdmin, can, serverName]);
	const serverNames = React.useMemo(() => Object.keys(servers ?? {}), [servers]);

	// The tab from the address/history, else the one last used this visit, else the first.
	const remembered = React.useMemo(() => {
		try {
			return sessionStorage.getItem(REMEMBER);
		} catch {
			return null;
		}
	}, []);
	const wanted = tab ?? remembered ?? DEFAULT_TAB;
	// With no tab at all (no permission reaches this server), nothing below renders; an empty list must not crash here.
	const active = tabs.some((t) => t.key === wanted) ? wanted : tabs[0]?.key;

	const choose = (key) => {
		onTab(key);
		try {
			sessionStorage.setItem(REMEMBER, key);
		} catch {
			// Remembering the tab is a convenience.
		}
	};

	return (
		<Box>
			<ServerHeader serverName={serverName} status={serverStatus} stats={serverStats} appearance={appearance?.[(serverStatus?.type || "").toLowerCase()]} onAction={onAction} canControl={can("server.control", serverName)} isAdmin={isAdmin} />

			<Box
				sx={{
					position: "sticky",
					top: 56,
					zIndex: (t) => t.zIndex.appBar - 1,
					mx: { xs: -2, md: -4 },
					px: { xs: 2, md: 4 },
					mb: 2.5,
					backdropFilter: "blur(14px)",
					backgroundColor: (t) => t.custom.glass,
					borderBottom: 1,
					borderColor: "divider",
				}}
			>
				<Tabs value={active} onChange={(_, v) => choose(v)} variant="scrollable" scrollButtons="auto" aria-label="Server pages">
					{tabs.map((t) => (
						<Tab key={t.key} value={t.key} label={t.label} data-testid={`tab-${t.key}`} />
					))}
				</Tabs>
			</Box>

			{active === "overview" && <ServerOverview serverName={serverName} serverStatus={serverStatus} isAdmin={isAdmin} />}
			{active === "settings" && <ServerSettingsTab serverName={serverName} serverStatus={serverStatus} onEditBatchFiles={onEditBatchFiles} onAction={onAction} />}
			{active === "players" && <PlayersPanel serverName={serverName} />}
			{active === "backups" && <BackupsPanel serverName={serverName} serverStatus={serverStatus} canManage={isAdmin} />}
			{active === "schedules" && <SchedulesPanel serverName={serverName} serverNames={serverNames} canManage={isAdmin} />}
			{active === "logs" && <LogsPanel serverName={serverName} />}
			{active === "network" && <ServerNetworkTab serverName={serverName} isAdmin={isAdmin} />}
			{active === "mods" && <ModsPanel serverName={serverName} serverStatus={serverStatus} />}
			{active === "files" && <FilesPanel serverName={serverName} isAdmin={isAdmin} can={can} />}
			{active === "activity" && <ActivityPanel serverName={serverName} />}
			{active === "automation" && <AutomationPanel serverName={serverName} serverStatus={serverStatus} onCloned={onOpenServer} />}
			{active === "advanced" && <ServerAdvancedTab serverName={serverName} onEditBatchFiles={onEditBatchFiles} onDeleted={onBack} />}
		</Box>
	);
}

export default ServerWorkspace;
