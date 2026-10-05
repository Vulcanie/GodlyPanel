import React from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";

const COLOURS = { info: "default", warn: "warning", error: "error" };

const TYPE_LABELS = {
	"server.crashed": "Crashed",
	"server.restarted.auto": "Auto-restart",
	"server.restarted.scheduled": "Scheduled restart",
	"server.recovered": "Recovered",
	"server.gave_up": "Gave up",
	"server.unresponsive": "Not answering",
	"server.autostarted": "Started with panel",
	"server.cloned": "Cloned",
	"backup.completed": "Backup",
	"backup.failed": "Backup failed",
	"backup.restored": "Restored",
	"backup.restart_failed": "Restart failed",
	"backup.deleted": "Backup deleted",
	"schedule.ran": "Schedule",
	"schedule.failed": "Schedule failed",
	"schedule.skipped": "Schedule skipped",
	"disk.low": "Disk space",
	"panel.update_available": "Update available",
	"panel.updating": "Updating",
	"panel.updated": "Updated",
	"panel.update_failed": "Update failed",
	"mods.installed": "Mods",
	"mods.removed": "Mods",
	"preset.saved": "Preset",
	"preset.applied": "Preset",
};

const label = (type) => TYPE_LABELS[type] ?? type;

/** What has happened, newest first, and updating live. One server, or all of them. */
function ActivityPanel({ serverName = null, limit = 100 }) {
	const [events, setEvents] = React.useState(null);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		let alive = true;
		const query = `limit=${limit}${serverName ? `&server=${encodeURIComponent(serverName)}` : ""}`;
		api
			.get(`/api/activity?${query}`)
			.then((list) => alive && setEvents(list))
			.catch((e) => alive && setError(e.message));
		const off = onLive("activity", ({ event }) => {
			if (serverName && event.server !== serverName) return;
			setEvents((prev) => [event, ...(prev ?? [])].slice(0, limit));
		});
		return () => {
			alive = false;
			off();
		};
	}, [serverName, limit]);

	if (!events) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (events.length === 0) {
		return (
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				Nothing has happened yet. Crashes, restarts, backups, updates and scheduled tasks are listed here.
			</Typography>
		);
	}

	return (
		<Paper>
			{events.map((e, i) => (
				<Box key={`${e.t}-${i}`} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", px: 2, py: 1.1, borderTop: i === 0 ? 0 : (t) => `1px solid ${t.palette.divider}` }}>
					<Typography variant="caption" sx={{ color: "text.secondary", minWidth: 130, pt: 0.3 }}>
						{new Date(e.t).toLocaleString()}
					</Typography>
					<Chip size="small" variant="outlined" color={COLOURS[e.level] ?? "default"} label={label(e.type)} sx={{ minWidth: 110 }} />
					<Typography variant="body2" sx={{ flex: 1 }}>
						{!serverName && e.server ? <strong>{e.server}: </strong> : null}
						{e.message}
					</Typography>
				</Box>
			))}
		</Paper>
	);
}

export default ActivityPanel;
