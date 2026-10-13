import React from "react";
import {
	Avatar,
	Box,
	Chip,
	Divider,
	InputAdornment,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
	Menu,
	MenuItem,
	TextField,
	Tooltip,
	Typography,
	ListItemText as MenuText,
	ListItemIcon as MenuIcon,
} from "@mui/material";
import {
	SpaceDashboard as DashboardIcon,
	AddCircleOutline as CreateIcon,
	Timeline as ActivityIcon,
	Group as PeopleIcon,
	Settings as SettingsIcon,
	HelpOutline as HelpIcon,
	Lock as PasswordIcon,
	Devices as DevicesIcon,
	Logout as LogoutIcon,
	Search as SearchIcon,
	ExpandLess,
	ExpandMore,
} from "@mui/icons-material";
import LiveDot from "../ui/LiveDot";
import ThemeToggle from "../ThemeToggle";
import { useOperations, operationLabel } from "../../OperationsContext";
import { isOperator, ROLE_LABELS } from "../../permissions";

export const SIDEBAR_WIDTH = 268;
const SERVER_LIST_SHORT = 8;

const GUIDE = "https://github.com/Vulcanie/GodlyPanel/blob/main/docs/README.md";

function NavItem({ icon, label, active, onClick, testId, secondary }) {
	return (
		<ListItemButton
			selected={active}
			onClick={onClick}
			data-testid={testId}
			sx={{
				borderRadius: 2.5,
				mb: 0.25,
				py: 0.9,
				position: "relative",
				"&.Mui-selected": { background: (t) => t.custom.gradientSoft, color: "text.primary" },
				"&.Mui-selected::before": { content: '""', position: "absolute", left: -8, top: 8, bottom: 8, width: 3, borderRadius: 3, background: (t) => t.custom.gradient },
				"&:hover": { backgroundColor: (t) => t.custom.hover },
			}}
		>
			<ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : "text.secondary" }}>{icon}</ListItemIcon>
			<ListItemText primary={label} primaryTypographyProps={{ variant: "body2", fontWeight: active ? 700 : 500 }} />
			{secondary}
		</ListItemButton>
	);
}

/** One server in the list: its light, its name, and how many are on (or what it is busy with). */
const ServerLink = React.memo(function ServerLink({ name, status, active, onOpen }) {
	const operation = useOperations()[name];
	const state = operation ? "busy" : status?.online ? "online" : "offline";
	return (
		<ListItemButton
			selected={active}
			onClick={() => onOpen(name)}
			data-testid={`sidebar-server-${name}`}
			sx={{ borderRadius: 2.5, py: 0.6, pl: 1.5, mb: 0.1, "&.Mui-selected": { background: (t) => t.custom.gradientSoft }, "&:hover": { backgroundColor: (t) => t.custom.hover } }}
		>
			<Box sx={{ mr: 1.5, display: "grid", placeItems: "center", width: 14 }}>
				<LiveDot state={state} size={8} pulse={false} />
			</Box>
			<ListItemText primary={name} primaryTypographyProps={{ variant: "body2", noWrap: true, fontWeight: active ? 700 : 500, color: status?.online || operation ? "text.primary" : "text.secondary" }} />
			{operation ? (
				<Typography variant="caption" sx={{ color: "status.busy", ml: 1 }}>
					{operationLabel(operation)}
				</Typography>
			) : status?.online ? (
				<Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
					{status.playerCount ?? 0}
				</Typography>
			) : null}
		</ListItemButton>
	);
});

function Meter({ label, percent }) {
	const value = Math.max(0, Math.min(100, percent ?? 0));
	const colour = value > 90 ? "error.main" : value > 75 ? "warning.main" : "secondary.main";
	return (
		<Box>
			<Box sx={{ display: "flex", justifyContent: "space-between" }}>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{label}
				</Typography>
				<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
					{Math.round(value)}%
				</Typography>
			</Box>
			<Box sx={{ height: 5, borderRadius: 3, bgcolor: (t) => t.custom.hover, overflow: "hidden", mt: 0.25 }}>
				<Box sx={{ height: 1, width: `${value}%`, bgcolor: colour, borderRadius: 3, transition: "width .6s ease, background-color .3s" }} />
			</Box>
		</Box>
	);
}

/**
 * The panel's left rail: where to go, every server a click away, the PC's load, and the signed-in person's menu.
 */
function Sidebar({ nav, go, servers, allowedServers, systemStats, connection, user, role, onChangePassword, onSessions, onSignOut, onNavigate }) {
	const [filter, setFilter] = React.useState("");
	const [showAll, setShowAll] = React.useState(false);
	const [anchor, setAnchor] = React.useState(null);
	const operator = isOperator(role);
	const admin = role === "admin";

	const move = (page, server, tab) => {
		go(page, server, tab);
		onNavigate?.();
	};

	// Online servers first, then by name. A moderator limited to some servers sees only those.
	const names = React.useMemo(() => {
		const list = Object.keys(servers).filter((n) => !allowedServers || allowedServers.includes(n));
		return list.sort((a, b) => Number(Boolean(servers[b]?.online)) - Number(Boolean(servers[a]?.online)) || a.localeCompare(b));
	}, [servers, allowedServers]);

	const q = filter.trim().toLowerCase();
	const matching = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
	const visible = q || showAll ? matching : matching.slice(0, SERVER_LIST_SHORT);
	const online = names.filter((n) => servers[n]?.online).length;

	return (
		<Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: SIDEBAR_WIDTH, px: 1.5, py: 2, boxSizing: "border-box" }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1, mb: 2.5, cursor: "pointer" }} onClick={() => move("dashboard", null)}>
				<Box component="img" src="/logo.svg" alt="" width={34} height={34} sx={{ borderRadius: 2, boxShadow: (t) => t.custom.shadow }} />
				<Box>
					<Typography
						variant="h6"
						sx={{ lineHeight: 1.1, background: (t) => t.custom.gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}
					>
						GodlyPanel
					</Typography>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{online} of {names.length} server{names.length === 1 ? "" : "s"} online
					</Typography>
				</Box>
			</Box>

			<Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", pr: 0.5, mr: -0.5 }}>
				<List dense disablePadding>
					<NavItem icon={<DashboardIcon fontSize="small" />} label="Dashboard" active={nav.page === "dashboard"} onClick={() => move("dashboard", null)} testId="nav-dashboard" />
					{admin && <NavItem icon={<CreateIcon fontSize="small" />} label="Create server" active={nav.page === "createServer"} onClick={() => move("createServer")} testId="nav-create" />}
					{operator && <NavItem icon={<ActivityIcon fontSize="small" />} label="Activity" active={nav.page === "activity"} onClick={() => move("activity")} testId="nav-activity" />}
					{admin && <NavItem icon={<PeopleIcon fontSize="small" />} label="People" active={nav.page === "users"} onClick={() => move("users")} testId="nav-people" />}
					{admin && <NavItem icon={<SettingsIcon fontSize="small" />} label="Settings" active={nav.page === "settings"} onClick={() => move("settings")} testId="nav-settings" />}
				</List>

				{operator && names.length > 0 && (
					<List
						dense
						disablePadding
						subheader={
							<ListSubheader disableSticky sx={{ background: "transparent", lineHeight: "32px", mt: 1.5, px: 1.5, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary" }}>
								Servers
							</ListSubheader>
						}
					>
						{names.length > SERVER_LIST_SHORT && (
							<TextField
								size="small"
								fullWidth
								placeholder="Find a server"
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
								sx={{ mb: 1, "& .MuiOutlinedInput-root": { fontSize: 13 } }}
								slotProps={{
									htmlInput: { "aria-label": "Find a server" },
									input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> },
								}}
							/>
						)}
						{visible.map((name) => (
							<ServerLink key={name} name={name} status={servers[name]} active={nav.page === "config" && nav.server === name} onOpen={(n) => move("config", n)} />
						))}
						{!q && matching.length > SERVER_LIST_SHORT && (
							<ListItemButton onClick={() => setShowAll((v) => !v)} sx={{ borderRadius: 2.5, py: 0.4 }}>
								<ListItemText primary={showAll ? "Show fewer" : `Show all ${matching.length}`} primaryTypographyProps={{ variant: "caption", color: "text.secondary" }} />
								{showAll ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
							</ListItemButton>
						)}
						{q && matching.length === 0 && (
							<Typography variant="caption" sx={{ px: 1.5, color: "text.secondary" }}>
								No server matches.
							</Typography>
						)}
					</List>
				)}
			</Box>

			<Divider sx={{ my: 1.5 }} />

			{systemStats?.totalMemMB != null && (
				<Box sx={{ display: "grid", gap: 1, px: 1, mb: 1.5 }}>
					<Meter label="CPU" percent={systemStats.cpuPercent} />
					<Meter label="Memory" percent={systemStats.usedMemPercent} />
				</Box>
			)}

			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Box
					component="button"
					type="button"
					onClick={(e) => setAnchor(e.currentTarget)}
					aria-haspopup="menu"
					data-testid="user-menu"
					sx={{
						flex: 1,
						minWidth: 0,
						display: "flex",
						alignItems: "center",
						gap: 1.25,
						p: 1,
						border: 0,
						borderRadius: 3,
						bgcolor: "transparent",
						color: "text.primary",
						font: "inherit",
						textAlign: "left",
						cursor: "pointer",
						"&:hover": { bgcolor: (t) => t.custom.hover },
					}}
				>
					<Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700, background: (t) => t.custom.gradient, color: "#fff" }}>{user.username.slice(0, 1).toUpperCase()}</Avatar>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.2 }}>
							{user.username}
						</Typography>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							{ROLE_LABELS[role] ?? role}
						</Typography>
					</Box>
				</Box>
				<Tooltip title={connection === "live" ? "Live: updates arrive as they happen" : connection === "polling" ? "Checking every few seconds" : "The panel isn't answering"}>
					<Chip
						size="small"
						variant="outlined"
						label={connection === "live" ? "Live" : connection === "polling" ? "Polling" : "Offline"}
						icon={<LiveDot state={connection === "live" ? "online" : connection === "polling" ? "busy" : "offline"} size={7} pulse={connection === "live"} sx={{ ml: "8px !important" }} />}
						sx={{ height: 24, fontSize: 11 }}
					/>
				</Tooltip>
			</Box>

			<Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "left" }} transformOrigin={{ vertical: "bottom", horizontal: "left" }}>
				<Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3 }}>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						Appearance
					</Typography>
					<ThemeToggle />
				</Box>
				<Divider />
				<MenuItem onClick={() => { setAnchor(null); onChangePassword(); }}>
					<MenuIcon><PasswordIcon fontSize="small" /></MenuIcon>
					<MenuText>Change password</MenuText>
				</MenuItem>
				<MenuItem onClick={() => { setAnchor(null); onSessions(); }}>
					<MenuIcon><DevicesIcon fontSize="small" /></MenuIcon>
					<MenuText>Where I'm signed in</MenuText>
				</MenuItem>
				<MenuItem component="a" href={GUIDE} target="_blank" rel="noopener noreferrer" onClick={() => setAnchor(null)}>
					<MenuIcon><HelpIcon fontSize="small" /></MenuIcon>
					<MenuText>Help and guides</MenuText>
				</MenuItem>
				<Divider />
				<MenuItem onClick={() => { setAnchor(null); onSignOut(); }} data-testid="sign-out">
					<MenuIcon><LogoutIcon fontSize="small" /></MenuIcon>
					<MenuText>Sign out</MenuText>
				</MenuItem>
			</Menu>
		</Box>
	);
}

export default Sidebar;
