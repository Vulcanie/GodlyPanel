import React from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	IconButton,
	MenuItem,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";
import { t, useT } from "../i18n";
import InfoTip from "./InfoTip";
import TipRow from "./settings/TipRow";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";

// Where copies of backups go besides this PC's backup folder. A folder covers another
// drive, a network share and any cloud-sync folder (OneDrive, Dropbox, Google Drive,
// Syncthing); S3-compatible storage covers Backblaze B2, Wasabi, Cloudflare R2, MinIO
// and Amazon S3.

const PRESETS = [
	{ id: "b2", label: "Backblaze B2", endpoint: "https://s3.us-west-004.backblazeb2.com", region: "us-west-004" },
	{ id: "wasabi", label: "Wasabi", endpoint: "https://s3.wasabisys.com", region: "us-east-1" },
	{ id: "r2", label: "Cloudflare R2", endpoint: "https://<account id>.r2.cloudflarestorage.com", region: "auto" },
	{ id: "aws", label: "Amazon S3", endpoint: "https://s3.us-east-1.amazonaws.com", region: "us-east-1" },
	{ id: "minio", label: "MinIO / other", endpoint: "http://192.168.1.10:9000", region: "us-east-1" },
];

// The help text for a service, as translated words. Empty for a service with none.
function presetHelp(id) {
	switch (id) {
		case "b2":
			return t("destinations.presetB2");
		case "wasabi":
			return t("destinations.presetWasabi");
		case "r2":
			return t("destinations.presetR2");
		case "aws":
			return t("destinations.presetAws");
		case "minio":
			return t("destinations.presetMinio");
		default:
			return "";
	}
}

const blank = () => ({
	type: "folder",
	name: "",
	enabled: true,
	keepCount: "",
	keepDays: "",
	includeExisting: false,
	folder: { path: "" },
	s3: { endpoint: "", region: "", bucket: "", prefix: "", accessKeyId: "", secretAccessKey: "", pathStyle: true },
});

function fromSaved(d) {
	return {
		...blank(),
		id: d.id,
		type: d.type,
		name: d.name,
		enabled: d.enabled,
		keepCount: d.keepCount ?? "",
		keepDays: d.keepDays ?? "",
		folder: { path: d.folder?.path ?? "" },
		s3: { ...blank().s3, ...(d.s3 ?? {}), secretAccessKey: "" },
		hasSecret: d.s3?.hasSecret,
	};
}

function toBody(form) {
	const number = (v) => (v === "" || v == null ? null : Number(v));
	const body = { type: form.type, name: form.name, enabled: form.enabled, keepCount: number(form.keepCount), keepDays: number(form.keepDays) };
	if (!form.id) body.includeExisting = form.includeExisting;
	if (form.type === "folder") body.folder = { path: form.folder.path };
	else {
		const { hasSecret, secretAccessKey, ...rest } = form.s3;
		body.s3 = { ...rest, ...(secretAccessKey ? { secretAccessKey } : {}) };
	}
	return body;
}

function BackupDestinations() {
	useT();
	const [list, setList] = React.useState(null);
	const [editing, setEditing] = React.useState(null);
	const [removing, setRemoving] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);

	const load = React.useCallback(async () => {
		try {
			setList((await api.get("/api/settings/backup-destinations")).destinations);
		} catch (e) {
			setError(e.message);
		}
	}, []);
	React.useEffect(() => {
		load();
	}, [load]);

	const remove = async (d) => {
		setRemoving(null);
		try {
			await api.del(`/api/settings/backup-destinations/${d.id}`);
			load();
		} catch (e) {
			setError(e.message);
		}
	};

	const toggle = async (d) => {
		try {
			await api.put(`/api/settings/backup-destinations/${d.id}`, { enabled: !d.enabled });
			load();
		} catch (e) {
			setError(e.message);
		}
	};

	const retry = async () => {
		setNotice(t("destinations.tryingAgain"));
		try {
			const r = await api.post("/api/settings/backup-destinations/retry");
			setNotice(r.tried === 0 ? t("destinations.nothingToCopy") : t("destinations.triedCount", { tried: r.tried, copied: r.copied }));
		} catch (e) {
			setError(e.message);
			setNotice(null);
		}
	};

	return (
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("destinations.title")}
					<InfoTip id="card.backupDestinations" />
				</Box>
			}
			actions={
				<>
					{list?.length > 0 && (
						<Button size="small" onClick={retry}>
							{t("destinations.retry")}
						</Button>
					)}
					<Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setEditing(blank())}>
						{t("destinations.add")}
</Button>
				</>
			}
		>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="info" onClose={() => setNotice(null)} sx={{ mb: 1 }}>
					{notice}
				</Alert>
			)}
			{!list ? (
				<CircularProgress size={20} />
			) : list.length === 0 ? (
				<Typography variant="body2" sx={{ color: "warning.main" }}>
					{t("destinations.none")}
				</Typography>
			) : (
				list.map((d, i) => (
					<Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25, borderTop: i === 0 ? "none" : 1, borderColor: "divider", flexWrap: "wrap" }}>
						<Box sx={{ flex: 1, minWidth: 220 }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>
							<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
								{d.type === "folder" ? d.folder.path : `${d.s3.bucket} · ${d.s3.endpoint}`}
							</Typography>
						</Box>
						<Chip size="small" variant="outlined" label={d.type === "folder" ? t("destinations.kindFolder") : t("destinations.kindS3")} />
						<Box sx={{ display: "flex", alignItems: "center" }}>
							<FormControlLabel sx={{ mr: 0 }} control={<Switch size="small" checked={d.enabled} onChange={() => toggle(d)} />} label={d.enabled ? t("common.on") : t("common.off")} />
							<InfoTip id="dest.enabled" />
						</Box>
						<Tooltip title={t("common.edit")}>
							<IconButton size="small" aria-label={t("destinations.editAria", { name: d.name })} onClick={() => setEditing(fromSaved(d))}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title={t("common.remove")}>
							<IconButton size="small" aria-label={t("destinations.removeAria", { name: d.name })} onClick={() => setRemoving(d)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				))
			)}
			{editing && <DestinationDialog initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
			<ConfirmDialog open={Boolean(removing)} title={t("destinations.stopTitle")} confirmLabel={t("common.remove")} onClose={() => setRemoving(null)} onConfirm={() => remove(removing)}>
				{t("destinations.stopBody", { name: removing?.name ?? "" })}
			</ConfirmDialog>
		</SectionCard>
	);
}

function DestinationDialog({ initial, onClose, onSaved }) {
	useT();
	const [form, setForm] = React.useState(initial);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [tested, setTested] = React.useState(null);
	const [preset, setPreset] = React.useState("");
	const pick = window.godlyPanel?.pickFolder;

	const set = (patch) => {
		setForm((f) => ({ ...f, ...patch }));
		setTested(null);
	};
	const setS3 = (patch) => set({ s3: { ...form.s3, ...patch } });
	const isNew = !form.id;
	const presetInfo = PRESETS.find((p) => p.id === preset);

	const test = async () => {
		setBusy(true);
		setError(null);
		setTested(null);
		try {
			const r = await api.post("/api/settings/backup-destinations/test", { ...toBody(form), id: form.id });
			setTested(r);
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const save = async () => {
		setBusy(true);
		setError(null);
		try {
			if (isNew) await api.post("/api/settings/backup-destinations", toBody(form));
			else await api.put(`/api/settings/backup-destinations/${form.id}`, toBody(form));
			onSaved();
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	return (
		<Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
			<DialogTitle>{isNew ? t("destinations.addTitle") : t("destinations.editTitle", { name: initial.name })}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				{tested && (
					<Alert severity="success">
						{tested.freeBytes != null ? t("destinations.worksFree", { where: tested.where, free: formatBytes(tested.freeBytes) }) : t("destinations.works", { where: tested.where })}
					</Alert>
				)}
				<TipRow info="dest.name">
					<TextField fullWidth size="small" label={t("common.name")} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("destinations.namePlaceholder")} />
				</TipRow>
				{isNew && (
					<TipRow info="dest.kind">
						<TextField select fullWidth size="small" label={t("destinations.kind")} value={form.type} onChange={(e) => set({ type: e.target.value })}>
							<MenuItem value="folder">{t("destinations.kindFolderLong")}</MenuItem>
							<MenuItem value="s3">{t("destinations.kindS3Long")}</MenuItem>
						</TextField>
					</TipRow>
				)}

				{form.type === "folder" ? (
					<TipRow info="dest.folder">
						<Box sx={{ display: "flex", gap: 1 }}>
							<TextField size="small" fullWidth label={t("destinations.folder")} value={form.folder.path} onChange={(e) => set({ folder: { path: e.target.value } })} placeholder="D:\Backups   or   \\nas\share\backups" />
							{pick && (
								<Button size="small" onClick={async () => { const c = await pick({ title: t("destinations.pickTitle"), defaultPath: form.folder.path || undefined }); if (c) set({ folder: { path: c } }); }}>
									{t("common.browse")}
								</Button>
							)}
						</Box>
					</TipRow>
				) : (
					<>
						<TipRow info="dest.service">
							<TextField select fullWidth size="small" label={t("destinations.service")} value={preset} onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); setPreset(e.target.value); if (p) setS3({ endpoint: p.endpoint, region: p.region, pathStyle: true }); }}>
								{PRESETS.map((p) => (
									<MenuItem key={p.id} value={p.id}>
										{p.id === "minio" ? t("destinations.presetOther") : p.label}
									</MenuItem>
								))}
							</TextField>
						</TipRow>
						{/* Specific to the service just picked, so it can't live in the general explanation. */}
						{presetInfo && <Typography variant="caption" sx={{ color: "text.secondary" }}>{presetHelp(presetInfo.id)}</Typography>}
						<TipRow info="dest.s3.endpoint">
							<TextField fullWidth size="small" label={t("destinations.endpoint")} value={form.s3.endpoint} onChange={(e) => setS3({ endpoint: e.target.value })} />
						</TipRow>
						<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
							<TipRow info="dest.s3.bucket">
								<TextField size="small" fullWidth label={t("destinations.bucket")} value={form.s3.bucket} onChange={(e) => setS3({ bucket: e.target.value })} />
							</TipRow>
							<TipRow info="dest.s3.region">
								<TextField size="small" fullWidth label={t("destinations.region")} value={form.s3.region} onChange={(e) => setS3({ region: e.target.value })} />
							</TipRow>
						</Box>
						<TipRow info="dest.s3.prefix">
							<TextField fullWidth size="small" label={t("destinations.prefix")} value={form.s3.prefix} onChange={(e) => setS3({ prefix: e.target.value })} placeholder="godlypanel" />
						</TipRow>
						<TipRow info="dest.s3.accessKeyId">
							<TextField fullWidth size="small" label={t("destinations.accessKeyId")} value={form.s3.accessKeyId} onChange={(e) => setS3({ accessKeyId: e.target.value })} autoComplete="off" />
						</TipRow>
						<TipRow info="dest.s3.secretAccessKey">
							<TextField
								fullWidth
								size="small"
								type="password"
								label={initial.hasSecret ? t("destinations.secretSaved") : t("destinations.secret")}
								value={form.s3.secretAccessKey}
								onChange={(e) => setS3({ secretAccessKey: e.target.value })}
								autoComplete="new-password"
							/>
						</TipRow>
					</>
				)}

				<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
					<TipRow info="dest.keepCount">
						<TextField size="small" fullWidth type="number" label={t("destinations.keepCount")} placeholder={t("destinations.sameAsBackups")} value={form.keepCount} onChange={(e) => set({ keepCount: e.target.value })} />
					</TipRow>
					<TipRow info="dest.keepDays">
						<TextField size="small" fullWidth type="number" label={t("common.deleteOlderDays")} placeholder={t("destinations.sameAsBackups")} value={form.keepDays} onChange={(e) => set({ keepDays: e.target.value })} />
					</TipRow>
				</Box>
				{isNew && (
					<TipRow info="dest.includeExisting" center>
						<FormControlLabel sx={{ ml: 0, mr: 0 }} control={<Switch checked={form.includeExisting} onChange={(e) => set({ includeExisting: e.target.checked })} />} label={t("destinations.includeExisting")} />
					</TipRow>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					{t("common.cancel")}
				</Button>
				<Button onClick={test} disabled={busy}>
					{busy ? t("destinations.checking") : t("destinations.test")}
				</Button>
				<Button variant="contained" onClick={save} disabled={busy}>
					{t("common.save")}
</Button>
			</DialogActions>
		</Dialog>
	);
}

export default BackupDestinations;
