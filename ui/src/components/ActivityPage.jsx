import React from "react";
import { Button } from "@mui/material";
import { Download as DownloadIcon, Timeline as ActivityIcon } from "@mui/icons-material";
import ActivityPanel from "./ActivityPanel";
import PageHeader from "./ui/PageHeader";

/** Everything that has happened on the panel, newest first. Administrators can take the whole log away as a file. */
function ActivityPage({ isAdmin }) {
	return (
		<>
			<PageHeader
				icon={<ActivityIcon />}
				title="Activity"
				subtitle={isAdmin ? "Every sign-in and every change anyone made, and everything that happened to your servers." : "What has happened to your servers."}
				actions={
					isAdmin && (
						<>
							<Button size="small" variant="outlined" startIcon={<DownloadIcon />} href="/api/activity/export?format=csv" download>
								Export CSV
							</Button>
							<Button size="small" variant="outlined" startIcon={<DownloadIcon />} href="/api/activity/export?format=jsonl" download>
								Export JSON Lines
							</Button>
						</>
					)
				}
			/>
			<ActivityPanel limit={300} />
		</>
	);
}

export default ActivityPage;
