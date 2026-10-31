import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import TipRow from "./TipRow";
import { t, useT, errorText } from "../i18n";

/**
 * Remove a server: out of the panel only, or together with its files. Deleting
 * files is only offered for servers the panel created, and the person has to type
 * the server's name, since it can't be undone. Drawn inside a card the page provides.
 */
function DeleteServer({ serverName, onDeleted }) {
	useT();
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [open, setOpen] = React.useState(false);
	const [plan, setPlan] = React.useState(null);
	const [choice, setChoice] = React.useState("panel");
	const [typed, setTyped] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	// Another server's page must not open with this one's dialog, or its plan.
	React.useEffect(() => {
		setOpen(false);
		setPlan(null);
		setBusy(false);
	}, [serverName]);

	const show = async () => {
		setOpen(true);
		setPlan(null);
		setChoice("panel");
		setTyped("");
		setError(null);
		try {
			const found = await api.get(`${base}/removal`);
			setPlan(found);
		} catch (e) {
			setError(errorText(e));
		}
	};

	const confirm = async () => {
		setBusy(true);
		setError(null);
		try {
			await api.del(base, { confirmName: typed, deleteFiles: choice === "everything" });
			setOpen(false);
			toast(choice === "everything" ? t("delete.deletedFiles", { name: serverName }) : t("delete.removedPanel", { name: serverName }));
			onDeleted?.();
		} catch (e) {
			setError(errorText(e));
			setBusy(false);
		}
	};

	const withFiles = choice === "everything";
	const ready = plan && !plan.running && typed === serverName && !busy;

	return (
		<Box>
			<TipRow id="server.delete.mode">
				<Button variant="outlined" color="error" size="small" onClick={show}>
					{t("delete.button")}
				</Button>
			</TipRow>

			<Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>{t("delete.title", { name: serverName })}</DialogTitle>
				<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
					{!plan && !error && <Typography variant="body2">{t("common.checking")}</Typography>}
					{plan?.running && <Alert severity="warning">{t("delete.running")}</Alert>}

					{plan && (
						<TipRow id="server.delete.mode">
							<TextField select fullWidth size="small" label={t("delete.what")} value={choice} onChange={(e) => setChoice(e.target.value)}>
								<MenuItem value="panel">{t("delete.panelOnly")}</MenuItem>
								<MenuItem value="everything" disabled={!plan.canDeleteFiles}>
									{plan.mode === "script" ? t("delete.scriptAndFile") : t("delete.everything")}
								</MenuItem>
							</TextField>
						</TipRow>
					)}
					{plan && !plan.canDeleteFiles && plan.reason && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{plan.reason}
						</Typography>
					)}
					{plan && withFiles && plan.canDeleteFiles && (
						<Alert severity="error">
							{plan.mode === "folder" ? t("delete.permanent", { target: plan.target }) : t("delete.onlyScript", { script: plan.script, reason: plan.reason ?? "" })}
						</Alert>
					)}

					{plan && (
						<TextField fullWidth size="small" label={t("delete.typeToConfirm", { name: serverName })} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
					)}
					{error && <Alert severity="error">{error}</Alert>}
				</DialogContent>
				<DialogActions>
					<Button disabled={busy} onClick={() => setOpen(false)}>
						{t("common.cancel")}
					</Button>
					<Button color="error" variant="contained" disabled={!ready} onClick={confirm}>
						{busy ? t("delete.deleting") : withFiles ? t("delete.serverAndFiles") : t("delete.removeServer")}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default DeleteServer;
