import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

/** "Are you sure?" with a button that says what it will do. */
function ConfirmDialog({ open, title = "Are you sure?", children, confirmLabel = "Yes", color = "warning", onConfirm, onClose }) {
	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<DialogContentText component="div">{children}</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" color={color} onClick={onConfirm} autoFocus data-testid="confirm-yes">
					{confirmLabel}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default ConfirmDialog;
