import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { api } from "../api/client";

const ago = (iso) => {
	const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
	if (seconds < 90) return "just now";
	if (seconds < 5400) return `${Math.round(seconds / 60)} minutes ago`;
	if (seconds < 129600) return `${Math.round(seconds / 3600)} hours ago`;
	return `${Math.round(seconds / 86400)} days ago`;
};

function Row({ s, onEnd, busy, showWho }) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.2, borderBottom: (t) => `1px solid ${t.palette.divider}`, "&:last-of-type": { borderBottom: 0 } }}>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body2">
					{showWho ? <strong>{s.username}: </strong> : null}
					{s.device}
					{s.current && <Chip size="small" color="primary" label="This browser" sx={{ ml: 1 }} />}
					{s.via === "community" && <Chip size="small" variant="outlined" label="From outside" sx={{ ml: 1 }} />}
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{s.ip || "Unknown address"} · signed in {new Date(s.createdAt).toLocaleString()} · last used {ago(s.lastSeen)}
				</Typography>
			</Box>
			<Button size="small" color="warning" disabled={busy} onClick={() => onEnd(s)}>
				{s.current ? "Sign out" : "End"}
			</Button>
		</Box>
	);
}

/**
 * Where you are signed in: this browser and any other, each with a way to end it. An administrator also sees everyone
 * else's. Ending one signs that browser out at once.
 */
function SessionsDialog({ open, onClose, isAdmin, onSignedOut }) {
	const [mine, setMine] = React.useState(null);
	const [everyone, setEveryone] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			setMine((await api.get("/api/auth/sessions")).sessions);
			if (isAdmin) setEveryone((await api.get("/api/users/sessions")).sessions);
			setError(null);
		} catch (e) {
			setError(e.message);
		}
	}, [isAdmin]);

	React.useEffect(() => {
		if (!open) return;
		setMine(null);
		setEveryone(null);
		load();
	}, [open, load]);

	const act = async (fn) => {
		setBusy(true);
		try {
			await fn();
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const endMine = (s) =>
		act(async () => {
			await api.del(`/api/auth/sessions/${s.id}`);
			if (s.current) onSignedOut?.();
		});
	const others = (mine ?? []).filter((s) => !s.current);
	const elsewhere = (everyone ?? []).filter((s) => !(mine ?? []).some((m) => m.id === s.id));

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>Where you're signed in</DialogTitle>
			<DialogContent>
				{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
				{!mine ? (
					<CircularProgress size={24} />
				) : (
					<>
						<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
							Each sign-in to your account is listed. Anything you don't recognise: end it, then change your password.
						</Typography>
						{mine.map((s) => (
							<Row key={s.id} s={s} busy={busy} onEnd={endMine} />
						))}
						{isAdmin && (
							<>
								<Typography variant="subtitle2" sx={{ mt: 3, mb: 0.5 }}>
									Everyone else
								</Typography>
								{everyone && elsewhere.length === 0 && (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										Nobody else is signed in.
									</Typography>
								)}
								{elsewhere.map((s) => (
									<Row key={s.id} s={s} showWho busy={busy} onEnd={(x) => act(() => api.del(`/api/users/sessions/${x.id}`))} />
								))}
							</>
						)}
					</>
				)}
			</DialogContent>
			<DialogActions>
				<Button color="warning" disabled={busy || others.length === 0} onClick={() => act(() => api.post("/api/auth/sessions/revoke-others", {}))}>
					Sign out everywhere else
				</Button>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

export default SessionsDialog;
