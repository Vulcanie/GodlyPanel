import React from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { api } from "../api/client";
import InfoTip from "./InfoTip";

/** Which events send a notification, and a button that sends a real test through every channel that is set up. */
function NotificationEvents({ labels, value, onChange }) {
	const [result, setResult] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const selected = new Set(value ?? []);

	const toggle = (type, on) => {
		const next = new Set(selected);
		if (on) next.add(type);
		else next.delete(type);
		onChange([...next]);
	};

	const test = async () => {
		setBusy(true);
		try {
			setResult(await api.post("/api/settings/notifications/test", {}));
		} catch (e) {
			setResult({ error: e.message });
		} finally {
			setBusy(false);
		}
	};

	const line = (name, r) => {
		if (!r) return null;
		if (r.skipped) return `${name}: not set up`;
		if (r.ok) return `${name}: sent`;
		return `${name}: failed (${r.error})`;
	};

	return (
		<Box>
			<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
				<Typography variant="body2" sx={{ fontWeight: 600 }}>
					Events to tell you about
				</Typography>
				<InfoTip id="notifications.events" />
			</Box>
			<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", columnGap: 2 }}>
				{Object.entries(labels ?? {}).map(([type, text]) => (
					<FormControlLabel key={type} control={<Checkbox size="small" checked={selected.has(type)} onChange={(e) => toggle(type, e.target.checked)} />} label={<Typography variant="body2">{text}</Typography>} />
				))}
			</Box>
			<Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
				<Button size="small" variant="outlined" disabled={busy} onClick={test}>
					{busy ? "Sending…" : "Send a test"}
				</Button>
				<InfoTip id="notifications.test" />
			</Box>
			{result && (
				<Alert severity={result.error || [result.desktop, result.webhook, result.email].some((r) => r && r.ok === false) ? "warning" : "success"} sx={{ mt: 1 }}>
					{result.error ? (
						result.error
					) : (
						<>
							{[line("Windows notification", result.desktop), line("Webhook", result.webhook), line("Email", result.email)].filter(Boolean).map((l) => (
								<div key={l}>{l}</div>
							))}
						</>
					)}
				</Alert>
			)}
		</Box>
	);
}

export default NotificationEvents;
