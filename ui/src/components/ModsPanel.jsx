import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Divider, FormControlLabel, IconButton, Paper, Switch, TextField, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon, UploadFile as UploadIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { copyToClipboard } from "../utils/clipboard";
import { formatBytes } from "../utils/format";
import { canUseAddress, describeInstall, driftNotices, lockEntryForMod, pendingUpdates, updateLabel } from "../utils/modSource";
import { adminPackDownloads, packLinks } from "../utils/packShare";
import { useOperation, operationLabel } from "../OperationsContext";
import InfoTip from "./InfoTip";
import ConfirmDialog from "./ui/ConfirmDialog";
import ModSourceBox from "./ModSourceBox";

const ACCEPT_HINT = { ".jar": ".jar", ".pak": ".pak", ".dll": ".dll", archive: ".zip" };

/** Mods for one server. Every game takes them differently; the panel offers what this one supports. */
function ModsPanel({ serverName, serverStatus }) {
	const base = `/api/server/${encodeURIComponent(serverName)}/mods`;
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [warnings, setWarnings] = React.useState([]);
	const [busy, setBusy] = React.useState(false);
	const [text, setText] = React.useState("");
	const [removing, setRemoving] = React.useState(null);
	// The mod lock (what the panel installed, and how the folder now differs) and the last update check. Both are only loaded for a game
	// that takes pasted addresses, since only those installs write the lock.
	const [lock, setLock] = React.useState(null);
	const [updates, setUpdates] = React.useState(null);
	const [checking, setChecking] = React.useState(false);
	// The share link (off, or on with its three addresses) and the community view's public address, which players need to reach it.
	const [share, setShare] = React.useState(null);
	const [community, setCommunity] = React.useState(null);
	const [rotating, setRotating] = React.useState(false);
	const [copied, setCopied] = React.useState("");
	const operation = useOperation(serverName);
	const fileInput = React.useRef(null);

	const loadLock = React.useCallback(async () => {
		// A failed lock read must not break the panel: the list still shows, just without version chips and drift notes.
		try {
			setLock(await api.get(`${base}/lock`));
		} catch {
			setLock(null);
		}
	}, [base]);

	const load = React.useCallback(async () => {
		try {
			const next = await api.get(base);
			setData(next);
			setError(null);
			if (canUseAddress(next)) await loadLock();
		} catch (e) {
			setError(e.message);
		}
	}, [base, loadLock]);

	React.useEffect(() => {
		load();
	}, [load]);

	const loadShare = React.useCallback(async () => {
		try {
			setShare(await api.get(`${base}/share`));
		} catch (e) {
			setShare(null);
			setError(e.message);
		}
	}, [base]);

	const loadCommunity = React.useCallback(async () => {
		// A missing community view is not an error here: players just have no address to reach, and the section says so.
		try {
			setCommunity(await api.get("/api/community"));
		} catch {
			setCommunity(null);
		}
	}, []);

	// Read once the game's data is in, so the share section has what it needs. It is not read again on every change to the mods.
	const supported = Boolean(data?.supported);
	React.useEffect(() => {
		if (!supported) return;
		loadShare();
		loadCommunity();
	}, [supported, loadShare, loadCommunity]);

	const checkForUpdates = async () => {
		setChecking(true);
		try {
			const result = await api.get(`${base}/updates`);
			setUpdates(Array.isArray(result?.updates) ? result.updates : []);
		} catch (e) {
			setError(e.message);
		} finally {
			setChecking(false);
		}
	};

	const run = async (fn, done) => {
		setBusy(true);
		setError(null);
		setNotice(null);
		setWarnings([]);
		try {
			const result = await fn();
			// The caller's own line wins, so an update reads "Updated X." rather than the list of files it touched.
			if (done) setNotice(done);
			else if (result?.installed?.length) setNotice(`Installed: ${result.installed.join(", ")}`);
			if (result?.unverified?.length || result?.skipped?.length) setWarnings(describeInstall(result).warnings);
			await load();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const upload = (file) => {
		if (!file) return;
		const form = new FormData();
		form.append("mod", file);
		run(() => api.upload(`${base}/upload`, form));
	};

	if (!data) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress size={24} />;
	if (!data.supported) {
		return <Alert severity="info">The panel doesn't manage mods for this game. Mods can still be added by hand in the server's folder.</Alert>;
	}

	const running = serverStatus?.online;
	const locked = running || busy || Boolean(operation);
	const adapter = data.adapter;
	const accepts = (data.accepts ?? []).map((a) => ACCEPT_HINT[a] ?? a);
	// The version the panel recorded for a row, if it installed that mod. A row it did not install shows no version.
	const installedVersion = (name) => lockEntryForMod(name, lock?.entries)?.version;
	const updateOne = (row) => run(() => api.post(`${base}/update`, { id: row.id }), `Updated ${row.name}.`).then(checkForUpdates);

	const shareOn = share?.enabled === true;
	const links = packLinks(share, community);
	const adminLinks = adminPackDownloads(serverName);
	// The Modrinth pack is offered only for a Minecraft modpack, the one game the panel can make it for.
	const mrpackOn = share?.mrpack === true;
	const linkRows =
		links.state === "ready"
			? [
					{ key: "list", label: "Mod list", url: links.links.list },
					{ key: "zip", label: "Mod pack (zip)", url: links.links.zip },
					...(mrpackOn ? [{ key: "mrpack", label: "Modrinth pack (.mrpack)", url: links.links.mrpack }] : []),
					{ key: "manifest", label: "Manifest", url: links.links.manifest },
				]
			: [];

	// Turning the link on or off changes what players can reach, so the share state is read again straight after.
	const setSharing = (enabled) => run(() => api.put(`${base}/share`, { enabled }), enabled ? "Sharing is on." : "Sharing is off.").then(loadShare);
	const makeNewLink = () => {
		setRotating(false);
		run(() => api.post(`${base}/share/rotate`), "Made a new link.").then(loadShare);
	};
	// Not navigator.clipboard: the panel is usually opened over plain http, where the browser switches that off.
	const copyLink = (what, text) =>
		copyToClipboard(text, (result) => {
			if (result === "Copied!") {
				setCopied(what);
				setTimeout(() => setCopied(""), 2000);
			} else setError("Couldn't copy to the clipboard. Select the text and copy it yourself.");
		});

	const add = () => {
		const value = text.trim();
		if (!value) return;
		const route = adapter === "workshop" ? "workshop" : adapter === "thunderstore" ? "thunderstore" : "script-id";
		const body = adapter === "thunderstore" ? { package: value } : { id: value };
		run(() => api.post(`${base}/${route}`, body)).then(() => setText(""));
	};

	return (
		<Box>
			{running && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Stop the server to change its mods. A game reads its mods when it starts.
				</Alert>
			)}
			{operation && !running && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{operationLabel(operation)}
				</Alert>
			)}
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}
			{warnings.length > 0 && (
				<Alert severity="warning" onClose={() => setWarnings([])} sx={{ mb: 2 }}>
					{warnings.map((w, i) => (
						<Typography key={i} variant="body2">
							{w}
						</Typography>
					))}
				</Alert>
			)}

			<Alert severity="info" variant="outlined" sx={{ mb: 2 }} data-testid="mods-no-explanations">
				<strong>Mods will not have explanations.</strong> The settings that belong to a mod show up in the server's Settings with no explanation, because they depend on the mod. The mod's own page says what they do.
			</Alert>

			<Paper sx={{ p: 2, mb: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center" }}>
					<Typography variant="subtitle1">{data.label}</Typography>
					<InfoTip id="server.mods.add" />
				</Box>
				{data.note && (
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
						{data.note}
					</Typography>
				)}
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
					{adapter !== "script-ids" && (
						<>
							<input ref={fileInput} type="file" hidden accept={accepts.join(",")} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
							<Button variant="contained" startIcon={<UploadIcon />} disabled={locked} onClick={() => fileInput.current?.click()}>
								Add a file ({accepts.join(" / ")})
							</Button>
						</>
					)}
					{adapter !== "folder" && (
						<>
							<TextField
								size="small"
								label={adapter === "workshop" ? "Steam Workshop item number" : adapter === "thunderstore" ? "Thunderstore package (Owner-Name)" : "Mod number"}
								value={text}
								onChange={(e) => setText(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && !locked && add()}
								sx={{ minWidth: 280 }}
								disabled={locked}
							/>
							<Button variant="outlined" disabled={locked || !text.trim()} onClick={add}>
								{busy ? "Working…" : "Add"}
							</Button>
						</>
					)}
					{busy && <CircularProgress size={18} />}
				</Box>
				{adapter === "thunderstore" && !data.frameworkInstalled && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						BepInEx isn't installed yet. It is added automatically with the first mod.
					</Typography>
				)}
				{adapter === "workshop" && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						Workshop items are downloaded with SteamCMD. Some need a signed-in Steam account and can't be fetched this way.
					</Typography>
				)}
				{canUseAddress(data) && (
					<>
						<Divider sx={{ my: 2 }} />
						<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
							Or paste a link
						</Typography>
						<ModSourceBox
							base={base}
							locked={locked}
							onResult={async (result) => {
								const described = describeInstall(result);
								setError(null);
								setNotice(described.message);
								setWarnings(described.warnings);
								await load();
								// A check made before this install is out of date now, so it runs again if one was shown.
								if (updates) await checkForUpdates();
							}}
							onError={(message) => setError(message)}
						/>
					</>
				)}
			</Paper>

			<Paper>
				<Typography variant="subtitle1" sx={{ px: 2, pt: 2 }}>
					Installed ({data.mods.length})
				</Typography>
				{driftNotices(lock).map((n, i) => (
					<Alert key={i} severity={n.severity} sx={{ mx: 2, mt: 1 }}>
						{n.text}
					</Alert>
				))}
				{data.mods.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
						None.
					</Typography>
				) : (
					data.mods.map((m) => (
						<Box key={m.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderTop: (t) => `1px solid ${t.palette.divider}`, opacity: m.enabled ? 1 : 0.55 }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2">{m.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{m.type === "folder" ? "folder" : m.type === "id" ? "mod number" : "file"}
									{m.sizeBytes ? ` · ${formatBytes(m.sizeBytes)}` : ""}
								</Typography>
							</Box>
							{installedVersion(m.name) && <Chip size="small" variant="outlined" label={installedVersion(m.name)} />}
							{m.missing && <Chip size="small" color="warning" label="file missing" />}
							{adapter !== "script-ids" && (
								<Tooltip title={m.enabled ? "Turn off (kept on disk)" : "Turn on"}>
									<span>
										<Switch size="small" checked={m.enabled} disabled={locked} onChange={(e) => run(() => api.put(`${base}/enabled`, { id: m.id, enabled: e.target.checked }))} />
									</span>
								</Tooltip>
							)}
							<Tooltip title="Remove">
								<span>
									<IconButton size="small" disabled={locked} onClick={() => setRemoving(m)}>
										<DeleteIcon fontSize="small" />
									</IconButton>
								</span>
							</Tooltip>
						</Box>
					))
				)}
			</Paper>

			{canUseAddress(data) && lock?.entries?.length > 0 && (
				<Paper sx={{ p: 2, mt: 2 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
						<Typography variant="subtitle1" sx={{ flex: 1 }}>
							Updates
						</Typography>
						{/* Checking only asks the sources, so it works while the server runs. Nothing is updated until a person presses Update. */}
						<Button variant="outlined" disabled={checking} onClick={checkForUpdates}>
							{checking ? "Checking…" : "Check for updates"}
						</Button>
					</Box>
					{updates && pendingUpdates(updates).length === 0 && (
						<Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
							{/* Only "current" rows mean up to date; a row that needs a hand check or failed must not be read as fine. */}
							{updates.every((row) => row.status === "current") ? "Everything is up to date." : "Nothing can be updated here."}
						</Typography>
					)}
					{updates?.map((row) => (
						<Box key={row.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 1, mt: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2">{row.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{updateLabel(row)}
								</Typography>
							</Box>
							{row.status === "update" && (
								<Button size="small" variant="contained" disabled={locked} onClick={() => updateOne(row)}>
									Update
								</Button>
							)}
						</Box>
					))}
				</Paper>
			)}

			<Paper sx={{ p: 2, mt: 2 }}>
				<Typography variant="subtitle1">Share with players</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, mb: 1.5 }}>
					Players can download the mods this server runs from a link, without an account. Anyone with the link can download them, so only share it with your players.
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
					<FormControlLabel
						sx={{ ml: 0, mr: 0 }}
						control={<Switch checked={shareOn} disabled={busy || !share} onChange={(e) => setSharing(e.target.checked)} />}
						label="Share a link"
					/>
					{shareOn && (
						<Button variant="outlined" color="warning" disabled={busy} onClick={() => setRotating(true)}>
							Make a new link
						</Button>
					)}
				</Box>
				{links.state === "no_address" && (
					<Alert severity="info" sx={{ mt: 1.5 }}>
						Turn on the community view in Settings to get an address players can reach.
					</Alert>
				)}
				{linkRows.map((row) => (
					<Box key={row.key} sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 1, mt: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
						<Typography variant="body2" sx={{ minWidth: 120 }}>
							{row.label}
						</Typography>
						<TextField size="small" fullWidth value={row.url} InputProps={{ readOnly: true }} inputProps={{ "aria-label": row.label }} />
						<Button size="small" onClick={() => copyLink(row.key, row.url)}>
							{copied === row.key ? "Copied!" : "Copy"}
						</Button>
					</Box>
				))}
				<Divider sx={{ my: 2 }} />
				<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
					Your own copies of the server's mods
				</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
					<Button variant="outlined" href={adminLinks.zip} download>
						Download pack (zip)
					</Button>
					<Button variant="outlined" href={adminLinks.list} download>
						Download list
					</Button>
					{mrpackOn && (
						<Button variant="outlined" href={adminLinks.mrpack} download>
							Download Modrinth pack
						</Button>
					)}
				</Box>
			</Paper>

			<ConfirmDialog
				open={rotating}
				title="Make a new link?"
				confirmLabel="Make a new link"
				color="warning"
				onClose={() => setRotating(false)}
				onConfirm={makeNewLink}
			>
				The old link stops working. Players who have it will need the new one.
			</ConfirmDialog>

			<ConfirmDialog
				open={Boolean(removing)}
				title={`Remove ${removing?.name ?? "this mod"}?`}
				confirmLabel="Remove it"
				color="error"
				onClose={() => setRemoving(null)}
				onConfirm={() => {
					const mod = removing;
					setRemoving(null);
					run(() => api.post(`${base}/remove`, { id: mod.id }), `Removed ${mod.name}.`);
				}}
			>
				It is taken off the server. {removing?.type === "folder" ? "The folder is deleted from disk." : "Its file is deleted from disk."}
			</ConfirmDialog>
		</Box>
	);
}

export default ModsPanel;
