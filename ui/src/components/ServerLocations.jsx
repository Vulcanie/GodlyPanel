import React from "react";
import { Alert, Box, Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ContentCopy as CopyIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";
import { copyToClipboard } from "../utils/clipboard";
import InfoTip from "./InfoTip";
import { t, tn, useT, errorText } from "../i18n";

// Where servers' files are now. The "Server install folder" setting only says where servers made from now on will go;
// servers made earlier, or added by hand, can be anywhere, and this is the place that says where.

function useLocations() {
	const [state, setState] = React.useState({ data: null, error: null });
	React.useEffect(() => {
		let live = true;
		api
			.get("/api/settings/server-locations")
			.then((data) => live && setState({ data, error: null }))
			.catch((e) => live && setState({ data: null, error: errorText(e) }));
		return () => {
			live = false;
		};
	}, []);
	return state;
}

function CopyPath({ path }) {
	useT();
	const [copied, setCopied] = React.useState(false);
	const copy = () => {
		// Not navigator.clipboard: the panel is usually opened over plain http, where the browser switches that off.
		copyToClipboard(path, (result) => {
			setCopied(result === "Copied!");
			setTimeout(() => setCopied(false), 1500);
		});
	};
	return (
		<Tooltip title={copied ? t("locations.copied") : t("locations.copyTip")}>
			<IconButton size="small" aria-label={t("locations.copyAria", { path })} onClick={copy}>
				<CopyIcon fontSize="inherit" />
			</IconButton>
		</Tooltip>
	);
}

function sizeText(s) {
	if (s.bytes == null || !s.bytesScope) return t("locations.notMeasured");
	if (s.bytesScope === "folder") return formatBytes(s.bytes);
	if (s.bytesScope === "shared") return t("locations.sharedSize", { size: formatBytes(s.bytes) });
	return t("locations.partOfFolder", { size: formatBytes(s.bytes) });
}

function Flags({ server }) {
	useT();
	return (
		<>
			{!server.exists && <Chip size="small" color="error" label={t("locations.folderMissing")} sx={{ mr: 0.5 }} />}
			{server.sharedWith.length > 0 && (
				<Tooltip title={t("locations.sharesWith", { names: server.sharedWith.join(", ") })}>
					<Chip size="small" variant="outlined" label={t("locations.sharedCount", { count: server.sharedWith.length })} sx={{ mr: 0.5 }} />
				</Tooltip>
			)}
		</>
	);
}

/**
 * With `only`, one line for that server ("Installed in …"). Without it, every server, and a sentence about where new ones will go.
 */
function ServerLocations({ only = null }) {
	useT();
	const { data, error } = useLocations();

	if (error) return only ? null : <Alert severity="warning">{t("locations.couldntRead", { error })}</Alert>;
	if (!data) return null;

	if (only) {
		const server = data.servers.find((s) => s.name === only);
		if (!server || !server.folder) return null;
		return (
			<Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5, mt: 0.5, minWidth: 0 }}>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{t("locations.installedIn")}
				</Typography>
				<Typography variant="caption" sx={{ fontFamily: (t) => t.custom.mono, wordBreak: "break-all" }} data-testid="server-folder">
					{server.folder}
				</Typography>
				<CopyPath path={server.folder} />
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{t("locations.dotSize", { size: sizeText(server) })}
				</Typography>
				<Flags server={server} />
			</Box>
		);
	}

	const here = data.servers.filter((s) => s.inNewServersFolder).length;
	const away = data.servers.length - here;
	const drives = new Set(data.servers.map((s) => s.drive).filter(Boolean)).size;

	return (
		<Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: "divider" }} data-testid="server-locations">
			<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
				<Typography variant="subtitle2">{t("locations.title")}</Typography>
				<InfoTip id="card.serverLocations" />
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				{t("locations.newIn")} <Box component="span" sx={{ fontFamily: (t) => t.custom.mono, fontSize: 13, color: "text.primary", wordBreak: "break-all" }}>
					{data.newServersFolder}
				</Box>.{" "}
				{data.servers.length === 0
					? t("locations.noServers")
					: t("locations.summary", { servers: tn("locations.servers", data.servers.length), drives: tn("locations.drives", drives), here, away })}
			</Typography>
			{data.servers.length > 0 && (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>{t("locations.colServer")}</TableCell>
								<TableCell>{t("locations.colFolder")}</TableCell>
								<TableCell>{t("common.size")}</TableCell>
								<TableCell />
							</TableRow>
						</TableHead>
						<TableBody>
							{data.servers.map((s) => (
								<TableRow key={s.name} hover>
									<TableCell sx={{ whiteSpace: "nowrap" }}>{s.name}</TableCell>
									<TableCell sx={{ fontFamily: (t) => t.custom.mono, fontSize: 12, wordBreak: "break-all" }}>
										{s.folder ?? t("locations.noneRecorded")}
										{s.folder && <CopyPath path={s.folder} />}
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>{sizeText(s)}</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										<Flags server={s} />
										{!s.inNewServersFolder && s.folder && <Chip size="small" variant="outlined" label={t("locations.elsewhere")} />}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
		</Box>
	);
}

export default ServerLocations;
