import React from "react";
import {
	Container,
	Typography,
	CssBaseline,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	alpha,
} from "@mui/material";
import { ThemeModeProvider } from "./ThemeMode";
import ThemeToggle from "./components/ThemeToggle";
import SetupChecklist from "./components/SetupChecklist";
import DashboardPage from "./components/DashboardPage";
import ServerWorkspace from "./components/ServerWorkspace";
import ActivityPanel from "./components/ActivityPanel";
import ChangePasswordDialog from "./components/ChangePasswordDialog";
import UpdateBanner from "./components/UpdateBanner";
import { OperationsProvider } from "./OperationsContext";
import { emitLive } from "./liveEvents";
import { isOperator, ROLE_LABELS } from "./permissions";
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
	const [showActivity, setShowActivity] = React.useState(false);
	const [showPassword, setShowPassword] = React.useState(false);
	const [allowedServers, setAllowedServers] = React.useState(null);

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

			// A moderator may be limited to some servers; everyone else can open any
			// they are allowed to see.
			try {
				setAllowedServers(role === "moderator" ? await api.get("/api/my-servers") : null);
			} catch {
				setAllowedServers(null);
			}
		};

		loadInitial();

		const events = new EventSource("/api/events");

		// Some paths between the browser and the panel (a temporary Cloudflare link, certain proxies) cut live
		// streams. When the stream is down or has gone quiet, ask for the same information every few seconds instead.
		let streamOk = false;
		let lastEvent = Date.now();
		let lastPoll = 0;
		const poll = async () => {
			if (Date.now() - lastPoll < 8000) return;
			lastPoll = Date.now();
			try {
				setServers(await api.get("/api/status"));
				setApiError(null);
				const stats = await api.get("/api/system-stats").catch(() => null);
				if (stats?.totalMemMB != null) setSystemStats(stats);
				const perServer = await api.get("/api/server-stats").catch(() => null);
				if (Array.isArray(perServer)) setServerStats(perServer);
			} catch (err) {
				setApiError(err.message);
			}
		};
		const fallback = setInterval(() => {
			if (!streamOk || Date.now() - lastEvent > 45_000) poll();
		}, 10_000);
		// Only a message counts as proof the stream works: a proxy may let it open and then hold back everything.
		events.onmessage = (event) => {
			streamOk = true;
			lastEvent = Date.now();
			// Any message — including the 15s heartbeat — means the connection
			// is alive. EventSource reconnects on its own after a transient
			// error, and without clearing here the "lost connection" banner
			// would never go away even once it had silently recovered.
			setApiError(null);
			if (!event.data) return;

			const data = JSON.parse(event.data);
			// Anything that only one component cares about (a backup's progress, an
			// activity line) is handed to whoever is listening for it.
			emitLive(data.type, data);
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

		events.onerror = () => {
			streamOk = false;
			poll();
		};

		return () => {
			clearInterval(fallback);
			events.close();
		};
	}, [signedIn, role]);

	// One place changes page, and it also records the change in the browser's
	// history, so the browser's Back button steps through the panel instead of
	// leaving it. useCallback keeps these stable: they thread down into every
	// ServerTile's onClick, and a fresh reference each render would defeat
	// React.memo on GameCard/ServerTile.
	const selectedRef = React.useRef(null);
	// What each history entry showed, by position, so an in-app Back button can
	// step back through history when the entry before is where it's headed
	// (rather than piling up a new entry every time you go back).
	const trail = React.useRef([{ page: "dashboard", server: null }]);
	const position = () => window.history.state?.idx ?? 0;

	const show = React.useCallback((nextPage, serverName) => {
		// undefined keeps the current server (batch editor and its back button).
		if (serverName !== undefined) selectedRef.current = serverName;
		setPage(nextPage);
		setSelectedServer(selectedRef.current);
		try {
			const idx = position() + 1;
			trail.current.length = idx;
			trail.current[idx] = { page: nextPage, server: selectedRef.current };
			window.history.pushState({ page: nextPage, server: selectedRef.current, idx }, "");
		} catch {
			// History is a convenience; the panel works without it.
		}
	}, []);
	const goBackTo = React.useCallback(
		(nextPage) => {
			const previous = trail.current[position() - 1];
			if (previous && previous.page === nextPage) window.history.back();
			else show(nextPage, nextPage === "dashboard" ? null : undefined);
		},
		[show],
	);
	const navigateToConfig = React.useCallback((serverName) => show("config", serverName), [show]);
	const navigateToDashboard = React.useCallback(() => goBackTo("dashboard"), [goBackTo]);
	const navigateToBatchEditor = React.useCallback(() => show("batchEditor"), [show]);
	// The editor's back button carries no server name; the selected one stays.
	const backToSelectedConfig = React.useCallback(() => goBackTo("config"), [goBackTo]);
	const navigateToCreateServer = React.useCallback(() => show("createServer"), [show]);
	const navigateToUsers = React.useCallback(() => show("users"), [show]);
	const navigateToSettings = React.useCallback(() => show("settings"), [show]);

	// Browser Back/Forward.
	React.useEffect(() => {
		try {
			window.history.replaceState({ page: "dashboard", server: null, idx: 0 }, "");
		} catch {
			// Ignore.
		}
		const onPop = (event) => {
			const state = event.state || { page: "dashboard", server: null, idx: 0 };
			selectedRef.current = state.server ?? null;
			setPage(state.page || "dashboard");
			setSelectedServer(selectedRef.current);
		};
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	// Signing out and back in as someone else must not land on the previous
	// person's page (a view-only user arriving on Settings, say).
	React.useEffect(() => {
		if (!signedIn) {
			selectedRef.current = null;
			setPage("dashboard");
			setSelectedServer(null);
		}
	}, [signedIn]);

	// A server deleted from another window while its page is open.
	React.useEffect(() => {
		if (!loading && signedIn && (page === "config" || page === "batchEditor") && selectedServer && !servers[selectedServer]) {
			selectedRef.current = null;
			setPage("dashboard");
			setSelectedServer(null);
		}
	}, [loading, signedIn, page, selectedServer, servers]);


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
					borderBottom: (t) => `1px solid ${t.palette.divider}`,
				}}
			>
				<Typography variant="h4" sx={{ mb: 0 }}>
					GodlyPanel
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 1, "& .MuiButton-root": { whiteSpace: "nowrap" } }}>
					<Chip
						size="small"
						label={`${user.username}${isAdmin ? "" : ` · ${ROLE_LABELS[role] ?? role}`}`}
						color={isAdmin ? "primary" : role === "moderator" ? "secondary" : "default"}
					/>
					{isOperator(role) && (
						<Button variant="text" size="small" onClick={() => setShowActivity(true)}>
							Activity
						</Button>
					)}
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
					<ThemeToggle />
						<Button variant="text" size="small" component="a" href="https://github.com/Vulcanie/GodlyPanel/blob/main/docs/README.md" target="_blank" rel="noopener noreferrer">
							Help
						</Button>
						<Button variant="text" size="small" onClick={() => setShowPassword(true)}>
							Password
						</Button>
					<Button variant="outlined" size="small" onClick={logout}>
						Sign out
					</Button>
				</Box>
			</Box>

			{isAdmin && page === "dashboard" && <UpdateBanner onOpenSettings={navigateToSettings} />}
			{isAdmin && page === "dashboard" && <SetupChecklist onOpenSettings={navigateToSettings} onCreateServer={navigateToCreateServer} />}

			{page === "dashboard" ? (
				<DashboardPage
					allowedServers={allowedServers}
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
				<ServerWorkspace
					serverName={selectedServer}
					serverStatus={selectedServerData}
					servers={servers}
					onBack={navigateToDashboard}
					userRole={role}
					onEditBatchFiles={navigateToBatchEditor}
					onOpenServer={navigateToConfig}
				/>
			) : page === "batchEditor" ? (
				<BatchFileEditor serverName={selectedServer} onBack={backToSelectedConfig} />
			) : null}

			<ChangePasswordDialog open={showPassword} onClose={() => setShowPassword(false)} />
			<Dialog open={showActivity} onClose={() => setShowActivity(false)} fullWidth maxWidth="md">
				<DialogTitle>Activity</DialogTitle>
				<DialogContent>
					<ActivityPanel limit={150} />
				</DialogContent>
			</Dialog>
		</Container>
	);
}

function App() {
	return (
		<ThemeModeProvider>
			<CssBaseline />
			<SessionProvider>
				<OperationsProvider>
					<Panel />
				</OperationsProvider>
			</SessionProvider>
		</ThemeModeProvider>
	);
}

export default App;
