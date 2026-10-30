import React from "react";
import {
	Box,
	Button,
	Typography,
	TextField,
	MenuItem,
	Alert,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	Tooltip,
	CircularProgress,
} from "@mui/material";
import {
	ArrowBack as ArrowBackIcon,
	Delete as DeleteIcon,
	Block as BlockIcon,
	CheckCircle as CheckCircleIcon,
	Edit as EditIcon,
	Group as PeopleIcon,
	Logout as LogoutIcon,
	PersonAdd as AddPersonIcon,
} from "@mui/icons-material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { canBeLimited, roleNameOf, roleOptions, serverRoleRows, serverRolesFromRows } from "../roleEditor";
import PageHeader from "./ui/PageHeader";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import TipRow from "./TipRow";

// Two maps are the same when they hold the same servers with the same roles. null (no per-server roles) only matches null.
const sameServerRoles = (a, b) => JSON.stringify(a ? Object.entries(a).sort() : null) === JSON.stringify(b ? Object.entries(b).sort() : null);

/** How many servers this person has a role of their own on. */
const customCount = (u) => (u.serverRoles && typeof u.serverRoles === "object" ? Object.keys(u.serverRoles).length : 0);

// Lets an admin invite people from the community to view server status
// without handing them control of anything.
function UsersPage({ onBack, currentUser }) {
	const toast = useToast();
	const [users, setUsers] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [role, setRole] = React.useState("guest");
	const [servers, setServers] = React.useState(null); // null = every server (moderators only)
	const [serverNames, setServerNames] = React.useState([]);
	// The roles from the server, custom ones included. Until they load, or if they fail, the three built-in roles are offered.
	const [roles, setRoles] = React.useState(null);
	const options = roleOptions(roles);
	const [editing, setEditing] = React.useState(null);
	// What is being asked about stays set after the dialog closes, so its text does not blank out while it fades away.
	const [removing, setRemoving] = React.useState(null);
	const [removeOpen, setRemoveOpen] = React.useState(false);
	const [signingOut, setSigningOut] = React.useState(null);
	const [signOutOpen, setSignOutOpen] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			const list = await api.get("/api/users");
			setUsers(Array.isArray(list) ? list : []);
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
		api
			.get("/api/status")
			.then((s) => setServerNames(Object.keys(s ?? {}).sort()))
			.catch(() => {});
		api
			.get("/api/roles")
			.then((r) => setRoles(Array.isArray(r?.roles) ? r.roles : null))
			.catch(() => {});
	}, [load]);

	/** Runs one change, then reloads the list. `done` is what the toast says on success. */
	const run = async (fn, done) => {
		setBusy(true);
		setError(null);
		try {
			await fn();
			if (done) toast(done);
			await load();
			return true;
		} catch (e) {
			setError(e.message);
			return false;
		} finally {
			setBusy(false);
		}
	};

	const create = async () => {
		const name = username.trim();
		const ok = await run(async () => {
			await api.post("/api/users", { username: name, password, role, ...(canBeLimited(role) ? { servers } : {}) });
		}, `Added ${name}.`);
		if (!ok) return;
		setUsername("");
		setPassword("");
		setRole("guest");
		setServers(null);
	};

	const passwordTooShort = password.length > 0 && password.length < 8;
	const canCreate = username.trim().length >= 3 && password.length >= 8 && !busy;

	return (
		<Box sx={{ mt: 2 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<PageHeader title="People" subtitle="Who can sign in to this panel, and what each person may do" icon={<PeopleIcon />} />

			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<SectionCard title="Add someone" icon={<AddPersonIcon />}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
					<TipRow id="users.username" sx={{ flex: "1 1 180px", maxWidth: 260 }}>
						<TextField label="Username" size="small" fullWidth autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
					</TipRow>
					<TipRow id="users.password" sx={{ flex: "1 1 180px", maxWidth: 260 }}>
						<TextField
							label="Password"
							size="small"
							type="password"
							fullWidth
							autoComplete="new-password"
							error={passwordTooShort}
							helperText={passwordTooShort ? "At least 8 characters." : undefined}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</TipRow>
					<TipRow id="users.role" sx={{ flex: "1 1 160px", maxWidth: 240 }}>
						<TextField select label="Access" size="small" fullWidth value={role} onChange={(e) => setRole(e.target.value)}>
							{options.map(({ id, name }) => (
								<MenuItem key={id} value={id}>
									{name}
								</MenuItem>
							))}
						</TextField>
					</TipRow>
					{canBeLimited(role) && <ServerPicker names={serverNames} value={servers} onChange={setServers} />}
					<Button variant="contained" disabled={!canCreate} onClick={create}>
						Add
					</Button>
				</Box>
			</SectionCard>

			{!users ? (
				<CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
			) : (
				<SectionCard title={`People (${users.length})`} contentSx={{ p: 0 }}>
					{users.map((u, index) => {
						const isSelf = u.id === currentUser?.id;
						return (
							<Box
								key={u.id}
								sx={{
									display: "flex",
									alignItems: "center",
									flexWrap: "wrap",
									gap: 1.5,
									px: 2.5,
									py: 1.5,
									borderTop: index === 0 ? 0 : 1,
									borderColor: "divider",
									opacity: u.disabled ? 0.5 : 1,
								}}
							>
								<Typography sx={{ flex: "1 1 140px", minWidth: 0, wordBreak: "break-word" }}>
									{u.username}
									{isSelf && (
										<Typography component="span" variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
											(you)
										</Typography>
									)}
								</Typography>
								<Chip
									size="small"
									label={roleNameOf(roles, u.role)}
									color={u.role === "admin" ? "primary" : u.role === "moderator" ? "secondary" : "default"}
								/>
								{canBeLimited(u.role) && (
									<Chip size="small" variant="outlined" label={Array.isArray(u.servers) ? `${u.servers.length} server${u.servers.length === 1 ? "" : "s"}` : "All servers"} />
								)}
								{customCount(u) > 0 && (
									<Chip size="small" variant="outlined" label={`Custom on ${customCount(u)} server${customCount(u) === 1 ? "" : "s"}`} />
								)}
								{u.disabled && <Chip size="small" label="Suspended" color="warning" />}
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<Tooltip title="Change access">
										<span>
											<IconButton size="small" aria-label="Change access" disabled={busy || isSelf} onClick={() => setEditing(u)}>
												<EditIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title={u.disabled ? "Restore access" : "Suspend access"}>
										<span>
											<IconButton
												size="small"
												aria-label={u.disabled ? "Restore access" : "Suspend access"}
												disabled={busy || isSelf}
												onClick={() => run(() => api.put(`/api/users/${u.id}/disabled`, { disabled: !u.disabled }), u.disabled ? `${u.username} can sign in again.` : `${u.username} is suspended and signed out.`)}
											>
												{u.disabled ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title="Sign out everywhere">
										<span>
											<IconButton
												size="small"
												aria-label="Sign out everywhere"
												disabled={busy || isSelf}
												onClick={() => {
													setSigningOut(u);
													setSignOutOpen(true);
												}}
											>
												<LogoutIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
									<Tooltip title="Remove">
										<span>
											<IconButton
												size="small"
												aria-label="Remove"
												disabled={busy || isSelf}
												onClick={() => {
													setRemoving(u);
													setRemoveOpen(true);
												}}
											>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
								</Box>
							</Box>
						);
					})}
				</SectionCard>
			)}

			<ConfirmDialog
				open={removeOpen && Boolean(removing)}
				title={`Remove ${removing?.username}?`}
				confirmLabel="Remove"
				color="error"
				onConfirm={() => {
					setRemoveOpen(false);
					run(() => api.del(`/api/users/${removing.id}`), `Removed ${removing.username}.`);
				}}
				onClose={() => setRemoveOpen(false)}
			>
				They can no longer sign in, and are signed out now. This can't be undone; you would have to add them again.
			</ConfirmDialog>
			<ConfirmDialog
				open={signOutOpen && Boolean(signingOut)}
				title={`Sign ${signingOut?.username} out everywhere?`}
				confirmLabel="Sign out"
				onConfirm={() => {
					setSignOutOpen(false);
					run(() => api.del(`/api/users/${signingOut.id}/sessions`), `${signingOut.username} is signed out everywhere.`);
				}}
				onClose={() => setSignOutOpen(false)}
			>
				Every browser they are signed in on is signed out. They can sign in again with their password.
			</ConfirmDialog>

			{editing && (
				<AccessDialog
					user={editing}
					serverNames={serverNames}
					options={options}
					error={error}
					onClose={() => setEditing(null)}
					onSave={async (next) => {
						const ok = await run(async () => {
							// The password first: it signs them out, and the role change would do the same.
							if (next.password) await api.put(`/api/users/${editing.id}/password`, { password: next.password });
							if (next.role !== editing.role) await api.put(`/api/users/${editing.id}/role`, { role: next.role });
							if (canBeLimited(next.role)) await api.put(`/api/users/${editing.id}/servers`, { servers: next.servers });
							if (next.serverRoles !== undefined) await api.put(`/api/users/${editing.id}/server-roles`, { serverRoles: next.serverRoles });
						}, `Saved changes for ${editing.username}.`);
						if (ok) setEditing(null);
					}}
				/>
			)}
		</Box>
	);
}

/** "Every server", or a chosen few. */
function ServerPicker({ names, value, onChange }) {
	const all = value === null;
	return (
		<Box sx={{ minWidth: 220 }}>
			<TipRow id="users.servers">
				<FormControlLabel control={<Checkbox size="small" checked={all} onChange={(e) => onChange(e.target.checked ? null : [])} />} label="Every server" />
			</TipRow>
			{!all && (
				<Box sx={{ display: "flex", flexDirection: "column", maxHeight: 160, overflow: "auto" }}>
					{names.map((n) => (
						<FormControlLabel key={n} control={<Checkbox size="small" checked={value.includes(n)} onChange={(e) => onChange(e.target.checked ? [...value, n] : value.filter((x) => x !== n))} />} label={n} />
					))}
				</Box>
			)}
		</Box>
	);
}

function AccessDialog({ user, serverNames, options, error, onClose, onSave }) {
	const [role, setRole] = React.useState(user.role);
	const [servers, setServers] = React.useState(Array.isArray(user.servers) ? user.servers : null);
	// Kept as one map and the rows are rebuilt from it, so a server list that loads late still gets its rows.
	const [perServer, setPerServer] = React.useState(() => user.serverRoles ?? null);
	const [password, setPassword] = React.useState("");
	const tooShort = password.length > 0 && password.length < 8;

	const rows = serverRoleRows(serverNames, perServer);
	const nextServerRoles = serverRolesFromRows(rows);
	// Compared the way it would be saved, so a server put back on the person's own access is not counted as a change.
	const serverRolesChanged = !sameServerRoles(nextServerRoles, serverRolesFromRows(serverRoleRows(serverNames, user.serverRoles)));
	const setRowRole = (server, value) => setPerServer(serverRolesFromRows(rows.map((r) => (r.server === server ? { ...r, role: value } : r))));
	// Administrators see every server anyway, so a role for one server means nothing to them and is not offered.
	const rowOptions = options.filter((o) => o.id !== "admin");

	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="xs">
			<DialogTitle>{user.username}: access and password</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				<TipRow id="users.role">
					<TextField select fullWidth size="small" label="Access" value={role} onChange={(e) => setRole(e.target.value)}>
						{options.map(({ id, name }) => (
							<MenuItem key={id} value={id}>
								{name}
							</MenuItem>
						))}
					</TextField>
				</TipRow>
				{canBeLimited(role) && <ServerPicker names={serverNames} value={servers} onChange={setServers} />}
				{role !== "admin" && serverNames.length > 0 && (
					<Box>
						<Typography variant="subtitle2">Different access on some servers</Typography>
						<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
							On a server left at "Same as their access", the access above applies.
						</Typography>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 220, overflow: "auto" }}>
							{rows.map(({ server, role: value }) => (
								<Box key={server} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
									<Typography sx={{ flex: "1 1 120px", minWidth: 0, wordBreak: "break-word" }}>{server}</Typography>
									<TextField
										select
										size="small"
										value={value}
										onChange={(e) => setRowRole(server, e.target.value)}
										sx={{ flex: "0 1 180px", minWidth: 140 }}
										inputProps={{ "aria-label": `Access on ${server}` }}
									>
										<MenuItem value="">Same as their access</MenuItem>
										{rowOptions.map(({ id, name }) => (
											<MenuItem key={id} value={id}>
												{name}
											</MenuItem>
										))}
										{/* A role that has since been deleted still shows, so the row is not blank. */}
										{value !== "" && !rowOptions.some((o) => o.id === value) && <MenuItem value={value}>{value}</MenuItem>}
									</TextField>
								</Box>
							))}
						</Box>
					</Box>
				)}
				<TipRow id="users.password">
					<TextField
						fullWidth
						size="small"
						type="password"
						label="Set a new password (optional)"
						autoComplete="new-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						helperText={tooShort ? "At least 8 characters." : undefined}
						error={tooShort}
					/>
				</TipRow>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button
					variant="contained"
					disabled={tooShort}
					onClick={() => onSave({ role, servers, password, serverRoles: role !== "admin" && serverRolesChanged ? nextServerRoles : undefined })}
				>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default UsersPage;
