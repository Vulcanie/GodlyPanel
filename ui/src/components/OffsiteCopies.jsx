import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Tooltip, Typography } from "@mui/material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";

const KIND_LABELS = {
	manual: "Manual",
	scheduled: "Scheduled",
	"pre-restore": "Before a restore",
	"pre-update": "Before an update",
	unknown: "Unknown",
};

const when = (iso) => new Date(iso).toLocaleString();

/** Small chips on a backup: where it has been copied, and where a copy failed. */
export function CopyChips({ copies = [] }) {
	return copies.map((r) => (
		<Tooltip
			key={r.destinationId}
			title={r.status === "ok" ? `Copied to ${r.name}${r.at ? ` ${when(r.at)}` : ""}` : r.status === "failed" ? `Copy to ${r.name} failed: ${r.error} It will be tried again.` : `Copying to ${r.name}…`}
		>
			<Chip size="small" variant="outlined" color={r.status === "ok" ? "success" : r.status === "failed" ? "warning" : "info"} label={r.status === "ok" ? r.name : r.status === "failed" ? `${r.name}: failed` : `${r.name}…`} />
		</Tooltip>
	));
}

/** What the places outside this PC hold for this server, and bringing a copy back. */
function OffsiteCopies({ base, data, canManage, busy, onError, onChanged }) {
	const [browsing, setBrowsing] = React.useState(null);
	const [copying, setCopying] = React.useState(null);
	const [message, setMessage] = React.useState(null);
	const places = data.destinations ?? [];

	const syncAll = async (d) => {
		setCopying(d.id);
		setMessage(null);
		try {
			const r = await api.post(`${base}/backups/offsite/${d.id}/sync`);
			setMessage(r.copied ? `Copied ${r.copied} backup${r.copied === 1 ? "" : "s"} to ${d.name}.` : `${d.name} already has every backup.`);
			onChanged();
		} catch (e) {
			onError(e.message);
		} finally {
			setCopying(null);
		}
	};

	return (
		<Paper sx={{ p: 2, mt: 2 }}>
			<Typography variant="subtitle1">Copies off this PC</Typography>
			{message && (
				<Alert severity="success" onClose={() => setMessage(null)} sx={{ my: 1 }}>
					{message}
				</Alert>
			)}
			{places.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					None set up, so these backups exist only on this PC.{canManage ? " Add a folder, a network share or cloud storage in Settings." : ""}
				</Typography>
			) : (
				places.map((d) => (
					<Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, flexWrap: "wrap" }}>
						<Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
							{d.name}
							{d.enabled ? "" : " (off)"}
						</Typography>
						<Button size="small" onClick={() => setBrowsing(d)}>
							See what is there
						</Button>
						{canManage && (
							<Button size="small" disabled={copying === d.id} onClick={() => syncAll(d)}>
								{copying === d.id ? "Copying…" : "Copy all existing backups"}
							</Button>
						)}
					</Box>
				))
			)}
			{browsing && <OffsiteDialog base={base} place={browsing} canManage={canManage} busy={busy} onClose={() => setBrowsing(null)} onError={onError} onFetched={onChanged} />}
		</Paper>
	);
}

function OffsiteDialog({ base, place, canManage, busy, onClose, onError, onFetched }) {
	const [items, setItems] = React.useState(null);
	const [problem, setProblem] = React.useState(null);
	const [working, setWorking] = React.useState(null);

	const load = React.useCallback(async () => {
		try {
			setItems((await api.get(`${base}/backups/offsite/${place.id}`)).backups);
			setProblem(null);
		} catch (e) {
			setProblem(e.message);
		}
	}, [base, place.id]);
	React.useEffect(() => {
		load();
	}, [load]);

	const fetchIt = async (b) => {
		setWorking(b.id);
		try {
			await api.post(`${base}/backups/offsite/${place.id}/${encodeURIComponent(b.id)}/fetch`);
			onFetched();
			await load();
		} catch (e) {
			onError(e.message);
			setProblem(e.message);
		} finally {
			setWorking(null);
		}
	};

	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>Backups in {place.name}</DialogTitle>
			<DialogContent>
				{problem && (
					<Alert severity="error" sx={{ mb: 1 }}>
						{problem}
					</Alert>
				)}
				{!items && !problem && <CircularProgress size={20} />}
				{items?.length === 0 && <Typography variant="body2">Nothing for this server there yet.</Typography>}
				{items?.map((b) => (
					<Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderTop: "1px solid rgba(128,128,128,0.2)", flexWrap: "wrap" }}>
						<Box sx={{ flex: 1, minWidth: 200 }}>
							<Typography variant="body2">{when(b.modified)}</Typography>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{formatBytes(b.sizeBytes)} · {KIND_LABELS[b.kind] ?? b.kind}
							</Typography>
						</Box>
						{b.local ? (
							<Chip size="small" variant="outlined" label="Also on this PC" />
						) : (
							canManage && (
								<Button size="small" variant="outlined" disabled={busy || working === b.id} onClick={() => fetchIt(b)}>
									{working === b.id ? "Downloading…" : "Bring back"}
								</Button>
							)
						)}
					</Box>
				))}
				<Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
					"Bring back" downloads it into this server's backup list. Then restore it from there like any other backup.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

export default OffsiteCopies;
