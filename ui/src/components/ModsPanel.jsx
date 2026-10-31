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
import { t, useT, errorText } from "../i18n";

const ACCEPT_HINT = { ".jar": ".jar", ".pak": ".pak", ".dll": ".dll", archive: ".zip" };

/** Mods for one server. Every game takes them differently; the panel offers what this one supports. */
function ModsPanel({ serverName, serverStatus }) {
	useT();
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
			setError(errorText(e));
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
			setError(errorText(e));
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
			setError(errorText(e));
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
			else if (result?.installed?.length) setNotice(t("mods.installed", { list: result.installed.join(", ") }));
			if (result?.unverified?.length || result?.skipped?.length) setWarnings(describeInstall(result).warnings);
			await load();
		} catch (e) {
			setError(errorText(e));
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
		return <Alert severity="info">{t("mods.unsupported")}</Alert>;
	}

	const running = serverStatus?.online;
	const locked = running || busy || Boolean(operation);
	const adapter = data.adapter;
	const accepts = (data.accepts ?? []).map((a) => ACCEPT_HINT[a] ?? a);
	// The version the panel recorded for a row, if it installed that mod. A row it did not install shows no version.
	const installedVersion = (name) => lockEntryForMod(name, lock?.entries)?.version;
	const updateOne = (row) => run(() => api.post(`${base}/update`, { id: row.id }), t("mods.updated", { name: row.name })).then(checkForUpdates);

	const shareOn = share?.enabled === true;
	const links = packLinks(share, community);
	const adminLinks = adminPackDownloads(serverName);
	// The Modrinth pack is offered only for a Minecraft modpack, the one game the panel can make it for.
	const mrpackOn = share?.mrpack === true;
	const linkRows =
		links.state === "ready"
			? [
					{ key: "list", label: t("mods.linkList"), url: links.links.list },
					{ key: "zip", label: t("mods.linkZip"), url: links.links.zip },
					...(mrpackOn ? [{ key: "mrpack", label: t("mods.linkMrpack"), url: links.links.mrpack }] : []),
					{ key: "manifest", label: t("mods.linkManifest"), url: links.links.manifest },
				]
			: [];

	// Turning the link on or off changes what players can reach, so the share state is read again straight after.
	const setSharing = (enabled) => run(() => api.put(`${base}/share`, { enabled }), enabled ? t("mods.sharingOn") : t("mods.sharingOff")).then(loadShare);
	const makeNewLink = () => {
		setRotating(false);
		run(() => api.post(`${base}/share/rotate`), t("mods.madeLink")).then(loadShare);
	};
	// Not navigator.clipboard: the panel is usually opened over plain http, where the browser switches that off.
	const copyLink = (what, text) =>
		copyToClipboard(text, (result) => {
			if (result === "Copied!") {
				setCopied(what);
				setTimeout(() => setCopied(""), 2000);
			} else setError(t("mods.copyFailed"));
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
					{t("mods.stopToChange")}
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
				<strong>{t("mods.noExplanations")}</strong> {t("mods.noExplanationsBody")}
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
								{t("mods.addFile", { types: accepts.join(" / ") })}
							</Button>
						</>
					)}
					{adapter !== "folder" && (
						<>
							<TextField
								size="small"
								label={adapter === "workshop" ? t("mods.workshopLabel") : adapter === "thunderstore" ? t("mods.thunderstoreLabel") : t("mods.numberLabel")}
								value={text}
								onChange={(e) => setText(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && !locked && add()}
								sx={{ minWidth: 280 }}
								disabled={locked}
							/>
							<Button variant="outlined" disabled={locked || !text.trim()} onClick={add}>
								{busy ? t("common.working") : t("common.add")}
							</Button>
						</>
					)}
					{busy && <CircularProgress size={18} />}
				</Box>
				{adapter === "thunderstore" && !data.frameworkInstalled && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						{t("mods.bepinex")}
					</Typography>
				)}
				{adapter === "workshop" && (
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						{t("mods.workshopNote")}
					</Typography>
				)}
				{canUseAddress(data) && (
					<>
						<Divider sx={{ my: 2 }} />
						<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
							{t("mods.orPaste")}
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
					{t("mods.installedCount", { count: data.mods.length })}
				</Typography>
				{driftNotices(lock).map((n, i) => (
					<Alert key={i} severity={n.severity} sx={{ mx: 2, mt: 1 }}>
						{n.text}
					</Alert>
				))}
				{data.mods.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
						{t("mods.none")}
					</Typography>
				) : (
					data.mods.map((m) => (
						<Box key={m.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderTop: (t) => `1px solid ${t.palette.divider}`, opacity: m.enabled ? 1 : 0.55 }}>
							<Box sx={{ flex: 1 }}>
								<Typography variant="body2">{m.name}</Typography>
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{m.sizeBytes
										? t("mods.typeSize", { type: m.type === "folder" ? t("mods.typeFolder") : m.type === "id" ? t("mods.typeId") : t("mods.typeFile"), size: formatBytes(m.sizeBytes) })
										: m.type === "folder" ? t("mods.typeFolder") : m.type === "id" ? t("mods.typeId") : t("mods.typeFile")}
								</Typography>
							</Box>
							{installedVersion(m.name) && <Chip size="small" variant="outlined" label={installedVersion(m.name)} />}
							{m.missing && <Chip size="small" color="warning" label={t("mods.fileMissing")} />}
							{adapter !== "script-ids" && (
								<Tooltip title={m.enabled ? t("mods.turnOff") : t("mods.turnOn")}>
									<span>
										<Switch size="small" checked={m.enabled} disabled={locked} onChange={(e) => run(() => api.put(`${base}/enabled`, { id: m.id, enabled: e.target.checked }))} />
									</span>
								</Tooltip>
							)}
							<Tooltip title={t("common.remove")}>
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
							{t("mods.updates")}
						</Typography>
						{/* Checking only asks the sources, so it works while the server runs. Nothing is updated until a person presses Update. */}
						<Button variant="outlined" disabled={checking} onClick={checkForUpdates}>
							{checking ? t("mods.checking") : t("mods.checkUpdates")}
						</Button>
					</Box>
					{updates && pendingUpdates(updates).length === 0 && (
						<Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
							{/* Only "current" rows mean up to date; a row that needs a hand check or failed must not be read as fine. */}
							{updates.every((row) => row.status === "current") ? t("mods.upToDate") : t("mods.nothingUpdatable")}
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
									{t("mods.update")}
								</Button>
							)}
						</Box>
					))}
				</Paper>
			)}

			<Paper sx={{ p: 2, mt: 2 }}>
				<Typography variant="subtitle1">{t("mods.shareTitle")}</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, mb: 1.5 }}>
					{t("mods.shareBody")}
				</Typography>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
					<FormControlLabel
						sx={{ ml: 0, mr: 0 }}
						control={<Switch checked={shareOn} disabled={busy || !share} onChange={(e) => setSharing(e.target.checked)} />}
						label={t("mods.shareLink")}
					/>
					{shareOn && (
						<Button variant="outlined" color="warning" disabled={busy} onClick={() => setRotating(true)}>
							{t("mods.newLink")}
						</Button>
					)}
				</Box>
				{links.state === "no_address" && (
					<Alert severity="info" sx={{ mt: 1.5 }}>
						{t("mods.noAddress")}
					</Alert>
				)}
				{linkRows.map((row) => (
					<Box key={row.key} sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 1, mt: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
						<Typography variant="body2" sx={{ minWidth: 120 }}>
							{row.label}
						</Typography>
						<TextField size="small" fullWidth value={row.url} InputProps={{ readOnly: true }} inputProps={{ "aria-label": row.label }} />
						<Button size="small" onClick={() => copyLink(row.key, row.url)}>
							{copied === row.key ? t("mods.copied") : t("common.copy")}
						</Button>
					</Box>
				))}
				<Divider sx={{ my: 2 }} />
				<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
					{t("mods.ownCopies")}
				</Typography>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
					<Button variant="outlined" href={adminLinks.zip} download>
						{t("mods.downloadZip")}
					</Button>
					<Button variant="outlined" href={adminLinks.list} download>
						{t("mods.downloadList")}
					</Button>
					{mrpackOn && (
						<Button variant="outlined" href={adminLinks.mrpack} download>
							{t("mods.downloadMrpack")}
						</Button>
					)}
				</Box>
			</Paper>

			<ConfirmDialog
				open={rotating}
				title={t("mods.newLinkTitle")}
				confirmLabel={t("mods.newLink")}
				color="warning"
				onClose={() => setRotating(false)}
				onConfirm={makeNewLink}
			>
				{t("mods.newLinkBody")}
			</ConfirmDialog>

			<ConfirmDialog
				open={Boolean(removing)}
				title={t("mods.removeTitle", { name: removing?.name ?? t("mods.thisMod") })}
				confirmLabel={t("mods.removeIt")}
				color="error"
				onClose={() => setRemoving(null)}
				onConfirm={() => {
					const mod = removing;
					setRemoving(null);
					run(() => api.post(`${base}/remove`, { id: mod.id }), t("mods.removed", { name: mod.name }));
				}}
			>
				{t("mods.removeBody", { note: removing?.type === "folder" ? t("mods.removeFolder") : t("mods.removeFile") })}
			</ConfirmDialog>
		</Box>
	);
}

export default ModsPanel;
