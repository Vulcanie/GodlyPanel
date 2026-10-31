import React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip, Typography } from "@mui/material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";
import { t, tn, useT, formatDate } from "../i18n";
import InfoTip from "./InfoTip";
import SectionCard from "./ui/SectionCard";

// The word for a backup's kind. A kind not listed here is shown as it is.
export function kindLabel(kind) {
	switch (kind) {
		case "manual":
			return t("backups.kind.manual");
		case "scheduled":
			return t("backups.kind.scheduled");
		case "pre-restore":
			return t("backups.kind.preRestore");
		case "pre-update":
			return t("backups.kind.preUpdate");
		case "unknown":
			return t("backups.kind.unknown");
		default:
			return kind;
	}
}

const when = (iso) => formatDate(iso);

/** Small chips on a backup: where it has been copied, and where a copy failed. */
export function CopyChips({ copies = [] }) {
	useT();
	return copies.map((r) => (
		<Tooltip
			key={r.destinationId}
			title={r.status === "ok" ? (r.at ? t("offsite.copiedAt", { name: r.name, date: when(r.at) }) : t("offsite.copied", { name: r.name })) : r.status === "failed" ? t("offsite.failed", { name: r.name, error: r.error }) : t("offsite.copying", { name: r.name })}
		>
			<Chip size="small" variant="outlined" color={r.status === "ok" ? "success" : r.status === "failed" ? "warning" : "info"} label={r.status === "ok" ? r.name : r.status === "failed" ? t("offsite.chipFailed", { name: r.name }) : t("offsite.chipCopying", { name: r.name })} />
		</Tooltip>
	));
}

/** What the places outside this PC hold for this server, and bringing a copy back. */
function OffsiteCopies({ base, data, canManage, busy, onError, onChanged }) {
	useT();
	const [browsing, setBrowsing] = React.useState(null);
	const [copying, setCopying] = React.useState(null);
	const [message, setMessage] = React.useState(null);
	const places = data.destinations ?? [];

	const syncAll = async (d) => {
		setCopying(d.id);
		setMessage(null);
		try {
			const r = await api.post(`${base}/backups/offsite/${d.id}/sync`);
			setMessage(r.copied ? tn("offsite.copiedCount", r.copied, { name: d.name }) : t("offsite.hasAll", { name: d.name }));
			onChanged();
		} catch (e) {
			onError(e.message);
		} finally {
			setCopying(null);
		}
	};

	return (
		<SectionCard
			sx={{ mt: 2 }}
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("offsite.title")}
					<InfoTip id="card.backupDestinations" />
				</Box>
			}
		>
			{message && (
				<Alert severity="success" onClose={() => setMessage(null)} sx={{ my: 1 }}>
					{message}
				</Alert>
			)}
			{places.length === 0 ? (
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{canManage ? t("offsite.noneManage") : t("offsite.none")}
				</Typography>
			) : (
				places.map((d) => (
					<Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, flexWrap: "wrap" }}>
						<Typography variant="body2" sx={{ flex: 1, minWidth: 160, fontWeight: 600 }}>
							{d.name}
							{d.enabled ? "" : ` ${t("offsite.off")}`}
						</Typography>
						<Button size="small" onClick={() => setBrowsing(d)}>
							{t("offsite.seeWhatIsThere")}
						</Button>
						{canManage && (
							<Button size="small" disabled={copying === d.id} onClick={() => syncAll(d)}>
								{copying === d.id ? t("common.copying") : t("offsite.copyAll")}
							</Button>
						)}
					</Box>
				))
			)}
			{browsing && <OffsiteDialog base={base} place={browsing} canManage={canManage} busy={busy} onClose={() => setBrowsing(null)} onError={onError} onFetched={onChanged} />}
		</SectionCard>
	);
}

function OffsiteDialog({ base, place, canManage, busy, onClose, onError, onFetched }) {
	useT();
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
			<DialogTitle>{t("offsite.backupsIn", { name: place.name })}</DialogTitle>
			<DialogContent>
				{problem && (
					<Alert severity="error" sx={{ mb: 1 }}>
						{problem}
					</Alert>
				)}
				{!items && !problem && <CircularProgress size={20} />}
				{items?.length === 0 && <Typography variant="body2">{t("offsite.nothingYet")}</Typography>}
				{items?.map((b) => (
					<Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
						<Box sx={{ flex: 1, minWidth: 200 }}>
							<Typography variant="body2">{when(b.modified)}</Typography>
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{formatBytes(b.sizeBytes)} · {kindLabel(b.kind)}
							</Typography>
						</Box>
						{b.local ? (
							<Chip size="small" variant="outlined" label={t("offsite.alsoOnPc")} />
						) : (
							canManage && (
								<Button size="small" variant="outlined" disabled={busy || working === b.id} onClick={() => fetchIt(b)}>
									{working === b.id ? t("offsite.downloading") : t("offsite.bringBack")}
								</Button>
							)
						)}
					</Box>
				))}
				<Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
					<Typography variant="caption" sx={{ color: "text.secondary" }}>
						{t("offsite.aboutBringBack")}
					</Typography>
					<InfoTip id="dest.bringBack" />
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("common.close")}</Button>
			</DialogActions>
		</Dialog>
	);
}

export default OffsiteCopies;
