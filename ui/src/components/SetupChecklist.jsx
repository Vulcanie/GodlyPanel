import React from "react";
import { Alert, Box, Button, Collapse, LinearProgress, Typography } from "@mui/material";
import { CheckCircle as DoneIcon, ErrorOutline as TodoIcon, ChecklistRtl as ChecklistIcon, LightbulbOutlined as TipIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { usePreferences } from "../utils/preferences";

// Older versions remembered this in the browser; it is carried onto the account the first time.
const LEGACY = [{ storageKey: "gp.checklistDismissed", pref: "checklistDismissed", read: (v) => (v === "1" ? true : undefined) }];

// How each kind of item looks: its icon, colour and the words on its small label.
const KINDS = {
	ok: { icon: <DoneIcon fontSize="small" />, color: "success.main", label: "Done" },
	todo: { icon: <TodoIcon fontSize="small" />, color: "error.main", label: "Needs doing" },
	other: { icon: <TipIcon fontSize="small" />, color: "warning.main", label: "Worth doing" },
};

/** A short list of what is worth doing for the panel as a whole, on the dashboard. Administrators only. */
function SetupChecklist({ onOpenSettings, onCreateServer }) {
	const [data, setData] = React.useState(null);
	// Kept with the account, so "Don't show again" holds in every browser and at every address.
	const [prefs, savePref] = usePreferences(LEGACY);
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		let alive = true;
		api
			.get("/api/settings/checklist")
			.then((d) => alive && setData(d))
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	const items = Array.isArray(data?.items) ? data.items : [];
	if (!data || !prefs || !(data.total > 0) || data.done === data.total || prefs.checklistDismissed) return null;

	const dismiss = () => savePref({ checklistDismissed: true });

	const go = (fix) => (fix?.to === "create" ? onCreateServer?.() : fix?.to === "settings" ? onOpenSettings?.() : undefined);

	return (
		<Box sx={{ position: "relative", overflow: "hidden", p: 2, pl: 2.5, mb: 2, borderRadius: 4, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
			<Box aria-hidden sx={{ position: "absolute", inset: "0 auto 0 0", width: 3, background: (t) => t.custom.gradient }} />
			<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
					<ChecklistIcon fontSize="small" />
					<Typography variant="subtitle2" sx={{ color: "text.primary" }}>
						Setup: {data.done} of {data.total} done
					</Typography>
				</Box>
				<LinearProgress variant="determinate" value={Math.min(100, (data.done / data.total) * 100)} sx={{ flex: 1, minWidth: 120, height: 6, borderRadius: 3, "& .MuiLinearProgress-bar": { backgroundImage: (t) => t.custom.gradient, borderRadius: 3 } }} />
				<Button size="small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
					{open ? "Hide" : "Show"}
				</Button>
				<Button size="small" color="inherit" sx={{ color: "text.secondary" }} onClick={dismiss}>
					Don't show again
				</Button>
			</Box>
			<Collapse in={open}>
				<Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
					{items.map((i) => {
						const kind = KINDS[i.status] ?? KINDS.other;
						return (
							<Box key={i.id} sx={{ display: "flex", gap: 1.5, alignItems: "center", py: 0.75, flexWrap: "wrap", borderTop: 1, borderColor: "divider" }}>
								<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 112, color: kind.color }}>
									{kind.icon}
									<Typography variant="caption" sx={{ fontWeight: 700, color: "inherit" }}>
										{kind.label}
									</Typography>
								</Box>
								<Box sx={{ flex: 1, minWidth: 200 }}>
									<Typography variant="body2">{i.title}</Typography>
									{i.detail && (
										<Typography variant="caption" sx={{ color: "text.secondary" }}>
											{i.detail}
										</Typography>
									)}
								</Box>
								{i.status !== "ok" && i.fix && (
									<Button size="small" variant="outlined" onClick={() => go(i.fix)}>
										{i.fix.to === "create" ? "Create a server" : "Open settings"}
									</Button>
								)}
							</Box>
						);
					})}
				</Box>
			</Collapse>
			{data.worst === "todo" && !open && (
				<Alert severity="warning" sx={{ mt: 1.5 }}>
					Something needs doing. Open the list to see what.
				</Alert>
			)}
		</Box>
	);
}

export default SetupChecklist;
