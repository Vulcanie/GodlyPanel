import React from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, TextField, Typography } from "@mui/material";
import { Lock as PasswordIcon } from "@mui/icons-material";
import { flatWhenDisabled } from "./cardStyles";
import { api } from "../api/client";
import { t, useT, errorText } from "../i18n";

// A rough guide for the person typing, not a rule: the server has the final say (and turns away very common passwords).
function strength(password) {
	if (!password) return { value: 0, level: "", color: "inherit" };
	if (password.length < 8) return { value: 25, level: "short", color: "error" };
	const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
	if (password.length >= 14 || (password.length >= 10 && kinds >= 3)) return { value: 100, level: "strong", color: "success" };
	if (password.length >= 10 || kinds >= 3) return { value: 70, level: "good", color: "success" };
	return { value: 45, level: "okay", color: "warning" };
}

function strengthLabel(level) {
	if (level === "short") return t("password.tooShort");
	if (level === "strong") return t("password.strong");
	if (level === "good") return t("password.good");
	if (level === "okay") return t("password.okay");
	return "";
}

/**
 * Change your own password. Asks for the current one first, so someone who finds a signed-in screen
 * unattended can't lock the owner out of their own account. Everyone can do this, whatever their role
 * (administrator, moderator or viewer). The panel gives this browser a fresh sign-in, so the person stays
 * signed in here and is signed out elsewhere.
 */
function ChangePasswordDialog({ open, onClose }) {
	useT();
	const [current, setCurrent] = React.useState("");
	const [next, setNext] = React.useState("");
	const [again, setAgain] = React.useState("");
	const [reveal, setReveal] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [done, setDone] = React.useState(false);

	React.useEffect(() => {
		if (!open) return;
		setCurrent("");
		setNext("");
		setAgain("");
		setReveal(false);
		setError(null);
		setDone(false);
		setBusy(false);
	}, [open]);

	const mismatch = again !== "" && next !== again;
	const ready = current !== "" && next.length >= 8 && next === again && !busy;
	const type = reveal ? "text" : "password";
	const meter = strength(next);

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			await api.post("/api/auth/change-password", { currentPassword: current, newPassword: next });
			setDone(true);
		} catch (e) {
			setError(errorText(e, t("password.failed")));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
			<DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<Box sx={{ width: 36, height: 36, borderRadius: "10px", display: "grid", placeItems: "center", color: "primary.main", background: (t) => t.custom.gradientSoft, flexShrink: 0 }}>
					<PasswordIcon fontSize="small" />
				</Box>
				{t("password.title")}
			</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				{done ? (
					<Alert severity="success">{t("password.changed")}</Alert>
				) : (
					<>
						{error && <Alert severity="error">{error}</Alert>}
						<TextField size="small" type={type} label={t("password.current")} autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
						<Box>
							<TextField
								fullWidth
								size="small"
								type={type}
								label={t("password.new")}
								autoComplete="new-password"
								value={next}
								onChange={(e) => setNext(e.target.value)}
								helperText={t("password.newHelp")}
							/>
							{next && (
								<Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
									<LinearProgress variant="determinate" value={meter.value} color={meter.color} sx={{ flex: 1, height: 4 }} />
									<Typography variant="caption" sx={{ color: "text.secondary", minWidth: 56 }}>
										{strengthLabel(meter.level)}
									</Typography>
								</Box>
							)}
						</Box>
						<TextField
							size="small"
							type={type}
							label={t("password.newAgain")}
							autoComplete="new-password"
							value={again}
							onChange={(e) => setAgain(e.target.value)}
							error={mismatch}
							helperText={mismatch ? t("password.noMatch") : " "}
							onKeyDown={(e) => e.key === "Enter" && ready && save()}
							sx={{ mt: -1 }}
						/>
						<FormControlLabel sx={{ mt: -1.5 }} control={<Checkbox size="small" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />} label={<Typography variant="body2">{t("common.showTyped")}</Typography>} />
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{t("password.forgotten")}
						</Typography>
					</>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				{done ? (
					<Button variant="contained" onClick={onClose}>
						{t("password.done")}
					</Button>
				) : (
					<>
						<Button onClick={onClose} disabled={busy}>
							{t("common.cancel")}
						</Button>
						<Button variant="contained" onClick={save} disabled={!ready} sx={flatWhenDisabled}>
							{busy ? t("password.changing") : t("common.changePassword")}
						</Button>
					</>
				)}
			</DialogActions>
		</Dialog>
	);
}

export default ChangePasswordDialog;
