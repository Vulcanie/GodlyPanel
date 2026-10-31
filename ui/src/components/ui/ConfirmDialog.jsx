import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { t, useT } from "../../i18n";

/** "Are you sure?" with a button that says what it will do. */
function ConfirmDialog({ open, title = t("common.areYouSure"), children, confirmLabel = t("common.yes"), color = "warning", onConfirm, onClose }) {
	useT();
	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<DialogContentText component="div">{children}</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose}>{t("common.cancel")}</Button>
				<Button variant="contained" color={color} onClick={onConfirm} autoFocus data-testid="confirm-yes">
					{confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default ConfirmDialog;
