import { createTheme, responsiveFontSizes } from "@mui/material";
import { green, grey } from "@mui/material/colors";

// This file contains the Material-UI theme definition for the app.
// responsiveFontSizes() scales every Typography variant (h1-h6, body, etc.)
// down on narrow screens automatically, from this one place, instead of
// hand-tuning fontSize on every heading across the app.
//
// One definition, two palettes: the light one keeps the same accents, darkened where
// the dark one's brighter tones wouldn't read against white.
export function buildTheme(mode) {
	const dark = mode === "dark";
	return responsiveFontSizes(
	createTheme({
		palette: {
			mode,
			background: dark ? { default: "#121212", paper: "#1e1e1e" } : { default: "#f3f5f7", paper: "#ffffff" },
			primary: {
				main: dark ? "#22d3ee" : "#0e7490",
			},
			secondary: {
				main: dark ? "#f97316" : "#c2410c",
			},
			divider: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)",
			// Not a standard MUI palette bucket — plain JS, so no augmentation
			// needed. Centralizes the online/offline color instead of every
			// component importing green/grey from @mui/material/colors itself.
			status: {
				online: dark ? green[500] : green[700],
				offline: dark ? grey[600] : grey[500],
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
						border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.12)",
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
}

export const darkTheme = buildTheme("dark");
export const lightTheme = buildTheme("light");
