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

	// Native form controls and scrollbars follow too.
	React.useEffect(() => {
		document.documentElement.style.colorScheme = resolved;
		document.documentElement.dataset.theme = resolved;
	}, [resolved]);

	return (
		<ThemeModeContext.Provider value={value}>
			<ThemeProvider theme={resolved === "dark" ? darkTheme : lightTheme}>{children}</ThemeProvider>
		</ThemeModeContext.Provider>
	);
}

export const useThemeMode = () => React.useContext(ThemeModeContext);
