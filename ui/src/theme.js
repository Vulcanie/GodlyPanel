import { alpha, createTheme, responsiveFontSizes } from "@mui/material";

// GodlyPanel's look. The people using it run game servers for their friends: they want to see at a glance that everything is up,
// and to do the next thing in one click. So it is a "control room": a deep navy dark theme by default, bright status colours that
// glow when something is live, and large, calm surfaces. The light theme keeps the same accents on soft grey.
//
// Everything that is a colour or a gradient lives here (palette.brand, palette.status, theme.custom), so no component has to
// hard-code one and both themes always stay in step.

const FONT = '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = '"Cascadia Code", "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace';

const BRAND = { violet: "#7c5cff", cyan: "#22d3ee", pink: "#f472b6" };

export function buildTheme(mode) {
	const dark = mode === "dark";

	const ink = dark ? "#e8ecf5" : "#12172a";
	const muted = dark ? "#97a3bd" : "#566077";
	const paper = dark ? "#121a2b" : "#ffffff";
	const base = dark ? "#0a0f1c" : "#f2f5fb";
	const line = dark ? "rgba(148,163,200,0.16)" : "rgba(18,23,42,0.12)";

	const primary = dark ? "#8b73ff" : "#5b3df5";
	const secondary = dark ? "#22d3ee" : "#0891b2";

	const theme = createTheme({
		palette: {
			mode,
			primary: { main: primary, contrastText: "#ffffff" },
			secondary: { main: secondary, contrastText: dark ? "#04141a" : "#ffffff" },
			success: { main: dark ? "#34d399" : "#15803d" },
			warning: { main: dark ? "#fbbf24" : "#b45309" },
			error: { main: dark ? "#fb7185" : "#be123c" },
			info: { main: dark ? "#60a5fa" : "#1d4ed8" },
			background: { default: base, paper },
			text: { primary: ink, secondary: muted, disabled: dark ? "#5d6a85" : "#98a2b8" },
			divider: line,
			// Not standard MUI buckets (plain JS, so no augmentation needed).
			status: {
				online: dark ? "#34d399" : "#15803d",
				offline: dark ? "#64708a" : "#98a2b8",
				busy: dark ? "#fbbf24" : "#b45309",
			},
			brand: BRAND,
		},
		custom: {
			mono: MONO,
			// The accent used for the logo, the active navigation item and primary calls to action.
			gradient: `linear-gradient(135deg, ${BRAND.violet} 0%, ${BRAND.cyan} 100%)`,
			gradientSoft: dark
				? `linear-gradient(135deg, ${alpha(BRAND.violet, 0.22)} 0%, ${alpha(BRAND.cyan, 0.14)} 100%)`
				: `linear-gradient(135deg, ${alpha(BRAND.violet, 0.1)} 0%, ${alpha(BRAND.cyan, 0.08)} 100%)`,
			// A faint colour wash behind the whole app, so a flat background never looks dead.
			backdrop: dark
				? `radial-gradient(1200px 600px at 12% -10%, ${alpha(BRAND.violet, 0.18)} 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, ${alpha(BRAND.cyan, 0.1)} 0%, transparent 55%)`
				: `radial-gradient(1100px 500px at 10% -10%, ${alpha(BRAND.violet, 0.1)} 0%, transparent 60%), radial-gradient(800px 420px at 100% 0%, ${alpha(BRAND.cyan, 0.08)} 0%, transparent 55%)`,
			glass: dark ? alpha("#121a2b", 0.72) : alpha("#ffffff", 0.78),
			hover: dark ? alpha("#ffffff", 0.05) : alpha("#12172a", 0.04),
			shadow: dark ? "0 10px 30px rgba(0,0,0,0.35)" : "0 10px 30px rgba(18,23,42,0.10)",
			glow: (color) => `0 0 0 3px ${alpha(color, 0.18)}, 0 0 14px ${alpha(color, 0.55)}`,
		},
		// The base unit for `borderRadius: n` in sx (n * 4px: 2 is 8px, 3 is 12px, 4 is 16px). Parts of the component library that read the
		// base directly (Paper, toggle buttons) are given their own radius below.
		shape: { borderRadius: 4 },
		typography: {
			fontFamily: FONT,
			h4: { fontWeight: 700, letterSpacing: "-0.02em" },
			h5: { fontWeight: 700, letterSpacing: "-0.015em" },
			h6: { fontWeight: 650, letterSpacing: "-0.01em" },
			subtitle1: { fontWeight: 650 },
			subtitle2: { fontWeight: 650 },
			button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
		},
		components: {
			MuiCssBaseline: {
				styleOverrides: {
					body: { backgroundColor: base, backgroundImage: "none" },
					"::selection": { background: alpha(BRAND.violet, 0.4) },
					"*": { scrollbarWidth: "thin", scrollbarColor: `${alpha(muted, 0.45)} transparent` },
					code: { fontFamily: MONO },
					"@keyframes gp-pulse": { "0%": { opacity: 0.9, transform: "scale(0.9)" }, "70%": { opacity: 0, transform: "scale(2.4)" }, "100%": { opacity: 0, transform: "scale(2.4)" } },
					"@keyframes gp-rise": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
					"@media (prefers-reduced-motion: reduce)": { "*, *::before, *::after": { animationDuration: "0.01ms !important", transitionDuration: "0.01ms !important" } },
				},
			},
			MuiPaper: { styleOverrides: { root: { backgroundImage: "none" }, rounded: { borderRadius: 12 } } },
			MuiToggleButton: { styleOverrides: { root: { borderRadius: 8 } } },
			MuiMenu: { styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${line}` } } },
			MuiCard: {
				styleOverrides: {
					root: { backgroundImage: "none", border: `1px solid ${line}`, borderRadius: 16, boxShadow: "none" },
				},
			},
			MuiButton: {
				defaultProps: { disableElevation: true },
				styleOverrides: {
					root: { borderRadius: 10, transition: "transform .15s ease, box-shadow .15s ease, background-color .15s ease" },
					contained: { "&:hover": { transform: "translateY(-1px)" } },
					// The gradient must not stay behind a disabled button, or its label can't be read.
					containedPrimary: { backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${dark ? "#6a8bff" : "#4338ca"} 100%)`, "&:hover": { boxShadow: `0 6px 18px ${alpha(BRAND.violet, 0.4)}` }, "&.Mui-disabled": { backgroundImage: "none" } },
					outlined: { borderColor: line },
				},
			},
			MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
			MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999 } } },
			MuiTextField: { defaultProps: { variant: "outlined" } },
			MuiOutlinedInput: {
				styleOverrides: {
					root: {
						borderRadius: 10,
						backgroundColor: dark ? alpha("#ffffff", 0.03) : alpha("#12172a", 0.02),
						"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: alpha(primary, 0.6) },
					},
					notchedOutline: { borderColor: line },
				},
			},
			MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3, backgroundImage: `linear-gradient(90deg, ${BRAND.violet}, ${BRAND.cyan})` } } },
			MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600, minHeight: 44 } } },
			MuiTooltip: {
				styleOverrides: {
					tooltip: { backgroundColor: dark ? "#1b2640" : "#1b2338", color: "#eef2ff", border: `1px solid ${dark ? "rgba(148,163,200,0.25)" : "transparent"}`, fontSize: 12.5, borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.35)" },
					arrow: { color: dark ? "#1b2640" : "#1b2338" },
				},
			},
			MuiDialog: { styleOverrides: { paper: { borderRadius: 18, border: `1px solid ${line}` } } },
			MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
			MuiAccordion: {
				styleOverrides: {
					root: { backgroundImage: "none", "&:before": { display: "none" }, "&.Mui-expanded": { margin: 0 } },
				},
			},
			MuiAccordionSummary: { styleOverrides: { root: { padding: 0, minHeight: "unset" }, content: { margin: 0, width: "100%" } } },
			MuiDivider: { styleOverrides: { root: { borderColor: line } } },
			MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999 } } },
		},
	});
	return responsiveFontSizes(theme);
}

export const darkTheme = buildTheme("dark");
export const lightTheme = buildTheme("light");
