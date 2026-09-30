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
	Paper,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";

// Where copies of backups go besides this PC's backup folder. A folder covers another
// drive, a network share and any cloud-sync folder (OneDrive, Dropbox, Google Drive,
// Syncthing); S3-compatible storage covers Backblaze B2, Wasabi, Cloudflare R2, MinIO
// and Amazon S3.

const PRESETS = [
	{ id: "b2", label: "Backblaze B2", endpoint: "https://s3.us-west-004.backblazeb2.com", region: "us-west-004", help: "Use the endpoint shown on your bucket's page (it includes your region), and an application key with access to that bucket." },
	{ id: "wasabi", label: "Wasabi", endpoint: "https://s3.wasabisys.com", region: "us-east-1", help: "Other regions use an endpoint like https://s3.eu-central-1.wasabisys.com." },
	{ id: "r2", label: "Cloudflare R2", endpoint: "https://<account id>.r2.cloudflarestorage.com", region: "auto", help: "Your account id is on the R2 page; create an API token with read and write access." },
	{ id: "aws", label: "Amazon S3", endpoint: "https://s3.us-east-1.amazonaws.com", region: "us-east-1", help: "Use the region your bucket is in, on both the endpoint and the region box." },
	{ id: "minio", label: "MinIO / other", endpoint: "http://192.168.1.10:9000", region: "us-east-1", help: "For MinIO on your own network, or any other S3-compatible service." },
];

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
	const [list, setList] = React.useState(null);
	const [editing, setEditing] = React.useState(null);
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
		if (!window.confirm(`Stop copying backups to "${d.name}"? Copies already there are left in place.`)) return;
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
		setNotice("Trying again…");
		try {
			const r = await api.post("/api/settings/backup-destinations/retry");
			setNotice(r.tried === 0 ? "Everything that should be copied already is." : `Tried ${r.tried}, ${r.copied} copied.`);
		} catch (e) {
			setError(e.message);
			setNotice(null);
		}
	};

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
				<Typography variant="subtitle2">Copies of backups off this PC</Typography>
				<Box sx={{ display: "flex", gap: 1 }}>
					{list?.length > 0 && (
						<Button size="small" onClick={retry}>
							Retry failed copies
						</Button>
					)}
					<Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setEditing(blank())}>
						Add a place
					</Button>
				</Box>
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", my: 1 }}>
				A backup kept only on the PC that broke isn't much of a backup. Each new backup is copied to every place below in the background; if a copy fails it is shown on the backup and tried again.
			</Typography>
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
					None yet, so backups exist only on this PC.
				</Typography>
			) : (
				list.map((d) => (
					<Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderTop: "1px solid rgba(128,128,128,0.2)", flexWrap: "wrap" }}>
						<Box sx={{ flex: 1, minWidth: 220 }}>
							<Typography variant="body2">{d.name}</Typography>
							<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
								{d.type === "folder" ? d.folder.path : `${d.s3.bucket} · ${d.s3.endpoint}`}
							</Typography>
						</Box>
						<Chip size="small" variant="outlined" label={d.type === "folder" ? "Folder" : "S3 storage"} />
						<FormControlLabel control={<Switch size="small" checked={d.enabled} onChange={() => toggle(d)} />} label={d.enabled ? "On" : "Off"} />
						<Tooltip title="Edit">
							<IconButton size="small" onClick={() => setEditing(fromSaved(d))}>
								<EditIcon fontSize="small" />
							</IconButton>
						</Tooltip>
						<Tooltip title="Remove">
							<IconButton size="small" onClick={() => remove(d)}>
								<DeleteIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					</Box>
				))
			)}
			{editing && <DestinationDialog initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
		</Paper>
	);
}

function DestinationDialog({ initial, onClose, onSaved }) {
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
			<DialogTitle>{isNew ? "Add a place for backup copies" : `Edit ${initial.name}`}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				{tested && (
					<Alert severity="success">
						Works: {tested.where}
						{tested.freeBytes != null ? ` · ${formatBytes(tested.freeBytes)} free` : ""}
					</Alert>
				)}
				<TextField size="small" label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. NAS, or Backblaze" />
				{isNew && (
					<TextField select size="small" label="Kind" value={form.type} onChange={(e) => set({ type: e.target.value })}>
						<MenuItem value="folder">A folder: another drive, a network share, or a cloud-sync folder</MenuItem>
						<MenuItem value="s3">S3-compatible storage: Backblaze B2, Wasabi, R2, MinIO, Amazon S3</MenuItem>
					</TextField>
				)}

				{form.type === "folder" ? (
					<>
						<Box sx={{ display: "flex", gap: 1 }}>
							<TextField size="small" fullWidth label="Folder" value={form.folder.path} onChange={(e) => set({ folder: { path: e.target.value } })} placeholder="D:\Backups   or   \\nas\share\backups" />
							{pick && (
								<Button size="small" onClick={async () => { const c = await pick({ title: "Folder for backup copies", defaultPath: form.folder.path || undefined }); if (c) set({ folder: { path: c } }); }}>
									Browse
								</Button>
							)}
						</Box>
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							To use OneDrive, Dropbox or Google Drive, choose a folder inside its sync folder: the service then carries the copies off this PC. For a network share, this PC must already be signed in to it.
						</Typography>
					</>
				) : (
					<>
						<TextField select size="small" label="Service (fills in the address)" value={preset} onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); setPreset(e.target.value); if (p) setS3({ endpoint: p.endpoint, region: p.region, pathStyle: true }); }}>
							{PRESETS.map((p) => (
								<MenuItem key={p.id} value={p.id}>
									{p.label}
								</MenuItem>
							))}
						</TextField>
						{presetInfo && <Typography variant="caption" sx={{ color: "text.secondary" }}>{presetInfo.help}</Typography>}
						<TextField size="small" label="Endpoint" value={form.s3.endpoint} onChange={(e) => setS3({ endpoint: e.target.value })} />
						<Box sx={{ display: "flex", gap: 1 }}>
							<TextField size="small" fullWidth label="Bucket" value={form.s3.bucket} onChange={(e) => setS3({ bucket: e.target.value })} />
							<TextField size="small" fullWidth label="Region" value={form.s3.region} onChange={(e) => setS3({ region: e.target.value })} />
						</Box>
						<TextField size="small" label="Folder inside the bucket (optional)" value={form.s3.prefix} onChange={(e) => setS3({ prefix: e.target.value })} placeholder="godlypanel" />
						<TextField size="small" label="Access key ID" value={form.s3.accessKeyId} onChange={(e) => setS3({ accessKeyId: e.target.value })} autoComplete="off" />
						<TextField
							size="small"
							type="password"
							label={initial.hasSecret ? "Secret access key (saved: leave blank to keep it)" : "Secret access key"}
							value={form.s3.secretAccessKey}
							onChange={(e) => setS3({ secretAccessKey: e.target.value })}
							autoComplete="new-password"
						/>
					</>
				)}

				<Box sx={{ display: "flex", gap: 1 }}>
					<TextField size="small" fullWidth type="number" label="Scheduled backups to keep here" value={form.keepCount} onChange={(e) => set({ keepCount: e.target.value })} helperText="Blank follows Settings → Backups" />
					<TextField size="small" fullWidth type="number" label="Delete older than (days)" value={form.keepDays} onChange={(e) => set({ keepDays: e.target.value })} helperText="Blank follows Settings" />
				</Box>
				{isNew && (
					<FormControlLabel control={<Switch checked={form.includeExisting} onChange={(e) => set({ includeExisting: e.target.checked })} />} label="Also copy the backups that already exist (otherwise only new ones)" />
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				<Button onClick={test} disabled={busy}>
					{busy ? "Checking…" : "Test"}
				</Button>
				<Button variant="contained" onClick={save} disabled={busy}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default BackupDestinations;
