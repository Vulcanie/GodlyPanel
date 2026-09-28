import React from "react";
import {
	Container,
	Typography,
	ThemeProvider,
	CssBaseline,
	Box,
	Button,
	alpha,
} from "@mui/material";
import { darkTheme } from "./theme";
import DashboardPage from "./components/DashboardPage";
import ConfigPage from "./components/ConfigPage";
import LoginPage from "./components/LoginPage";
import BatchFileEditor from "./components/BatchFileEditor";
import CreateServerPage from "./components/CreateServerPage";
import { isTokenExpired } from "./utils/authToken";

// How often to re-check the stored token while the app stays open, so a
// session that goes stale mid-visit (rather than just between visits)
// still gets logged out on its own rather than sitting there looking
// valid until the next write fails.
const SESSION_CHECK_MS = 5 * 60_000;

// ✅ Centralized API base URL
const API_BASE =
	process.env.REACT_APP_API_URL?.trim().replace(/\/+$/, "") || "";
console.log("🌐 Using API base:", API_BASE || "(relative)");

function App() {
	const [page, setPage] = React.useState("dashboard");
	const [selectedServer, setSelectedServer] = React.useState(null);
	const [servers, setServers] = React.useState({});
	const [systemStats, setSystemStats] = React.useState(null);
	const [serverStats, setServerStats] = React.useState([]);
	const [apiError, setApiError] = React.useState(null);
	const [loading, setLoading] = React.useState(true);
	const [userRole, setUserRole] = React.useState(() => {
		return localStorage.getItem("userRole") || null;
	});
	const [authToken, setAuthToken] = React.useState(() => {
		return localStorage.getItem("authToken") || null;
	});

	const logout = React.useCallback(() => {
		setUserRole(null);
		setAuthToken(null);
		localStorage.removeItem("userRole");
		localStorage.removeItem("authToken");
	}, []);

	// Catches a session that's gone stale — on load (closed the tab for
	// weeks and the 30-day token finally expired) and periodically while
	// the app stays open (expires mid-visit). Client-side expiry check
	// only, for UX; the server independently rejects an invalid token on
	// every write regardless of what this decides.
	React.useEffect(() => {
		if (authToken && isTokenExpired(authToken)) {
			logout();
			return;
		}

		const interval = setInterval(() => {
			if (authToken && isTokenExpired(authToken)) logout();
		}, SESSION_CHECK_MS);

		return () => clearInterval(interval);
	}, [authToken, logout]);

	React.useEffect(() => {
		const joinUrl = (base, path) =>
			`${base}/${path}`.replace(/\/+/g, "/").replace(":/", "://");

		// --- 1. Initial fetch (so UI loads instantly) ---
		const fetchInitial = async () => {
			try {
				const url = joinUrl(API_BASE, "/api/status");
				const res = await fetch(url, {
					headers: {
						Accept: "application/json",
						"ngrok-skip-browser-warning": "true",
					},
				});

				if (!res.ok) throw new Error(`HTTP ${res.status}`);

				const data = await res.json();
				setServers(data);
				setApiError(null);
			} catch (err) {
				console.error("Initial fetch failed:", err);
				setApiError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchInitial();

		// --- 1b. Initial system-stats fetch ---
		const fetchSystemStats = async () => {
			try {
				const url = joinUrl(API_BASE, "/api/system-stats");
				const res = await fetch(url, {
					headers: {
						Accept: "application/json",
						"ngrok-skip-browser-warning": "true",
					},
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (data.totalMemMB != null) setSystemStats(data);
			} catch (err) {
				console.error("Initial system-stats fetch failed:", err);
			}
		};

		fetchSystemStats();

		const fetchServerStats = async () => {
			try {
				const url = joinUrl(API_BASE, "/api/server-stats");
				const res = await fetch(url, {
					headers: {
						Accept: "application/json",
						"ngrok-skip-browser-warning": "true",
					},
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (Array.isArray(data)) setServerStats(data);
			} catch (err) {
				console.error("Initial server-stats fetch failed:", err);
			}
		};

		fetchServerStats();

		// --- 2. SSE live updates ---
		const eventsUrl = joinUrl(API_BASE, "/api/events");
		const events = new EventSource(eventsUrl);

		events.onmessage = (event) => {
			// Any message — including the 15s heartbeat — means the
			// connection is alive, whether or not it ever actually dropped.
			// EventSource auto-reconnects on its own after a transient error;
			// without this the "Lost connection" banner from onerror below
			// would never clear even after a silent, successful reconnect.
			setApiError(null);

			if (!event.data) return;

			const data = JSON.parse(event.data);

			switch (data.type) {
				case "connected":
					console.log("SSE connected");
					break;

				case "server_update":
					setServers((prev) => ({
						...prev,
						[data.serverName]: data.status,
					}));
					break;

				case "server_added":
					setServers((prev) => ({
						...prev,
						[data.serverName]: data.status,
					}));
					break;

				case "server_removed":
					setServers((prev) => {
						const copy = { ...prev };
						delete copy[data.serverName];
						return copy;
					});
					break;

				case "system_stats":
					setSystemStats(data.stats);
					break;

				case "server_stats":
					setServerStats(data.stats);
					break;

				default:
					console.warn("Unknown SSE event:", data);
			}
		};

		events.onerror = (err) => {
			console.error("SSE error:", err);
			setApiError("Lost connection to live updates");
		};

		// Cleanup on unmount
		return () => {
			events.close();
		};
	}, []);

	// useCallback (not plain function expressions) since these thread all the
	// way down into every ServerTile's onClick — a fresh reference every App
	// render would defeat React.memo on GameCard/ServerTile further down.
	const navigateToConfig = React.useCallback((serverName) => {
		setSelectedServer(serverName);
		setPage("config");
	}, []);

	const navigateToDashboard = React.useCallback(() => {
		setSelectedServer(null);
		setPage("dashboard");
	}, []);

	const navigateToBatchEditor = React.useCallback(() => {
		setPage("batchEditor");
	}, []);

	const navigateToCreateServer = React.useCallback(() => {
		setPage("createServer");
	}, []);

	const selectedServerData = servers[selectedServer] || null;

	if (!userRole) {
		return (
			<ThemeProvider theme={darkTheme}>
				<CssBaseline />
				<LoginPage
					onLogin={(role, token) => {
						setUserRole(role);
						setAuthToken(token);
						localStorage.setItem("userRole", role);
						localStorage.setItem("authToken", token);
					}}
				/>
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider theme={darkTheme}>
			<CssBaseline />
			<Container sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
				<Box
					sx={{
						position: "sticky",
						top: 0,
						zIndex: (t) => t.zIndex.appBar,
						display: "flex",
						flexDirection: { xs: "column", sm: "row" },
						justifyContent: "space-between",
						alignItems: "center",
						gap: 1,
						mb: 2,
						py: 1.5,
						backdropFilter: "blur(8px)",
						backgroundColor: (t) => alpha(t.palette.background.default, 0.85),
						borderBottom: "1px solid rgba(255,255,255,0.08)",
					}}
				>
					<Typography variant="h3" gutterBottom sx={{ mb: 0 }}>
						GodlyHeroes Server Dashboard
					</Typography>
					<Button variant="outlined" size="small" onClick={logout}>
						Logout
					</Button>
				</Box>

				{page === "dashboard" ? (
					<DashboardPage
						servers={servers}
						systemStats={systemStats}
						serverStats={serverStats}
						loading={loading}
						onNavigate={navigateToConfig}
						onCreateServer={navigateToCreateServer}
						apiError={apiError}
						userRole={userRole}
					/>
				) : page === "createServer" ? (
					<CreateServerPage
						onBack={navigateToDashboard}
						userRole={userRole}
						authToken={authToken}
					/>
				) : page === "config" ? (
					<ConfigPage
						serverName={selectedServer}
						serverStatus={selectedServerData}
						onBack={navigateToDashboard}
						userRole={userRole}
						authToken={authToken}
						onEditBatchFiles={navigateToBatchEditor} // ✅ Pass handler
					/>
				) : page === "batchEditor" ? (
					<BatchFileEditor
						serverName={selectedServer}
						onBack={navigateToConfig}
						authToken={authToken}
					/>
				) : null}
			</Container>
		</ThemeProvider>
	);
}

export default App;
