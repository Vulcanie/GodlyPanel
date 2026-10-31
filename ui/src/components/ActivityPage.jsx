import React from "react";
import { Button } from "@mui/material";
import { Download as DownloadIcon, Timeline as ActivityIcon } from "@mui/icons-material";
import ActivityPanel from "./ActivityPanel";
import PageHeader from "./ui/PageHeader";
import { t, useT } from "../i18n";

/** Everything that has happened on the panel, newest first. Administrators can take the whole log away as a file. */
function ActivityPage({ isAdmin }) {
	// Re-renders this page when the language changes, so the t() text below switches with it.
	useT();
	return (
		<>
			<PageHeader
				icon={<ActivityIcon />}
				title={t("activity.title")}
				subtitle={isAdmin ? t("activity.subtitleAdmin") : t("activity.subtitleUser")}
				actions={
					isAdmin && (
						<>
							<Button size="small" variant="outlined" startIcon={<DownloadIcon />} href="/api/activity/export?format=csv" download>
								{t("activity.exportCsv")}
							</Button>
							<Button size="small" variant="outlined" startIcon={<DownloadIcon />} href="/api/activity/export?format=jsonl" download>
								{t("activity.exportJsonl")}
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
