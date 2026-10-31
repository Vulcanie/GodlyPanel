import React from "react";
import { Button } from "@mui/material";
import { Description as ScriptIcon, DeleteForever as DeleteIcon, Window as WindowIcon } from "@mui/icons-material";
import ServerWindowPanel from "./ServerWindowPanel";
import DeleteServer from "./DeleteServer";
import ExportBundleCard from "./ExportBundleCard";
import SectionCard from "./ui/SectionCard";

/** The things you rarely need: how the server's window behaves, its start script, moving it to another PC, and removing it. */
function ServerAdvancedTab({ serverName, serverStatus, onEditBatchFiles, onDeleted }) {
	return (
		<>
			<SectionCard title="Window and launch" subtitle="Whether the server shows a console window, and what it runs" icon={<WindowIcon />} contentSx={{ p: 0 }}>
				<ServerWindowPanel serverName={serverName} />
			</SectionCard>
			<SectionCard title="Start script" subtitle="The batch file that starts this server" icon={<ScriptIcon />}>
				<Button variant="outlined" color="warning" startIcon={<ScriptIcon />} onClick={onEditBatchFiles} data-testid="edit-batch-files">
					Edit the start script
				</Button>
			</SectionCard>
			<ExportBundleCard serverName={serverName} running={Boolean(serverStatus?.online)} />
			<SectionCard title="Remove this server" subtitle="Take it out of the panel, or delete its files too" icon={<DeleteIcon />} danger>
				<DeleteServer serverName={serverName} onDeleted={onDeleted} />
			</SectionCard>
		</>
	);
}

export default ServerAdvancedTab;
