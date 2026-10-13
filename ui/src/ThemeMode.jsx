import React from "react";
import { ThemeProvider } from "@mui/material";
import { darkTheme, lightTheme } from "./theme";

// Light, dark, or whatever Windows is set to. The choice is remembered in this browser (or
// this app's window); "system" follows the OS live, so switching Windows at sunset switches the panel.

const KEY = "gp.themeMode";
const MODES = ["system", "light", "dark"];
const ThemeModeContext = React.createContext({ mode: "system", resolved: "dark", setMode: () => {} });

const stored = () => {
	try {
		const v = localStorage.getItem(KEY);
		return MODES.includes(v) ? v : "system";
	} catch {
		return "system";
	}
};

const systemPrefersDark = () => {
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	} catch {
		return true;
	}
};

export function ThemeModeProvider({ children }) {
	const [mode, setModeState] = React.useState(stored);
	const [systemDark, setSystemDark] = React.useState(systemPrefersDark);

	React.useEffect(() => {
		let query;
		try {
			query = window.matchMedia("(prefers-color-scheme: dark)");
		} catch {
			return undefined;
		}
		const onChange = (e) => setSystemDark(e.matches);
		query.addEventListener?.("change", onChange);
		return () => query.removeEventListener?.("change", onChange);
	}, []);

	const setMode = React.useCallback((next) => {
		if (!MODES.includes(next)) return;
		setModeState(next);
		try {
			localStorage.setItem(KEY, next);
		} catch {
			// The choice just isn't remembered.
		}
	}, []);

	const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
	const value = React.useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

	// Another tab or window of the panel changed the choice: follow it.
	React.useEffect(() => {
		const onStorage = (e) => {
			if (e.key === KEY) setModeState(stored());
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	// Native form controls and scrollbars follow too, and so does the colour of a phone browser's address bar.
	const theme = resolved === "dark" ? darkTheme : lightTheme;
	React.useEffect(() => {
		document.documentElement.style.colorScheme = resolved;
		document.documentElement.dataset.theme = resolved;
		try {
			let meta = document.querySelector('meta[name="theme-color"]');
			if (!meta) {
				meta = document.createElement("meta");
				meta.name = "theme-color";
				document.head.appendChild(meta);
			}
			meta.content = theme.palette.background.default;
		} catch {
			// The browser keeps its own bar colour.
		}
	}, [resolved, theme]);

	return (
		<ThemeModeContext.Provider value={value}>
			<ThemeProvider theme={theme}>{children}</ThemeProvider>
		</ThemeModeContext.Provider>
	);
}

export const useThemeMode = () => React.useContext(ThemeModeContext);
