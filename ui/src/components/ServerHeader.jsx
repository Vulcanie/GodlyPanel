import React from "react";
import { Box, Button, Chip, Tooltip, Typography } from "@mui/material";
import { PlayArrow as StartIcon, Stop as StopIcon, RestartAlt as RestartIcon, PeopleAlt as PlayersIcon, NetworkPing as PingIcon, Memory as MemoryIcon, Dns as AddressIcon, Lock as LockIcon } from "@mui/icons-material";
import LiveDot from "./ui/LiveDot";
import { useOperation, operationLabel } from "../OperationsContext";
import { getGameInfo } from "../gameCatalog";
import { copyToClipboard } from "../utils/clipboard";

function Pill({ icon, children, onClick, tip }) {
	const body = (
		<Box
			onClick={onClick}
			sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,.14)", color: "#fff", fontSize: 13, cursor: onClick ? "pointer" : "default", backdropFilter: "blur(6px)", "&:hover": onClick ? { bgcolor: "rgba(255,255,255,.24)" } : undefined }}
		>
			{icon}
			{children}
		</Box>
	);
	return tip ? <Tooltip title={tip}>{body}</Tooltip> : body;
}

/**
 * The top of a server's page: its artwork, name, whether it is up, the numbers that matter, and Start, Stop and Restart wherever
 * you are on the page.
 */
function ServerHeader({ serverName, status, stats, appearance, onAction, canControl, isAdmin }) {
	const operation = useOperation(serverName);
	const online = Boolean(status?.online);
	const info = React.useMemo(() => getGameInfo(status?.type, appearance), [status?.type, appearance]);
	const busy = Boolean(operation);
	const [tip, setTip] = React.useState(null);
	const copy = (value, label) => copyToClipboard(value, (r) => { setTip(`${label}: ${r}`); setTimeout(() => setTip(null), 1500); });

	return (
		<Box sx={{ position: "relative", overflow: "hidden", borderRadius: 5, mb: 2.5, background: info.gradient, minHeight: 168 }}>
			{info.banner && <Box sx={{ position: "absolute", inset: 0, backgroundImage: `url(${info.banner})`, backgroundSize: "cover", backgroundPosition: "center 25%", filter: online ? "none" : "grayscale(0.55)" }} />}
			<Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(8,12,24,.92) 0%, rgba(8,12,24,.72) 45%, rgba(8,12,24,.35) 100%)" }} />
			<Box sx={{ position: "relative", p: { xs: 2.25, sm: 3 }, display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 2, minHeight: 168 }}>
				<Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
						<LiveDot state={operation ? "busy" : online ? "online" : "offline"} size={12} />
						<Typography variant="overline" sx={{ color: "rgba(255,255,255,.78)", letterSpacing: 1.4 }}>
							{operation ? operationLabel(operation) : online ? "Online" : "Offline"} · {info.title}
						</Typography>
					</Box>
					<Typography variant="h4" component="h1" noWrap sx={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.5)" }}>
						{serverName}
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
						<Pill icon={<PlayersIcon sx={{ fontSize: 16 }} />}>
							<strong>{status?.playerCount ?? 0}</strong>
							{status?.maxplayers ? ` / ${status.maxplayers}` : ""} players
						</Pill>
						{online && status?.ping != null && <Pill icon={<PingIcon sx={{ fontSize: 16 }} />}>{status.ping} ms</Pill>}
						{stats?.running && <Pill icon={<MemoryIcon sx={{ fontSize: 16 }} />}>{stats.cpuPercent}% CPU · {(stats.ramMB / 1024).toFixed(1)} GB</Pill>}
						{(status?.session || status?.joinAddress) && (
							<Pill icon={<AddressIcon sx={{ fontSize: 16 }} />} onClick={() => copy(status.session || status.joinAddress, "Join address")} tip={tip?.startsWith("Join") ? tip : "Click to copy the join address"}>
								{status.session || status.joinAddress}
							</Pill>
						)}
						{isAdmin && status?.serverPassword && (
							<Pill icon={<LockIcon sx={{ fontSize: 16 }} />} onClick={() => copy(status.serverPassword, "Password")} tip={tip?.startsWith("Password") ? tip : "Click to copy the password"}>
								{status.serverPassword}
							</Pill>
						)}
						{(status?.tags ?? []).map((t) => (
							<Chip key={t} size="small" label={t} sx={{ bgcolor: "rgba(255,255,255,.14)", color: "#fff" }} />
						))}
					</Box>
				</Box>

				{canControl && (
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						<Button variant="contained" color="success" startIcon={<StartIcon />} disabled={online || busy} onClick={() => onAction(serverName, "start")} data-testid="header-start">
							Start
						</Button>
						<Button variant="contained" color="warning" startIcon={<RestartIcon />} disabled={!online || busy} onClick={() => onAction(serverName, "restart")} data-testid="header-restart">
							Restart
						</Button>
						<Button variant="contained" color="error" startIcon={<StopIcon />} disabled={(!online && operation !== "starting") || (busy && operation !== "starting")} onClick={() => onAction(serverName, "stop")} data-testid="header-stop">
							Stop
						</Button>
					</Box>
				)}
			</Box>
		</Box>
	);
}

export default React.memo(ServerHeader);
