import React from "react";
import { Box, CircularProgress, CssBaseline, Drawer, useMediaQuery } from "@mui/material";
import { ThemeModeProvider } from "./ThemeMode";
import { OperationsProvider } from "./OperationsContext";
import { SessionProvider, useSession } from "./SessionContext";
import { ToastProvider, useToast } from "./ToastContext";
import { NavContext } from "./NavContext";
import { useNavigation } from "./hooks/useNavigation";
import { usePanelData } from "./hooks/usePanelData";
import { api } from "./api/client";
import { isOperator } from "./permissions";
import Sidebar, { SIDEBAR_WIDTH } from "./components/shell/Sidebar";
import TopBar from "./components/shell/TopBar";
import CommandPalette from "./components/shell/CommandPalette";
import ConfirmDialog from "./components/ui/ConfirmDialog";
import LoginPage from "./components/LoginPage";
import SetupWizard from "./components/SetupWizard";
import DashboardPage from "./components/DashboardPage";
import SetupChecklist from "./components/SetupChecklist";
import UpdateBanner from "./components/UpdateBanner";
import ChangePasswordDialog from "./components/ChangePasswordDialog";
import SessionsDialog from "./components/SessionsDialog";

// Everything that isn't the dashboard is loaded when it is first opened, so the first screen arrives sooner.
const ServerWorkspace = React.lazy(() => import("./components/ServerWorkspace"));
const BatchFileEditor = React.lazy(() => import("./components/BatchFileEditor"));
const CreateServerPage = React.lazy(() => import("./components/CreateServerPage"));
const SettingsPage = React.lazy(() => import("./components/SettingsPage"));
const UsersPage = React.lazy(() => import("./components/UsersPage"));
const ActivityPage = React.lazy(() => import("./components/ActivityPage"));

const Loading = () => <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

const CONFIRM = {
	stop: (name) => ({ title: `Stop ${name}?`, text: "Players will be disconnected. It is saved first where the game allows.", label: "Stop it", color: "error" }),
	restart: (name) => ({ title: `Restart ${name}?`, text: "Players are disconnected while it restarts.", label: "Restart it", color: "warning" }),
};

function Panel() {
	const { status, user, role, isAdmin, logout } = useSession();
	const signedIn = status === "signedIn";
	const toast = useToast();

	const { nav, go, back, setTab } = useNavigation(signedIn);
	const data = usePanelData(signedIn, role);
	const { servers, loading } = data;

	const wide = useMediaQuery((t) => t.breakpoints.up("md"));
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [paletteOpen, setPaletteOpen] = React.useState(false);
	const [showPassword, setShowPassword] = React.useState(false);
	const [showSessions, setShowSessions] = React.useState(false);
	const [pending, setPending] = React.useState(null); // { name, action } waiting for a yes

	// Ctrl+K (or Cmd+K) opens the palette from anywhere, once signed in.
	React.useEffect(() => {
		if (!signedIn || !isOperator(role)) return undefined;
		const onKey = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((open) => !open);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [signedIn, role]);

	// A server deleted from another window while its page is open.
	React.useEffect(() => {
		if (!loading && signedIn && (nav.page === "config" || nav.page === "batchEditor") && nav.server && !servers[nav.server]) go("dashboard", null);
	}, [loading, signedIn, nav.page, nav.server, servers, go]);

	const run = React.useCallback(
		async (name, action) => {
			try {
				const r = await api.post(`/api/control/${encodeURIComponent(name)}/${action}`);
				toast(r?.message ?? `${name}: ${action} sent.`, "success");
			} catch (e) {
				toast(e.message, "error");
			}
		},
		[toast],
	);
	// Starting is safe; stopping and restarting ask first, because players are on.
	const act = React.useCallback(
		(name, action) => {
			if (action === "start") run(name, action);
			else setPending({ name, action });
		},
		[run],
	);

	const navValue = React.useMemo(() => ({ ...nav, go, setTab, back }), [nav, go, setTab, back]);

	if (status === "loading") return <Loading />;
	if (status === "setup") return <SetupWizard />;
	if (status === "signedOut") return <LoginPage />;

	const sidebar = (
		<Sidebar
			nav={nav}
			go={go}
			servers={servers}
			allowedServers={data.allowedServers}
			systemStats={data.systemStats}
			connection={data.connection}
			user={user}
			role={role}
			onChangePassword={() => setShowPassword(true)}
			onSessions={() => setShowSessions(true)}
			onSignOut={logout}
			onNavigate={() => setMenuOpen(false)}
		/>
	);

	const confirm = pending ? CONFIRM[pending.action](pending.name) : null;

	return (
		<NavContext.Provider value={navValue}>
			<Box sx={{ display: "flex", minHeight: "100vh", backgroundImage: (t) => t.custom.backdrop, backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}>
				{wide ? (
					<Box component="nav" aria-label="Main" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: 1, borderColor: "divider", position: "sticky", top: 0, height: "100vh", backgroundColor: (t) => t.custom.glass, backdropFilter: "blur(14px)" }}>
						{sidebar}
					</Box>
				) : (
					<Drawer open={menuOpen} onClose={() => setMenuOpen(false)} slotProps={{ paper: { sx: { backgroundImage: "none" } } }}>
						<Box component="nav" aria-label="Main" sx={{ height: "100%" }}>
							{sidebar}
						</Box>
					</Drawer>
				)}

				<Box component="main" sx={{ flex: 1, minWidth: 0 }}>
					<TopBar nav={nav} go={go} onMenu={() => setMenuOpen(true)} onPalette={() => setPaletteOpen(true)} showPalette={isOperator(role)} />

					<Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1480, mx: "auto", animation: "gp-rise .25s ease-out" }} key={`${nav.page}:${nav.server ?? ""}`}>
						{isAdmin && nav.page === "dashboard" && <UpdateBanner onOpenSettings={() => go("settings")} />}
						{isAdmin && nav.page === "dashboard" && <SetupChecklist onOpenSettings={() => go("settings")} onCreateServer={() => go("createServer")} />}

						<React.Suspense fallback={<Loading />}>
							{nav.page === "dashboard" ? (
								<DashboardPage
									servers={servers}
									systemStats={data.systemStats}
									serverStats={data.serverStats}
									loading={loading}
									apiError={data.apiError}
									userRole={role}
									appearance={data.appearance}
									allowedServers={data.allowedServers}
									onOpen={(name) => go("config", name)}
									onCreateServer={() => go("createServer")}
									onAction={act}
								/>
							) : nav.page === "createServer" ? (
								<CreateServerPage onBack={() => back("dashboard")} userRole={role} />
							) : nav.page === "settings" ? (
								<SettingsPage onBack={() => back("dashboard")} />
							) : nav.page === "users" ? (
								<UsersPage onBack={() => back("dashboard")} currentUser={user} />
							) : nav.page === "activity" ? (
								<ActivityPage isAdmin={isAdmin} />
							) : nav.page === "config" && nav.server ? (
								<ServerWorkspace
									serverName={nav.server}
									serverStatus={servers[nav.server] || null}
									serverStats={data.serverStats.find((s) => s.name === nav.server) ?? null}
									servers={servers}
									appearance={data.appearance}
									userRole={role}
									tab={nav.tab}
									onTab={setTab}
									onBack={() => back("dashboard")}
									onEditBatchFiles={() => go("batchEditor")}
									onOpenServer={(name) => go("config", name)}
									onAction={act}
								/>
							) : nav.page === "batchEditor" && nav.server ? (
								<BatchFileEditor serverName={nav.server} onBack={() => back("config")} />
							) : null}
						</React.Suspense>
					</Box>
				</Box>
			</Box>

			<CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} servers={servers} allowedServers={data.allowedServers} role={role} go={go} onAction={act} />
			<ChangePasswordDialog open={showPassword} onClose={() => setShowPassword(false)} />
			<SessionsDialog open={showSessions} onClose={() => setShowSessions(false)} isAdmin={isAdmin} onSignedOut={logout} />
			<ConfirmDialog
				open={Boolean(pending)}
				title={confirm?.title}
				confirmLabel={confirm?.label}
				color={confirm?.color}
				onClose={() => setPending(null)}
				onConfirm={() => {
					const { name, action } = pending;
					setPending(null);
					run(name, action);
				}}
			>
				{confirm?.text}
			</ConfirmDialog>
		</NavContext.Provider>
	);
}

function App() {
	return (
		<ThemeModeProvider>
			<CssBaseline />
			<SessionProvider>
				<OperationsProvider>
					<ToastProvider>
						<Panel />
					</ToastProvider>
				</OperationsProvider>
			</SessionProvider>
		</ThemeModeProvider>
	);
}

export default App;
