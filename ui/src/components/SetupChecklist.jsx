import React from "react";
import { Alert, Box, Button, Chip, Collapse, LinearProgress, Paper, Typography } from "@mui/material";
import { api } from "../api/client";
import { usePreferences } from "../utils/preferences";

// Older versions remembered this in the browser; it is carried onto the account the first time.
const LEGACY = [{ storageKey: "gp.checklistDismissed", pref: "checklistDismissed", read: (v) => (v === "1" ? true : undefined) }];

/** A short list of what is worth doing for the panel as a whole, on the dashboard. Administrators only. */
function SetupChecklist({ onOpenSettings, onCreateServer }) {
	const [data, setData] = React.useState(null);
	// Kept with the account, so "Don't show again" holds in every browser and at every address.
	const [prefs, savePref] = usePreferences(LEGACY);
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		api.get("/api/settings/checklist").then(setData).catch(() => {});
	}, []);
	if (!data || !prefs || data.done === data.total || prefs.checklistDismissed) return null;

	const dismiss = () => savePref({ checklistDismissed: true });

	const go = (fix) => (fix?.to === "create" ? onCreateServer?.() : fix?.to === "settings" ? onOpenSettings?.() : undefined);

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Typography variant="subtitle2">
					Setup: {data.done} of {data.total} done
				</Typography>
				<LinearProgress variant="determinate" value={(data.done / data.total) * 100} sx={{ flex: 1, minWidth: 120, height: 6, borderRadius: 3 }} />
				<Button size="small" onClick={() => setOpen((o) => !o)}>
					{open ? "Hide" : "Show"}
				</Button>
				<Button size="small" onClick={dismiss}>
					Don't show again
				</Button>
			</Box>
			<Collapse in={open}>
				<Box sx={{ mt: 1.5 }}>
					{data.items.map((i) => (
						<Box key={i.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", py: 0.6, flexWrap: "wrap" }}>
							<Chip size="small" color={i.status === "ok" ? "success" : i.status === "todo" ? "error" : "warning"} variant={i.status === "ok" ? "filled" : "outlined"} label={i.status === "ok" ? "Done" : i.status === "todo" ? "Needs doing" : "Worth doing"} sx={{ minWidth: 92 }} />
							<Box sx={{ flex: 1, minWidth: 200 }}>
								<Typography variant="body2">{i.title}</Typography>
								{i.detail && (
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{i.detail}
									</Typography>
								)}
							</Box>
							{i.status !== "ok" && i.fix && (
								<Button size="small" onClick={() => go(i.fix)}>
									{i.fix.to === "create" ? "Create a server" : "Open settings"}
								</Button>
							)}
						</Box>
					))}
				</Box>
			</Collapse>
			{data.worst === "todo" && !open && (
				<Alert severity="warning" sx={{ mt: 1 }}>
					Something needs doing. Open the list to see what.
				</Alert>
			)}
		</Paper>
	);
}

export default SetupChecklist;
