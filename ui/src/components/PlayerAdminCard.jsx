import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { api } from "../api/client";

/**
 * Kick and ban, and the game's whitelist, admin and ban lists. Only what the game can
 * really do is offered: a game with no console gets lists only, a game the panel can't
 * manage gets nothing.
 */
function PlayerAdminCard({ serverName, online = [] }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const [info, setInfo] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [message, setMessage] = React.useState(null);
	const [who, setWho] = React.useState("");
	const [reason, setReason] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [addTo, setAddTo] = React.useState({});

	const load = React.useCallback(async () => {
		try {
			setInfo(await api.get(`${base}/player-admin`));
		} catch (e) {
			setError(e.message);
		}
	}, [base]);
	React.useEffect(() => {
		load();
	}, [load]);

	const act = async (promise, done) => {
		setBusy(true);
		setError(null);
		setMessage(null);
		try {
			const r = await promise;
			if (r.ok === false) setError(r.response || "The game said nothing changed.");
			else setMessage(done(r));
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const kick = (name) => act(api.post(`${base}/players/kick`, { player: name, reason: reason || undefined }), () => `Kicked ${name}.`);
	const ban = (name) => {
		if (!window.confirm(`Ban ${name} from ${serverName}?`)) return;
		act(api.post(`${base}/players/ban`, { player: name, reason: reason || undefined }), () => `Banned ${name}.`);
	};
	const unban = (name) => act(api.post(`${base}/players/unban`, { player: name }), () => `Unbanned ${name}.`);
	const add = (list) => {
		const name = (addTo[list] ?? "").trim();
		if (!name) return;
		act(api.post(`${base}/player-lists/${list}`, { player: name }), (r) => r.message || `Added ${name}.`).then(() => setAddTo((a) => ({ ...a, [list]: "" })));
	};
	const remove = (list, name) => act(api.del(`${base}/player-lists/${list}/${encodeURIComponent(name)}`), (r) => r.message || `Removed ${name}.`);

	if (!info) return error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : <CircularProgress size={20} />;
	if (!info.supported) {
		return (
			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle1">Manage players</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					The panel can't kick or ban on this game yet. Use the game's own admin tools.
				</Typography>
			</Paper>
		);
	}

	const canAct = info.kick || info.ban;

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Typography variant="subtitle1" sx={{ mb: 1 }}>
				Manage players
			</Typography>
			{error && (
				<Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 1 }}>
					{error}
				</Alert>
			)}
			{message && (
				<Alert severity="success" onClose={() => setMessage(null)} sx={{ mb: 1 }}>
					{message}
				</Alert>
			)}
			{info.note && (
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
					{info.note}
				</Typography>
			)}
			{info.listError && (
				<Alert severity="info" sx={{ mb: 1 }}>
					{info.listError}
				</Alert>
			)}

			{canAct && (
				<Box sx={{ mb: 2 }}>
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
						<TextField size="small" label={`Player (${info.who.label})`} value={who} onChange={(e) => setWho(e.target.value)} sx={{ minWidth: 200 }} />
						<TextField size="small" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ minWidth: 200 }} />
						{info.kick && info.canKick && (
							<Button size="small" variant="outlined" disabled={busy || !who.trim()} onClick={() => kick(who.trim())}>
								Kick
							</Button>
						)}
						{info.ban && info.canBan && (
							<Button size="small" variant="outlined" color="error" disabled={busy || !who.trim()} onClick={() => ban(who.trim())}>
								Ban
							</Button>
						)}
					</Box>
					{online.length > 0 && (
						<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1, alignItems: "center" }}>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								On now, click to fill in:
							</Typography>
							{online.map((p) => (
								<Chip key={p.name} size="small" label={p.name} onClick={() => setWho(p.name)} />
							))}
						</Box>
					)}
				</Box>
			)}

			{info.lists.map((list) => (
				<Box key={list.id} sx={{ mb: 1.5 }}>
					<Typography variant="body2" sx={{ fontWeight: 500 }}>
						{list.label} ({list.entries.length})
					</Typography>
					<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", my: 0.75 }}>
						{list.entries.length === 0 && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								Empty.
							</Typography>
						)}
						{list.entries.map((e) => (
							<Chip
								key={e.id}
								size="small"
								variant="outlined"
								label={e.name && e.name !== e.id ? `${e.name}${e.reason ? ` · ${e.reason}` : ""}` : e.id}
								onDelete={info.canBan ? () => (list.readOnly && list.id === "bans" ? unban(e.id) : remove(list.id, e.id)) : undefined}
								deleteIcon={
									<Tooltip title={list.id === "bans" ? "Unban" : "Remove"}>
										<CloseIcon />
									</Tooltip>
								}
							/>
						))}
					</Box>
					{info.canBan && !list.readOnly && (
						<Box sx={{ display: "flex", gap: 1 }}>
							<TextField size="small" placeholder={info.who.hint} value={addTo[list.id] ?? ""} onChange={(e) => setAddTo((a) => ({ ...a, [list.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add(list.id)} />
							<Button size="small" disabled={busy || !(addTo[list.id] ?? "").trim()} onClick={() => add(list.id)}>
								Add
							</Button>
						</Box>
					)}
				</Box>
			))}
		</Paper>
	);
}

export default PlayerAdminCard;
