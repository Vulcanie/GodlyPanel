import React from "react";
import { Alert, Snackbar } from "@mui/material";

// A short message at the bottom of the screen: "Valheim is starting", "Saved". One place shows them so every page says things the
// same way, and a message doesn't vanish when the page that caused it changes.

const ToastContext = React.createContext(() => {});

export function ToastProvider({ children }) {
	const [toast, setToast] = React.useState(null);
	const show = React.useCallback((message, severity = "success") => setToast({ message, severity, key: Date.now() }), []);
	return (
		<ToastContext.Provider value={show}>
			{children}
			<Snackbar
				key={toast?.key}
				open={Boolean(toast)}
				autoHideDuration={toast?.severity === "error" ? 9000 : 4500}
				onClose={(_, reason) => reason !== "clickaway" && setToast(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				{toast ? (
					<Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ minWidth: 280, boxShadow: (t) => t.custom.shadow }}>
						{toast.message}
					</Alert>
				) : undefined}
			</Snackbar>
		</ToastContext.Provider>
	);
}

/** show(message, "success" | "info" | "warning" | "error") */
export const useToast = () => React.useContext(ToastContext);
