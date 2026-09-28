import { createTheme, responsiveFontSizes } from "@mui/material";
import { green, grey } from "@mui/material/colors";

// This file contains the Material-UI theme definition for the app.
// responsiveFontSizes() scales every Typography variant (h1-h6, body, etc.)
// down on narrow screens automatically, from this one place, instead of
// hand-tuning fontSize on every heading across the app.
export const darkTheme = responsiveFontSizes(
	createTheme({
		palette: {
			mode: "dark",
			background: {
				default: "#121212",
				paper: "#1e1e1e",
			},
			primary: {
				main: "#22d3ee",
			},
			secondary: {
				main: "#f97316",
			},
			// Not a standard MUI palette bucket — plain JS, so no augmentation
			// needed. Centralizes the online/offline color instead of every
			// component importing green/grey from @mui/material/colors itself.
			status: {
				online: green[500],
				offline: grey[600],
			},
		},
		shape: {
			borderRadius: 12,
		},
		components: {
			MuiCard: {
				styleOverrides: {
					root: {
						backgroundImage: "none",
						border: "1px solid rgba(255,255,255,0.08)",
						borderRadius: 16,
					},
				},
			},
			MuiButton: {
				styleOverrides: {
					root: {
						textTransform: "none",
						transition: "transform 0.15s ease",
					},
					contained: {
						"&:hover": {
							transform: "translateY(-1px)",
						},
					},
				},
			},
			MuiChip: {
				styleOverrides: {
					root: {
						fontWeight: 500,
						borderRadius: 999,
					},
				},
			},
			MuiAccordion: {
				styleOverrides: {
					root: {
						backgroundImage: "none",
						"&:before": {
							display: "none",
						},
						"&.Mui-expanded": {
							margin: 0,
						},
					},
				},
			},
			MuiAccordionSummary: {
				styleOverrides: {
					root: {
						padding: 0,
						minHeight: "unset",
					},
					content: {
						margin: 0,
						width: "100%",
					},
				},
			},
		},
	}),
);
