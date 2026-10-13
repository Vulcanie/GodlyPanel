import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Menu, MenuItem, Select, TextField, Tooltip, Typography } from "@mui/material";
import { Close as CloseIcon, Shield as AdminIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";
import InfoTip from "./InfoTip";
import TipRow from "./TipRow";

/**
 * Kick and ban, and the game's whitelist, admin and ban lists. Only what the game can
 * really do is offered: a game with no console gets lists only, a game the panel can't
 * manage gets nothing.
 */
function PlayerAdminCard({ serverName, online = [] }) {
	const base = `/api/server/${encodeURIComponent(serverName)}`;
	const toast = useToast();
	const [info, setInfo] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [who, setWho] = React.useState("");
	const [reason, setReason] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [addTo, setAddTo] = React.useState({});
	const [addLevel, setAddLevel] = React.useState(""); // "" = the server's default
	const [levelMenu, setLevelMenu] = React.useState(null); // { anchor, name, level }
	const [banning, setBanning] = React.useState(null); // the name to ban, while the question is open
	const [banOpen, setBanOpen] = React.useState(false);
	// A reply that arrives after the person has moved to another server must not be shown on that server's page.
	const current = React.useRef(base);
	current.current = base;

	const load = React.useCallback(async () => {
		try {
			const next = await api.get(`${base}/player-admin`);
			if (current.current === base) setInfo(next);
		} catch (e) {
			if (current.current === base) setError(e.message);
		}
	}, [base]);
	React.useEffect(() => {
		// Another server has other lists and other people: start clean.
		setInfo(null);
		setError(null);
		setWho("");
		setReason("");
		setAddTo({});
		setAddLevel("");
		setLevelMenu(null);
		setBanOpen(false);
		load();
	}, [load]);

	/** Runs one action; true when the game accepted it. */
	const act = async (promise, done) => {
		setBusy(true);
		setError(null);
		let ok = false;
		try {
			const r = await promise;
			if (r.ok === false) setError(r.response || "The game said nothing changed.");
			else {
				toast(done(r));
				ok = true;
			}
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
		return ok;
	};

	const kick = (name) => act(api.post(`${base}/players/kick`, { player: name, reason: reason || undefined }), () => `Kicked ${name}.`);
	const ban = (name) => act(api.post(`${base}/players/ban`, { player: name, reason: reason || undefined }), () => `Banned ${name}.`);
	const unban = (name) => act(api.post(`${base}/players/unban`, { player: name }), () => `Unbanned ${name}.`);
	const add = async (list) => {
		const name = (addTo[list] ?? "").trim();
		if (!name) return;
		const ok = await act(
			api.post(`${base}/player-lists/${list}`, { player: name, ...(list === "admins" && addLevel !== "" ? { level: Number(addLevel) } : {}) }),
			(r) => r.message || `Added ${name}.`,
		);
		if (ok) setAddTo((a) => ({ ...a, [list]: "" }));
	};
	const setLevel = (name, level) => act(api.put(`${base}/player-lists/admins/${encodeURIComponent(name)}/level`, { level }), (r) => r.message || `Set ${name} to level ${level}.`);
	const remove = (list, name) => act(api.del(`${base}/player-lists/${list}/${encodeURIComponent(name)}`), (r) => r.message || `Removed ${name}.`);

	if (!info) return error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : <CircularProgress size={20} />;
	if (!info.supported) {
		return (
			<SectionCard title="Manage players" icon={<AdminIcon />}>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					The panel can't kick or ban on this game yet. Use the game's own admin tools.
				</Typography>
			</SectionCard>
		);
	}

	const canAct = info.kick || info.ban;
	const lists = info.lists ?? [];
	const levelList = lists.find((l) => l.levels);
	const levelText = (list) =>
		`${(list.levels ?? []).map((l) => `${l.level} ${l.name}: ${l.description}`).join(" ")} New operators get level ${list.defaultLevel} unless you choose another.`;

	return (
		<SectionCard title="Manage players" icon={<AdminIcon />}>
			{error && (
				<Alert severity="warning" onClose={() => setError(null)} sx={{ mb: 1 }}>
					{error}
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
						<TipRow id="server.players.who" sx={{ flex: "1 1 200px", maxWidth: 320 }}>
							<TextField fullWidth size="small" label={`Player (${info.who?.label ?? "name"})`} value={who} onChange={(e) => setWho(e.target.value)} />
						</TipRow>
						<TipRow id="server.players.reason" sx={{ flex: "1 1 200px", maxWidth: 320 }}>
							<TextField fullWidth size="small" label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
						</TipRow>
						{info.kick && info.canKick && (
							<Button size="small" variant="outlined" disabled={busy || !who.trim()} onClick={() => kick(who.trim())}>
								Kick
							</Button>
						)}
						{info.ban && info.canBan && (
							<Button
								size="small"
								variant="outlined"
								color="error"
								disabled={busy || !who.trim()}
								onClick={() => {
									setBanning(who.trim());
									setBanOpen(true);
								}}
							>
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
								<Chip key={String(p.name)} size="small" label={String(p.name)} onClick={() => setWho(String(p.name))} />
							))}
						</Box>
					)}
				</Box>
			)}

			{lists.map((list) => (
				<Box key={list.id} sx={{ mb: 1.5 }}>
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Typography variant="body2" sx={{ fontWeight: 500 }}>
							{list.label} ({(list.entries ?? []).length})
						</Typography>
						<InfoTip id="server.players.lists" />
						{list.levels && <InfoTip id="server.players.level" text={levelText(list)} />}
					</Box>
					{list.levels && info.running && (
						<Typography variant="caption" sx={{ color: "warning.main", display: "block" }}>
							The server is running, so levels can't be changed until it is stopped.
						</Typography>
					)}
					<Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", my: 0.75 }}>
						{(list.entries ?? []).length === 0 && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								Empty.
							</Typography>
						)}
						{(list.entries ?? []).map((e) => (
							<Chip
								key={e.id}
								size="small"
								variant="outlined"
								label={`${e.name && e.name !== e.id ? `${e.name}${e.reason ? ` · ${e.reason}` : ""}` : e.id}${list.levels && e.level ? ` · Level ${e.level}` : ""}`}
								onClick={list.levels && info.canBan ? (ev) => setLevelMenu({ anchor: ev.currentTarget, name: e.name ?? e.id, level: e.level }) : undefined}
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
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
							<TextField
								size="small"
								placeholder={info.who?.hint}
								inputProps={{ "aria-label": `Add to ${list.label}` }}
								value={addTo[list.id] ?? ""}
								onChange={(e) => setAddTo((a) => ({ ...a, [list.id]: e.target.value }))}
								onKeyDown={(e) => e.key === "Enter" && add(list.id)}
							/>
							{list.levels && (
								<Tooltip title={info.running ? "A running server can only add at its default level. Stop it to choose." : ""}>
									<span>
										<Select
											size="small"
											displayEmpty
											disabled={info.running}
											value={info.running ? "" : addLevel}
											onChange={(e) => setAddLevel(e.target.value)}
											inputProps={{ "aria-label": "Operator level for the new name" }}
											sx={{ minWidth: 190 }}
										>
											<MenuItem value="">Server default (level {list.defaultLevel})</MenuItem>
											{list.levels.map((l) => (
												<MenuItem key={l.level} value={l.level}>
													Level {l.level} · {l.name}
												</MenuItem>
											))}
										</Select>
									</span>
								</Tooltip>
							)}
							<Button size="small" disabled={busy || !(addTo[list.id] ?? "").trim()} onClick={() => add(list.id)}>
								Add
							</Button>
						</Box>
					)}
				</Box>
			))}
			<Menu anchorEl={levelMenu?.anchor} open={Boolean(levelMenu)} onClose={() => setLevelMenu(null)}>
				{(levelList?.levels ?? []).map((l) => (
					<MenuItem
						key={l.level}
						selected={levelMenu?.level === l.level}
						disabled={info.running}
						onClick={() => {
							const name = levelMenu.name;
							setLevelMenu(null);
							setLevel(name, l.level);
						}}
					>
						Level {l.level} · {l.name}
					</MenuItem>
				))}
				{info.running && <MenuItem disabled>Stop the server to change levels</MenuItem>}
			</Menu>

			<ConfirmDialog
				open={banOpen && Boolean(banning)}
				title={`Ban ${banning} from ${serverName}?`}
				confirmLabel="Ban"
				color="error"
				onConfirm={() => {
					setBanOpen(false);
					ban(banning);
				}}
				onClose={() => setBanOpen(false)}
			>
				They will not be able to join until they are unbanned.
			</ConfirmDialog>
		</SectionCard>
	);
}

export default PlayerAdminCard;
