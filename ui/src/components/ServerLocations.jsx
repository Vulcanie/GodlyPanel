import React from "react";
import { Alert, Box, Chip, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ContentCopy as CopyIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { formatBytes } from "../utils/format";

// Where servers' files are now. The "Server install folder" setting only says where servers made from now on will go;
// servers made earlier, or added by hand, can be anywhere, and this is the place that says where.

function useLocations() {
	const [state, setState] = React.useState({ data: null, error: null });
	React.useEffect(() => {
		let live = true;
		api
			.get("/api/settings/server-locations")
			.then((data) => live && setState({ data, error: null }))
			.catch((e) => live && setState({ data: null, error: e.message }));
		return () => {
			live = false;
		};
	}, []);
	return state;
}

function CopyPath({ path }) {
	const [copied, setCopied] = React.useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(path);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// The path is on screen to select by hand.
		}
	};
	return (
		<Tooltip title={copied ? "Copied" : "Copy the folder's path"}>
			<IconButton size="small" aria-label={`Copy ${path}`} onClick={copy}>
				<CopyIcon fontSize="inherit" />
			</IconButton>
		</Tooltip>
	);
}

function sizeText(s) {
	if (s.bytes == null || !s.bytesScope) return "not measured yet";
	if (s.bytesScope === "folder") return formatBytes(s.bytes);
	if (s.bytesScope === "shared") return `${formatBytes(s.bytes)} (shared)`;
	return `part of a ${formatBytes(s.bytes)} folder`;
}

function Flags({ server }) {
	return (
		<>
			{!server.exists && <Chip size="small" color="error" label="Folder missing" sx={{ mr: 0.5 }} />}
			{server.sharedWith.length > 0 && (
				<Tooltip title={`Shares this folder with ${server.sharedWith.join(", ")}`}>
					<Chip size="small" variant="outlined" label={`Shared with ${server.sharedWith.length}`} sx={{ mr: 0.5 }} />
				</Tooltip>
			)}
		</>
	);
}

/**
 * With `only`, one line for that server ("Installed in …"). Without it, every server, and a sentence about where new ones will go.
 */
function ServerLocations({ only = null }) {
	const { data, error } = useLocations();

	if (error) return only ? null : <Alert severity="warning">Couldn't read where the servers are: {error}</Alert>;
	if (!data) return null;

	if (only) {
		const server = data.servers.find((s) => s.name === only);
		if (!server || !server.folder) return null;
		return (
			<Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5, mt: 0.5, minWidth: 0 }}>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					Installed in
				</Typography>
				<Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }} data-testid="server-folder">
					{server.folder}
				</Typography>
				<CopyPath path={server.folder} />
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					· {sizeText(server)}
				</Typography>
				<Flags server={server} />
			</Box>
		);
	}

	const here = data.servers.filter((s) => s.inNewServersFolder).length;
	const away = data.servers.length - here;
	const drives = new Set(data.servers.map((s) => s.drive).filter(Boolean)).size;

	return (
		<Box sx={{ mt: 3 }} data-testid="server-locations">
			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				Where your servers are now
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				New servers are created in <b style={{ fontFamily: "monospace" }}>{data.newServersFolder}</b>. That setting only affects servers made from now on; the ones you
				have already stay where they are.{" "}
				{data.servers.length === 0
					? "You have no servers yet."
					: `${data.servers.length} server${data.servers.length === 1 ? "" : "s"} on ${drives} drive${drives === 1 ? "" : "s"}: ${here} in that folder, ${away} elsewhere.`}
			</Typography>
			{data.servers.length > 0 && (
				<Box sx={{ overflowX: "auto" }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Server</TableCell>
								<TableCell>Folder</TableCell>
								<TableCell>Size</TableCell>
								<TableCell />
							</TableRow>
						</TableHead>
						<TableBody>
							{data.servers.map((s) => (
								<TableRow key={s.name} hover>
									<TableCell sx={{ whiteSpace: "nowrap" }}>{s.name}</TableCell>
									<TableCell sx={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
										{s.folder ?? "(none recorded)"}
										{s.folder && <CopyPath path={s.folder} />}
									</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>{sizeText(s)}</TableCell>
									<TableCell sx={{ whiteSpace: "nowrap" }}>
										<Flags server={s} />
										{!s.inNewServersFolder && s.folder && <Chip size="small" variant="outlined" label="Elsewhere" />}
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
