import React from "react";
import { Alert, Button } from "@mui/material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";

// Shown to administrators on the dashboard when a newer GodlyPanel exists. A
// dismissed version stays dismissed; the next release asks again.

const DISMISSED = "gp.dismissedUpdate";

function readDismissed() {
	try {
		return localStorage.getItem(DISMISSED);
	} catch {
		return null;
	}
}

function UpdateBanner({ onOpenSettings }) {
	const [status, setStatus] = React.useState(null);
	const [dismissed, setDismissed] = React.useState(readDismissed());

	React.useEffect(() => {
		let alive = true;
		const load = () => api.get("/api/updates/panel").then((s) => alive && setStatus(s)).catch(() => {});
		load();
		const off = onLive("activity", ({ event }) => event.type === "panel.update_available" && load());
		return () => {
			alive = false;
			off();
		};
	}, []);

	if (!status?.available || dismissed === status.latest.version) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(DISMISSED, status.latest.version);
		} catch {
			// Remembering is a convenience.
		}
		setDismissed(status.latest.version);
	};

	return (
		<Alert
			severity="info"
			sx={{ mb: 2 }}
			onClose={dismiss}
			action={
				<Button color="inherit" size="small" onClick={onOpenSettings}>
					See what's new
				</Button>
			}
		>
			GodlyPanel {status.latest.version} is available (you have {status.current}).
		</Alert>
	);
}

export default UpdateBanner;
