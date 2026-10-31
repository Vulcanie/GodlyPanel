import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Computer as ComputerIcon, Devices as DevicesIcon, Smartphone as PhoneIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { t, tn, useT, formatDate, errorText } from "../i18n";

const ago = (iso) => {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return t("sessions.aWhileAgo");
	const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
	if (seconds < 90) return t("common.justNow");
	if (seconds < 5400) return tn("sessions.minutesAgo", Math.round(seconds / 60));
	if (seconds < 129600) return tn("sessions.hoursAgo", Math.round(seconds / 3600));
	return tn("sessions.daysAgo", Math.round(seconds / 86400));
};

const when = (iso) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? t("sessions.unknownTime") : formatDate(d);
};

// The device text is the browser's own description; a phone is worth showing as one.
const isPhone = (device) => /iphone|android|mobile|ipad/i.test(String(device ?? ""));

function Row({ s, onEnd, busy, showWho }) {
	useT();
	const Icon = isPhone(s.device) ? PhoneIcon : ComputerIcon;
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.2, borderBottom: (t) => `1px solid ${t.palette.divider}`, "&:last-of-type": { borderBottom: 0 } }}>
			<Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", flexShrink: 0, color: s.current ? "primary.main" : "text.secondary", background: (t) => (s.current ? t.custom.gradientSoft : t.custom.hover) }}>
				<Icon fontSize="small" />
			</Box>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body2" component="div" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
					<span>
						{showWho ? <strong>{s.username}: </strong> : null}
						{s.device || t("sessions.unknownDevice")}
					</span>
					{s.current && <Chip size="small" color="primary" label={t("sessions.thisBrowser")} />}
					{s.via === "community" && <Chip size="small" variant="outlined" label={t("sessions.fromOutside")} />}
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{t("sessions.rowDetail", { address: s.ip || t("sessions.unknownAddress"), when: when(s.createdAt), ago: ago(s.lastSeen) })}
				</Typography>
			</Box>
			<Button size="small" color="warning" disabled={busy} onClick={() => onEnd(s)}>
				{s.current ? t("common.signOut") : t("sessions.end")}
			</Button>
		</Box>
	);
}

/**
 * Where you are signed in: this browser and any other, each with a way to end it. An administrator also sees everyone
 * else's. Ending one signs that browser out at once.
 */
function SessionsDialog({ open, onClose, isAdmin, onSignedOut }) {
	// Re-renders this dialog when the language changes, so the t() text below switches with it.
	useT();
	const [mine, setMine] = React.useState(null);
	const [everyone, setEveryone] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			setMine((await api.get("/api/auth/sessions"))?.sessions ?? []);
			if (isAdmin) setEveryone((await api.get("/api/users/sessions"))?.sessions ?? []);
			setError(null);
		} catch (e) {
			setError(errorText(e, t("sessions.loadFailed")));
		}
	}, [isAdmin]);

	React.useEffect(() => {
		if (!open) return;
		setMine(null);
		setEveryone(null);
		setError(null);
		load();
	}, [open, load]);

	const act = async (fn) => {
		setBusy(true);
		try {
			await fn();
			await load();
		} catch (e) {
			setError(errorText(e, t("sessions.actFailed")));
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
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", color: "primary.main", background: (t) => t.custom.gradientSoft, flexShrink: 0 }}>
					<DevicesIcon fontSize="small" />
				</Box>
				{t("sessions.title")}
			</DialogTitle>
			<DialogContent>
				{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
				{!mine ? (
					!error && <CircularProgress size={24} />
				) : (
					<>
						<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
							{t("sessions.intro")}
						</Typography>
						{mine.map((s) => (
							<Row key={s.id} s={s} busy={busy} onEnd={endMine} />
						))}
						{isAdmin && (
							<>
								<Typography variant="subtitle2" sx={{ mt: 3, mb: 0.5 }}>
									{t("sessions.everyoneElse")}
								</Typography>
								{everyone && elsewhere.length === 0 && (
									<Typography variant="body2" sx={{ color: "text.secondary" }}>
										{t("sessions.nobodyElse")}
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
			<DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap" }}>
				<Button color="warning" disabled={busy || others.length === 0} onClick={() => act(() => api.post("/api/auth/sessions/revoke-others", {}))}>
					{t("sessions.signOutElse")}
				</Button>
				<Button onClick={onClose}>{t("common.close")}</Button>
			</DialogActions>
		</Dialog>
	);
}

export default SessionsDialog;
