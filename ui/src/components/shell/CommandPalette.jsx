import React from "react";
import { Box, Dialog, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText, TextField, Typography } from "@mui/material";
import {
	Search as SearchIcon,
	SpaceDashboard as DashboardIcon,
	AddCircleOutline as CreateIcon,
	Timeline as ActivityIcon,
	Group as PeopleIcon,
	Settings as SettingsIcon,
	Dns as ServerIcon,
	Tune as TabIcon,
	PlayArrow as StartIcon,
	Stop as StopIcon,
	RestartAlt as RestartIcon,
} from "@mui/icons-material";
import LiveDot from "../ui/LiveDot";
import { isOperator } from "../../permissions";
import { serverTabs } from "../../serverTabs";

/**
 * Ctrl+K: type to jump anywhere. Pages, servers, a server's tabs ("Valheim backups"), and start, stop or restart a server. Every
 * result is something the sidebar and tabs can do too; this just gets there without looking for it.
 */
function CommandPalette({ open, onClose, servers, allowedServers, role, go, onAction }) {
	const [query, setQuery] = React.useState("");
	const [active, setActive] = React.useState(0);
	const listRef = React.useRef(null);
	const admin = role === "admin";
	const operator = isOperator(role);

	React.useEffect(() => {
		if (open) {
			setQuery("");
			setActive(0);
		}
	}, [open]);

	const items = React.useMemo(() => {
		const out = [{ id: "p:dashboard", group: "Go to", icon: <DashboardIcon fontSize="small" />, label: "Dashboard", words: "home overview servers", run: () => go("dashboard", null) }];
		if (admin) out.push({ id: "p:create", group: "Go to", icon: <CreateIcon fontSize="small" />, label: "Create a server", words: "new add install", run: () => go("createServer") });
		if (operator) out.push({ id: "p:activity", group: "Go to", icon: <ActivityIcon fontSize="small" />, label: "Activity", words: "log history audit events", run: () => go("activity") });
		if (admin) {
			out.push({ id: "p:people", group: "Go to", icon: <PeopleIcon fontSize="small" />, label: "People", words: "users accounts moderators", run: () => go("users") });
			out.push({ id: "p:settings", group: "Go to", icon: <SettingsIcon fontSize="small" />, label: "Settings", words: "configuration backups discord notifications folders", run: () => go("settings") });
		}
		if (operator) {
			const names = Object.keys(servers)
				.filter((n) => !allowedServers || allowedServers.includes(n))
				.sort((a, b) => Number(Boolean(servers[b]?.online)) - Number(Boolean(servers[a]?.online)) || a.localeCompare(b));
			for (const name of names) {
				const s = servers[name];
				const dot = <LiveDot state={s?.online ? "online" : "offline"} size={8} pulse={false} />;
				out.push({ id: `s:${name}`, group: "Servers", icon: dot, label: name, hint: s?.online ? `${s.playerCount ?? 0} players` : "offline", words: `${s?.type ?? ""} ${s?.sessionName ?? ""}`, run: () => go("config", name) });
				for (const tab of serverTabs(admin)) {
					out.push({ id: `t:${name}:${tab.key}`, group: "Server pages", icon: <TabIcon fontSize="small" />, label: `${name}: ${tab.label}`, words: `${tab.words ?? ""} ${s?.type ?? ""}`, run: () => go("config", name, tab.key), rank: 2 });
				}
				if (s?.online) {
					out.push({ id: `a:stop:${name}`, group: "Actions", icon: <StopIcon fontSize="small" />, label: `Stop ${name}`, words: "shut down", run: () => onAction(name, "stop"), rank: 3 });
					out.push({ id: `a:restart:${name}`, group: "Actions", icon: <RestartIcon fontSize="small" />, label: `Restart ${name}`, words: "reboot", run: () => onAction(name, "restart"), rank: 3 });
				} else {
					out.push({ id: `a:start:${name}`, group: "Actions", icon: <StartIcon fontSize="small" />, label: `Start ${name}`, words: "launch run", run: () => onAction(name, "start"), rank: 3 });
				}
			}
		}
		return out;
	}, [servers, allowedServers, admin, operator, go, onAction]);

	const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const results = React.useMemo(() => {
		if (words.length === 0) return items.filter((i) => !i.rank).slice(0, 12);
		return items
			.filter((i) => words.every((w) => `${i.label} ${i.words ?? ""} ${i.group}`.toLowerCase().includes(w)))
			.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
			.slice(0, 14);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items, query]);

	React.useEffect(() => setActive(0), [query]);
	React.useEffect(() => {
		listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
	}, [active, results]);

	const choose = (item) => {
		onClose();
		item?.run();
	};

	const onKeyDown = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((i) => Math.min(results.length - 1, i + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((i) => Math.max(0, i - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			choose(results[active]);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { position: "fixed", top: { xs: 24, sm: 80 }, m: 2, maxHeight: "70vh", display: "flex", flexDirection: "column" } } }}>
			<TextField
				autoFocus
				fullWidth
				placeholder="Jump to a server, page or action…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyDown={onKeyDown}
				slotProps={{
					htmlInput: { "aria-label": "Search the panel", "data-testid": "palette-input" },
					input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> },
				}}
				sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0, fontSize: 17, py: 0.5 }, "& fieldset": { border: 0, borderBottom: 1, borderColor: "divider" } }}
			/>
			<List ref={listRef} dense sx={{ overflowY: "auto", p: 1 }} data-testid="palette-results">
				{results.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>
						Nothing matches "{query.trim()}".
					</Typography>
				)}
				{results.map((item, i) => (
					<React.Fragment key={item.id}>
						{(i === 0 || results[i - 1].group !== item.group) && (
							<Typography variant="caption" sx={{ display: "block", px: 1.5, pt: 1, pb: 0.25, color: "text.secondary", letterSpacing: 1, textTransform: "uppercase", fontSize: 10.5 }}>
								{item.group}
							</Typography>
						)}
						<ListItemButton selected={i === active} data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose(item)} sx={{ borderRadius: 2 }}>
							<ListItemIcon sx={{ minWidth: 34, display: "grid", placeItems: "center", justifyContent: "flex-start" }}>{item.icon ?? <ServerIcon fontSize="small" />}</ListItemIcon>
							<ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", noWrap: true }} />
							{item.hint && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{item.hint}
								</Typography>
							)}
						</ListItemButton>
					</React.Fragment>
				))}
			</List>
			<Box sx={{ display: "flex", gap: 2, px: 2, py: 1, borderTop: 1, borderColor: "divider", color: "text.secondary", fontSize: 12 }}>
				<span>↑↓ to move</span>
				<span>Enter to choose</span>
				<span>Esc to close</span>
			</Box>
		</Dialog>
	);
}

export default CommandPalette;
