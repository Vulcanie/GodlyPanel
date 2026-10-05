import React from "react";
import { Alert, Button, IconButton } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";

// Shown to administrators on the dashboard: how the last update went (it is the first thing seen after the page reloads
// when the panel comes back as the new version), and when a newer GodlyPanel exists. A dismissed version stays dismissed;
// the next release asks again.

const DISMISSED = "gp.dismissedUpdate";
// Set while an update is under way, so a page that has just reloaded keeps looking for the verdict, which the update
// script writes a moment after the new version has started.
export const EXPECTING_UPDATE = "gp.updateExpected";
const EXPECT_FOR_MS = 40_000;

// An Alert with an action of its own has no close button of its own (MUI shows one or the other), so it is added here.
function Actions({ onClose, children }) {
	return (
		<>
			{children}
			<IconButton aria-label="Close" color="inherit" size="small" onClick={onClose}>
				<CloseIcon fontSize="small" />
			</IconButton>
		</>
	);
}

function readDismissed() {
	try {
		return localStorage.getItem(DISMISSED);
	} catch {
		return null;
	}
}

const expectedSince = () => {
	try {
		const at = Number(sessionStorage.getItem(EXPECTING_UPDATE));
		return Number.isFinite(at) && at > 0 ? at : null;
	} catch {
		return null;
	}
};
const stopExpecting = () => {
	try {
		sessionStorage.removeItem(EXPECTING_UPDATE);
	} catch {
		// Nothing to forget.
	}
};

function UpdateBanner({ onOpenSettings }) {
	const [status, setStatus] = React.useState(null);
	const [dismissed, setDismissed] = React.useState(readDismissed());

	const load = React.useCallback(() => api.get("/api/updates/panel").then(setStatus).catch(() => {}), []);

	React.useEffect(() => {
		let alive = true;
		const refresh = () => api.get("/api/updates/panel").then((s) => alive && setStatus(s)).catch(() => {});
		refresh();
		const off = onLive("activity", ({ event }) => event.type === "panel.update_available" && refresh());
		// Straight after an update: look every couple of seconds until the verdict is in (or it has been long enough).
		const timer = setInterval(async () => {
			const since = expectedSince();
			if (!since) return;
			if (Date.now() - since > EXPECT_FOR_MS) return stopExpecting();
			const s = await api.get("/api/updates/panel").catch(() => null);
			if (!alive || !s) return;
			setStatus(s);
			if (s.selfUpdate?.lastUpdate) stopExpecting();
		}, 2000);
		return () => {
			alive = false;
			off();
			clearInterval(timer);
		};
	}, []);

	const last = status?.selfUpdate?.lastUpdate;
	const available = status?.available && dismissed !== status.latest.version;
	if (!last && !available) return null;

	const dismissVersion = () => {
		try {
			localStorage.setItem(DISMISSED, status.latest.version);
		} catch {
			// Remembering is a convenience.
		}
		setDismissed(status.latest.version);
	};
	const dismissResult = async () => {
		stopExpecting();
		await api.post("/api/updates/panel/update-result/dismiss", {}).catch(() => {});
		load();
	};

	return (
		<>
			{last && (
				<Alert
					severity={last.ok ? "success" : "error"}
					sx={{ mb: 2 }}
					data-testid="update-result-banner"
					action={
						<Actions onClose={dismissResult}>
							{!last.ok && (
								<Button color="inherit" size="small" onClick={onOpenSettings}>
									Details
								</Button>
							)}
						</Actions>
					}
				>
					{last.ok ? last.message : `The update to ${last.version} didn't work and was undone: ${last.message}`}
				</Alert>
			)}
			{available && (
				<Alert
					severity="info"
					sx={{ mb: 2 }}
					action={
						<Actions onClose={dismissVersion}>
							<Button color="inherit" size="small" onClick={onOpenSettings}>
								{status.selfUpdate?.support?.ok && status.selfUpdate.plan ? "Update now…" : "See what's new"}
							</Button>
						</Actions>
					}
				>
					GodlyPanel {status.latest.version} is available (you have {status.current}).
				</Alert>
			)}
		</>
	);
}

export default UpdateBanner;
