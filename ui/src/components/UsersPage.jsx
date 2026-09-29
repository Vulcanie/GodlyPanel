import React from "react";
import {
	Box,
	Button,
	Typography,
	Paper,
	TextField,
	MenuItem,
	Alert,
	Chip,
	IconButton,
	Tooltip,
	CircularProgress,
} from "@mui/material";
import {
	ArrowBack as ArrowBackIcon,
	Delete as DeleteIcon,
	Block as BlockIcon,
	CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { api } from "../api/client";

// Lets an admin invite people from the community to view server status
// without handing them control of anything.
function UsersPage({ onBack, currentUser }) {
	const [users, setUsers] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [role, setRole] = React.useState("guest");

	const load = React.useCallback(async () => {
		try {
			setUsers(await api.get("/api/users"));
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
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
			await api.post("/api/users", { username: username.trim(), password, role });
			setUsername("");
			setPassword("");
			setRole("guest");
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
				Viewers can see which servers are up, who's playing, and how to join.
				They can't change anything or see passwords and configuration.
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
						<MenuItem value="admin">Administrator</MenuItem>
					</TextField>
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
									borderBottom: "1px solid rgba(255,255,255,0.06)",
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
									label={u.role === "admin" ? "Administrator" : "Viewer"}
									color={u.role === "admin" ? "primary" : "default"}
								/>
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
		</Box>
	);
}

export default UsersPage;
