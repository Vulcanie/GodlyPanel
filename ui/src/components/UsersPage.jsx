import React from "react";
import {
	Box,
	Button,
	Typography,
	Paper,
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
} from "@mui/icons-material";
import { api } from "../api/client";
import { ROLE_LABELS } from "../permissions";

// Lets an admin invite people from the community to view server status
// without handing them control of anything.
function UsersPage({ onBack, currentUser }) {
	const [users, setUsers] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [role, setRole] = React.useState("guest");
	const [servers, setServers] = React.useState(null); // null = every server (moderators only)
	const [serverNames, setServerNames] = React.useState([]);
	const [editing, setEditing] = React.useState(null);

	const load = React.useCallback(async () => {
		try {
			setUsers(await api.get("/api/users"));
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
		api.get("/api/status").then((s) => setServerNames(Object.keys(s).sort())).catch(() => {});
	}, [load]);

	const run = async (fn) => {
		setBusy(true);
		setError(null);
		try {
			await fn();
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const create = () =>
		run(async () => {
			await api.post("/api/users", { username: username.trim(), password, role, ...(role === "moderator" ? { servers } : {}) });
			setUsername("");
			setPassword("");
			setRole("guest");
			setServers(null);
		});

	const canCreate = username.trim().length >= 3 && password.length >= 8 && !busy;

	return (
		<Box sx={{ mt: 2 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<Typography variant="h5" gutterBottom>
				People
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
				Viewers can see which servers are up, who's playing, and how to join, but can't change anything.
				Moderators can also start, stop, restart and update servers, take backups, read logs and see who is on, but can't see passwords or settings, delete anything, restore a backup, or manage people.
				Administrators can do everything.
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 3 }}>
				<Typography variant="subtitle2" sx={{ mb: 2 }}>
					Add someone
				</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
					<TextField
						label="Username"
						size="small"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
					<TextField
						label="Password"
						size="small"
						type="password"
						helperText="At least 8 characters"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<TextField
						select
						label="Access"
						size="small"
						sx={{ minWidth: 160 }}
						value={role}
						onChange={(e) => setRole(e.target.value)}
					>
						<MenuItem value="guest">Viewer</MenuItem>
						<MenuItem value="moderator">Moderator</MenuItem>
						<MenuItem value="admin">Administrator</MenuItem>
					</TextField>
					{role === "moderator" && <ServerPicker names={serverNames} value={servers} onChange={setServers} />}
					<Button variant="contained" disabled={!canCreate} onClick={create}>
						Add
					</Button>
				</Box>
			</Paper>

			{!users ? (
				<CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
			) : (
				<Paper>
					{users.map((u) => {
						const isSelf = u.id === currentUser?.id;
						return (
							<Box
								key={u.id}
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1.5,
									px: 2,
									py: 1.5,
									borderBottom: (t) => `1px solid ${t.palette.divider}`,
									opacity: u.disabled ? 0.5 : 1,
									"&:last-of-type": { borderBottom: 0 },
								}}
							>
								<Typography sx={{ flex: 1 }}>
									{u.username}
									{isSelf && (
										<Typography component="span" variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
											(you)
										</Typography>
									)}
								</Typography>
								<Chip
									size="small"
									label={ROLE_LABELS[u.role] ?? u.role}
									color={u.role === "admin" ? "primary" : u.role === "moderator" ? "secondary" : "default"}
								/>
								{u.role === "moderator" && (
									<Chip size="small" variant="outlined" label={Array.isArray(u.servers) ? `${u.servers.length} server${u.servers.length === 1 ? "" : "s"}` : "All servers"} />
								)}
								<Tooltip title="Change access">
									<span>
										<IconButton size="small" disabled={busy || isSelf} onClick={() => setEditing(u)}>
											<EditIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
								{u.disabled && <Chip size="small" label="Suspended" color="warning" />}

								<Tooltip title={u.disabled ? "Restore access" : "Suspend access"}>
									<span>
										<IconButton
											size="small"
											disabled={busy || isSelf}
											onClick={() =>
												run(() =>
													api.put(`/api/users/${u.id}/disabled`, { disabled: !u.disabled }),
												)
											}
										>
											{u.disabled ? (
												<CheckCircleIcon fontSize="small" />
											) : (
												<BlockIcon fontSize="small" />
											)}
										</IconButton>
									</span>
								</Tooltip>
								<Tooltip title="Remove">
									<span>
										<IconButton
											size="small"
											disabled={busy || isSelf}
											onClick={() => run(() => api.del(`/api/users/${u.id}`))}
										>
											<DeleteIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
							</Box>
						);
					})}
				</Paper>
			)}

			{editing && (
				<AccessDialog
					user={editing}
					serverNames={serverNames}
					onClose={() => setEditing(null)}
					onSave={(next) =>
						run(async () => {
							// The password first: it signs them out, and the role change would do the same.
								if (next.password) await api.put(`/api/users/${editing.id}/password`, { password: next.password });
								if (next.role !== editing.role) await api.put(`/api/users/${editing.id}/role`, { role: next.role });
							if (next.role === "moderator") await api.put(`/api/users/${editing.id}/servers`, { servers: next.servers });
							setEditing(null);
						})
					}
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
			<FormControlLabel control={<Checkbox size="small" checked={all} onChange={(e) => onChange(e.target.checked ? null : [])} />} label="Every server" />
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

function AccessDialog({ user, serverNames, onClose, onSave }) {
	const [role, setRole] = React.useState(user.role);
	const [servers, setServers] = React.useState(Array.isArray(user.servers) ? user.servers : null);
	const [password, setPassword] = React.useState("");
	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="xs">
			<DialogTitle>{user.username}: access and password</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
				<TextField select size="small" label="Access" value={role} onChange={(e) => setRole(e.target.value)}>
					<MenuItem value="guest">Viewer</MenuItem>
					<MenuItem value="moderator">Moderator</MenuItem>
					<MenuItem value="admin">Administrator</MenuItem>
				</TextField>
				{role === "moderator" && <ServerPicker names={serverNames} value={servers} onChange={setServers} />}
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					A change of access signs them out; they have to sign in again for it to apply.
				</Typography>
				<TextField
					size="small"
					type="password"
					label="Set a new password (optional)"
					autoComplete="new-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					helperText={password && password.length < 8 ? "At least 8 characters." : "Leave empty to keep their current password. Setting one signs them out everywhere, so tell them the new one."}
					error={password.length > 0 && password.length < 8}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" disabled={password.length > 0 && password.length < 8} onClick={() => onSave({ role, servers, password })}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default UsersPage;
