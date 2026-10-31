import React from "react";
import { Alert, Button, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Close as CloseIcon, RocketLaunch as UpdateIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { onLive } from "../liveEvents";
import { usePreferences } from "../utils/preferences";
import { t, useT } from "../i18n";

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
	useT();
	return (
		<>
			{children}
			<IconButton aria-label={t("common.close")} color="inherit" size="small" onClick={onClose}>
				<CloseIcon fontSize="small" />
			</IconButton>
		</>
	);
}

// Older versions remembered this in the browser; it is carried onto the account the first time.
const LEGACY = [{ storageKey: DISMISSED, pref: "updateBannerDismissed", read: (v) => (v ? v : undefined) }];

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
	useT();
	const [status, setStatus] = React.useState(null);
	const [prefs, savePref] = usePreferences(LEGACY);
	const dismissed = prefs?.updateBannerDismissed ?? null;

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
	const latestVersion = status?.latest?.version;
	const available = prefs !== null && status?.available && Boolean(latestVersion) && dismissed !== latestVersion;
	if (!last && !available) return null;

	const dismissVersion = () => savePref({ updateBannerDismissed: latestVersion });
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
					variant="outlined"
					sx={{ mb: 2, bgcolor: (t) => alpha(last.ok ? t.palette.success.main : t.palette.error.main, 0.08), alignItems: "center" }}
					data-testid="update-result-banner"
					action={
						<Actions onClose={dismissResult}>
							{!last.ok && (
								<Button color="inherit" size="small" onClick={onOpenSettings}>
									{t("updateBanner.details")}
								</Button>
							)}
						</Actions>
					}
				>
					{last.ok ? last.message : t("updateBanner.failed", { version: last.version, message: last.message })}
				</Alert>
			)}
			{available && (
				<Alert
					severity="info"
					icon={<UpdateIcon />}
					variant="outlined"
					sx={{ mb: 2, alignItems: "center", borderColor: (t) => alpha(t.palette.primary.main, 0.45), color: "text.primary", background: (t) => t.custom.gradientSoft, "& .MuiAlert-icon": { color: "primary.main" }, "& .MuiAlert-action": { alignItems: "center", pt: 0 } }}
					action={
						<Actions onClose={dismissVersion}>
							<Button color="inherit" size="small" onClick={onOpenSettings}>
								{status.selfUpdate?.support?.ok && status.selfUpdate.plan ? t("updateBanner.updateNow") : t("updateBanner.seeWhatsNew")}
							</Button>
						</Actions>
					}
				>
					<strong>{t("updateBanner.available", { version: latestVersion })}</strong> {t("updateBanner.youHave", { current: status.current })}
				</Alert>
			)}
		</>
	);
}

export default UpdateBanner;
