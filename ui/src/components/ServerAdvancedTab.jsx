import React from "react";
import { Button } from "@mui/material";
import { Description as ScriptIcon, DeleteForever as DeleteIcon, Window as WindowIcon } from "@mui/icons-material";
import ServerWindowPanel from "./ServerWindowPanel";
import DeleteServer from "./DeleteServer";
import ExportBundleCard from "./ExportBundleCard";
import SectionCard from "./ui/SectionCard";
import { t, useT } from "../i18n";

/** The things you rarely need: how the server's window behaves, its start script, moving it to another PC, and removing it. */
function ServerAdvancedTab({ serverName, serverStatus, onEditBatchFiles, onDeleted }) {
	// Re-renders this tab when the language changes, so the t() text below switches with it.
	useT();
	return (
		<>
			<SectionCard title={t("server.windowLaunch")} subtitle={t("server.windowLaunchSub")} icon={<WindowIcon />} contentSx={{ p: 0 }}>
				<ServerWindowPanel serverName={serverName} />
			</SectionCard>
			<SectionCard title={t("server.startScript")} subtitle={t("server.startScriptSub")} icon={<ScriptIcon />}>
				<Button variant="outlined" color="warning" startIcon={<ScriptIcon />} onClick={onEditBatchFiles} data-testid="edit-batch-files">
					{t("server.editStartScript")}
				</Button>
			</SectionCard>
			<ExportBundleCard serverName={serverName} running={Boolean(serverStatus?.online)} />
			<SectionCard title={t("server.remove")} subtitle={t("server.removeSub")} icon={<DeleteIcon />} danger>
				<DeleteServer serverName={serverName} onDeleted={onDeleted} />
			</SectionCard>
		</>
	);
}

export default ServerAdvancedTab;
