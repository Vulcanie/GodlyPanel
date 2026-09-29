import React from "react";
import {
	Container,
	Typography,
	ThemeProvider,
	CssBaseline,
	Box,
	Button,
	Chip,
	CircularProgress,
	alpha,
} from "@mui/material";
import { darkTheme } from "./theme";
import DashboardPage from "./components/DashboardPage";
import ConfigPage from "./components/ConfigPage";
import LoginPage from "./components/LoginPage";
import SetupWizard from "./components/SetupWizard";
import BatchFileEditor from "./components/BatchFileEditor";
import CreateServerPage from "./components/CreateServerPage";
import UsersPage from "./components/UsersPage";
import SettingsPage from "./components/SettingsPage";
import { SessionProvider, useSession } from "./SessionContext";
import { api } from "./api/client";

function Panel() {
	const { status, user, role, isAdmin, logout } = useSession();

	const [page, setPage] = React.useState("dashboard");
	const [selectedServer, setSelectedServer] = React.useState(null);
	const [servers, setServers] = React.useState({});
	const [systemStats, setSystemStats] = React.useState(null);
	const [serverStats, setServerStats] = React.useState([]);
	const [appearance, setAppearance] = React.useState(null);
	const [apiError, setApiError] = React.useState(null);
	const [loading, setLoading] = React.useState(true);

	const signedIn = status === "signedIn";

	React.useEffect(() => {
		if (!signedIn) return undefined;

		// Same-origin, so paths are relative and the session cookie rides
		// along automatically — including on the EventSource below, which is
		// the whole reason real per-role auth is possible now.
		const loadInitial = async () => {
			try {
				setServers(await api.get("/api/status"));
				setApiError(null);
			} catch (err) {
				setApiError(err.message);
			} finally {
				setLoading(false);
			}

			try {
				const stats = await api.get("/api/system-stats");
				if (stats?.totalMemMB != null) setSystemStats(stats);
			} catch {
				// Non-fatal; the live stream will fill this in.
			}

			try {
				const stats = await api.get("/api/server-stats");
				if (Array.isArray(stats)) setServerStats(stats);
			} catch {
				// Non-fatal.
			}

			try {
				const { types } = await api.get("/api/appearance");
				setAppearance(types);
			} catch {
				// Non-fatal: cards fall back to their built-in colours.
			}
		};

		loadInitial();

		const events = new EventSource("/api/events");

		events.onmessage = (event) => {
			// Any message — including the 15s heartbeat — means the connection
			// is alive. EventSource reconnects on its own after a transient
			// error, and without clearing here the "lost connection" banner
			// would never go away even once it had silently recovered.
			setApiError(null);
			if (!event.data) return;

			const data = JSON.parse(event.data);
			switch (data.type) {
				case "connected":
					break;
				case "server_update":
				case "server_added":
					setServers((prev) => ({ ...prev, [data.serverName]: data.status }));
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
				case "appearance_updated":
					// An admin changed a card's look; everyone watching sees it
					// without reloading.
					setAppearance((prev) => ({
						...prev,
						[data.gameType]: {
							mode: data.appearance.mode ?? "auto",
							color: data.appearance.color ?? null,
							color2: data.appearance.color2 ?? null,
							appId: data.appearance.appId ?? null,
							image: data.appearance.image ?? null,
							version: data.appearance.updatedAt ?? 0,
						},
					}));
					break;
				default:
					break;
			}
		};

		events.onerror = () => setApiError("Lost connection to live updates");

		return () => events.close();
	}, [signedIn]);

	// useCallback (not plain function expressions) since these thread all the
	// way down into every ServerTile's onClick — a fresh reference every
	// render would defeat React.memo on GameCard/ServerTile further down.
	const navigateToConfig = React.useCallback((serverName) => {
		setSelectedServer(serverName);
		setPage("config");
	}, []);
	const navigateToDashboard = React.useCallback(() => {
		setSelectedServer(null);
		setPage("dashboard");
	}, []);
	const navigateToBatchEditor = React.useCallback(() => setPage("batchEditor"), []);
	const navigateToCreateServer = React.useCallback(() => setPage("createServer"), []);
	const navigateToUsers = React.useCallback(() => setPage("users"), []);
	const navigateToSettings = React.useCallback(() => setPage("settings"), []);

	if (status === "loading") {
		return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;
	}
	if (status === "setup") return <SetupWizard />;
	if (status === "signedOut") return <LoginPage />;

	const selectedServerData = servers[selectedServer] || null;

	return (
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
				<Typography variant="h4" sx={{ mb: 0 }}>
					GodlyPanel
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Chip
						size="small"
						label={`${user.username}${isAdmin ? "" : " · view only"}`}
						color={isAdmin ? "primary" : "default"}
					/>
					{isAdmin && page !== "users" && (
						<Button variant="text" size="small" onClick={navigateToUsers}>
							People
						</Button>
					)}
					{isAdmin && page !== "settings" && (
						<Button variant="text" size="small" onClick={navigateToSettings}>
							Settings
						</Button>
					)}
					<Button variant="outlined" size="small" onClick={logout}>
						Sign out
					</Button>
				</Box>
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
					userRole={role}
					appearance={appearance}
				/>
			) : page === "createServer" ? (
				<CreateServerPage onBack={navigateToDashboard} userRole={role} />
			) : page === "settings" ? (
				<SettingsPage onBack={navigateToDashboard} />
			) : page === "users" ? (
				<UsersPage onBack={navigateToDashboard} currentUser={user} />
			) : page === "config" ? (
				<ConfigPage
					serverName={selectedServer}
					serverStatus={selectedServerData}
					onBack={navigateToDashboard}
					userRole={role}
					onEditBatchFiles={navigateToBatchEditor}
				/>
			) : page === "batchEditor" ? (
				<BatchFileEditor serverName={selectedServer} onBack={navigateToConfig} />
			) : null}
		</Container>
	);
}

function App() {
	return (
		<ThemeProvider theme={darkTheme}>
			<CssBaseline />
			<SessionProvider>
				<Panel />
			</SessionProvider>
		</ThemeProvider>
	);
}

export default App;
