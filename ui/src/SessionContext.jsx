import React from "react";
import { api, setUnauthenticatedHandler } from "./api/client";

// The role comes from the server, every time, via /api/auth/me.
//
// It used to be whatever the login response had put in localStorage, which
// meant editing one string in devtools unlocked the entire admin UI. The
// server still refused the writes, but the app should never have been
// offering them — and a guest seeing admin controls that then fail is a
// worse experience than not seeing them.

const SessionContext = React.createContext(null);

export function SessionProvider({ children }) {
	const [state, setState] = React.useState({
		status: "loading", // loading | setup | signedOut | signedIn
		user: null,
	});

	const refresh = React.useCallback(async () => {
		try {
			const data = await api.get("/api/auth/me");
			setState({ status: "signedIn", user: data.user });
		} catch (err) {
			if (err.code === "setup_required") {
				setState({ status: "setup", user: null });
			} else {
				setState({ status: "signedOut", user: null });
			}
		}
	}, []);

	React.useEffect(() => {
		refresh();
		// A 401 from anywhere means the session ended — an admin disabled the
		// account, changed its role, or it simply expired. Drop straight back
		// to the sign-in screen rather than leaving a half-broken UI.
		setUnauthenticatedHandler(() => {
			setState((prev) =>
				prev.status === "signedIn" ? { status: "signedOut", user: null } : prev,
			);
		});
		return () => setUnauthenticatedHandler(null);
	}, [refresh]);

	const login = React.useCallback(async (username, password) => {
		const data = await api.post("/api/auth/login", { username, password });
		setState({ status: "signedIn", user: data.user });
		return data.user;
	}, []);

	const completeSetup = React.useCallback(async (username, password) => {
		const data = await api.post("/api/setup/admin", { username, password });
		setState({ status: "signedIn", user: data.user });
		return data.user;
	}, []);

	const logout = React.useCallback(async () => {
		try {
			await api.post("/api/auth/logout");
		} finally {
			setState({ status: "signedOut", user: null });
		}
	}, []);

	const value = React.useMemo(
		() => ({
			...state,
			isAdmin: state.user?.role === "admin",
			role: state.user?.role ?? null,
			login,
			logout,
			completeSetup,
			refresh,
		}),
		[state, login, logout, completeSetup, refresh],
	);

	return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
	const ctx = React.useContext(SessionContext);
	if (!ctx) throw new Error("useSession must be used inside a SessionProvider.");
	return ctx;
}
