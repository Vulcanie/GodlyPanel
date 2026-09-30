import React from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";
import { useOperation, operationLabel } from "../OperationsContext";
import {
	PeopleAlt as PeopleAltIcon,
	NetworkPing as NetworkPingIcon,
	Lock as LockIcon,
	Memory as MemoryIcon,
	Dns as DnsIcon,
} from "@mui/icons-material";
import StatChip from "./StatChip";
import HeapBar from "./HeapBar";

export function StatusDot({ online }) {
	const theme = useTheme();
	return (
		<Box
			component="span"
			sx={{
				display: "inline-block",
				width: 8,
				height: 8,
				borderRadius: "50%",
				backgroundColor: online
					? theme.palette.status.online
					: theme.palette.status.offline,
				mr: 1.5,
				flexShrink: 0,
			}}
		/>
	);
}

// One server instance's row: status + name on the left, a wrapping row of
// StatChips for everything else. Replaces what used to be a <TableRow> —
// chips are independent flex items rather than cells bound to a shared
// column width, so a row with a lot of data wraps to multiple lines on a
// narrow viewport instead of clipping or needing horizontal scroll.
function ServerTile({ srv, stats, clickable, onClick }) {
	const operation = useOperation(srv.name);
	// Data-driven, not a per-game special case: for Minecraft, sessionName
	// and joinAddress are literally the same "ip:port" string, so showing
	// both is just duplicated data. Other game types (e.g. ARK's human
	// session names) genuinely differ and keep both chips.
	const sameAddress =
		srv.sessionName && srv.joinAddress && srv.sessionName === srv.joinAddress;

	return (
		<Box
			onClick={onClick}
			sx={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: 1.25,
				px: 2,
				py: 1.25,
				borderBottom: "1px solid rgba(255,255,255,0.06)",
				opacity: srv.online ? 1 : 0.6,
				cursor: clickable ? "pointer" : "default",
				transition: "background-color 0.15s ease, transform 0.15s ease",
				"&:hover": clickable
					? { bgcolor: "rgba(255,255,255,0.04)", transform: "translateX(2px)" }
					: undefined,
				"&:last-of-type": { borderBottom: 0 },
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", minWidth: 160, flexShrink: 0 }}>
				<StatusDot online={srv.online} />
				<Typography variant="subtitle2" fontWeight={600}>
					{srv.name}
				</Typography>
				{operation && <Chip size="small" color="info" variant="outlined" label={operationLabel(operation)} sx={{ ml: 1, height: 20 }} />}
				{(srv.tags ?? []).map((tag) => (
					<Chip key={tag} size="small" variant="outlined" label={tag} sx={{ ml: 0.75, height: 20 }} />
				))}
			</Box>

			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, flex: 1 }}>
				{sameAddress ? (
					<StatChip
						icon={<DnsIcon sx={{ fontSize: 14 }} />}
						label="Address"
						value={srv.sessionName}
						copyable
					/>
				) : (
					<>
						{srv.sessionName && (
							<StatChip
								icon={<DnsIcon sx={{ fontSize: 14 }} />}
								label="Session"
								value={srv.sessionName}
							/>
						)}
						{srv.joinAddress && (
							<StatChip
								icon={<DnsIcon sx={{ fontSize: 14 }} />}
								label="Address"
								value={srv.joinAddress}
								copyable
							/>
						)}
					</>
				)}

				<StatChip
					icon={<PeopleAltIcon sx={{ fontSize: 14 }} />}
					label="Players"
					value={`${srv.playerCount ?? 0}${srv.maxplayers ? ` / ${srv.maxplayers}` : ""}`}
				/>

				{srv.online && srv.ping != null && (
					<StatChip
						icon={<NetworkPingIcon sx={{ fontSize: 14 }} />}
						label="Ping"
						value={`${srv.ping} ms`}
					/>
				)}

				{srv.serverPassword && (
					<StatChip
						icon={<LockIcon sx={{ fontSize: 14 }} />}
						label="Password"
						value={srv.serverPassword}
						copyable
					/>
				)}

				{stats?.running && (
					<StatChip
						icon={<MemoryIcon sx={{ fontSize: 14 }} />}
						label="CPU/RAM"
						value={`${stats.cpuPercent}% / ${(stats.ramMB / 1024).toFixed(1)} GB`}
					/>
				)}

				{srv.type === "minecraft" && stats?.running && stats.heapMaxMB != null && (
					<HeapBar
						usedMB={stats.heapUsedMB}
						maxMB={stats.heapMaxMB}
						percent={stats.heapPercent}
					/>
				)}
			</Box>
		</Box>
	);
}

export default ServerTile;
