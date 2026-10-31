import React from "react";
import { Alert, Box, Button, TextField } from "@mui/material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { t, useT } from "../i18n";

/**
 * The text a server shows as its "Session" on the dashboard and in Discord. Left blank it is automatic: the public address
 * (Settings → Network) and the game port, which follows the port by itself. Typing something replaces it. This is a label only; it
 * doesn't rename the server inside the game. Administrators only.
 */
function SessionEditor({ serverName, status }) {
	useT();
	const toast = useToast();
	const automatic = status?.joinAddress ?? "";
	const fromStatus = status?.sessionLabel ?? "";
	// What was just saved, shown until the live status (which refreshes every few seconds) catches up.
	const [saved, setSaved] = React.useState(null);
	const stored = saved ?? fromStatus;
	const [draft, setDraft] = React.useState(stored);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState(null);

	// Another server starts with none of this one's pending value (its label may happen to be the same, so the label alone is no signal).
	React.useEffect(() => {
		setSaved(null);
		setError(null);
	}, [fromStatus, serverName]);
	// Follow the server's own value when it changes (another browser, or a save landing).
	React.useEffect(() => setDraft(stored), [stored, serverName]);

	const save = async (value) => {
		if (value.trim() === stored.trim()) return;
		setSaving(true);
		setError(null);
		try {
			const r = await api.put(`/api/server/${encodeURIComponent(serverName)}/session`, { sessionLabel: value });
			setSaved(r.sessionLabel ?? "");
			toast(r.sessionLabel ? t("session.saved") : t("session.automatic"));
		} catch (e) {
			setError(e.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
			<TextField
				size="small"
				variant="standard"
				value={draft}
				placeholder={automatic ? t("session.automaticAddr", { address: automatic }) : t("session.placeholder")}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => save(draft)}
				onKeyDown={(e) => e.key === "Enter" && save(draft)}
				disabled={saving}
				inputProps={{ "aria-label": t("session.label"), maxLength: 100 }}
				sx={{ minWidth: { xs: 0, sm: 280 }, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}
			/>
			{stored && (
				<Button size="small" onClick={() => save("")} disabled={saving}>
					{automatic ? t("session.useAutoAddr", { address: automatic }) : t("session.useAuto")}
				</Button>
			)}
			{error && (
				<Alert severity="warning" onClose={() => setError(null)} sx={{ py: 0 }}>
					{error}
				</Alert>
			)}
		</Box>
	);
}

export default SessionEditor;
