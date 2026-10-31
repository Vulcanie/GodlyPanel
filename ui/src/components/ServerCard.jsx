import React from "react";
import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import {
	PlayArrow as StartIcon,
	Stop as StopIcon,
	RestartAlt as RestartIcon,
	ArrowForward as OpenIcon,
	PeopleAlt as PlayersIcon,
	NetworkPing as PingIcon,
	Lock as LockIcon,
	Memory as MemoryIcon,
	Dns as AddressIcon,
} from "@mui/icons-material";
import LiveDot from "./ui/LiveDot";
import HeapBar from "./HeapBar";
import { useOperation, operationLabel } from "../OperationsContext";
import { copyToClipboard } from "../utils/clipboard";
import { getGameInfo } from "../gameCatalog";
import { t, useT } from "../i18n";

/** A small labelled value that copies itself when clicked: an address, a password. */
function CopyChip({ icon, label, value, testId }) {
	// Re-renders this chip when the language changes, so the t() text below switches with it.
	useT();
	// null until a copy has happened; then the copy's result shows for a moment, and the hint comes back.
	const [result, setResult] = React.useState(null);
	const tip = result ?? t("server.copyTip");
	const copy = (e) => {
		e.stopPropagation();
		copyToClipboard(value, setResult);
		setTimeout(() => setResult(null), 1800);
	};
	return (
		<Tooltip title={tip}>
			<Chip
				size="small"
				variant="outlined"
				data-testid={testId}
				icon={icon}
				label={
					<span>
						<Box component="span" sx={{ color: "text.secondary", mr: 0.5 }}>
							{label}
						</Box>
						{value}
					</span>
				}
				onClick={copy}
				sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
			/>
		</Tooltip>
	);
}

function Stat({ icon, children }) {
	return (
		<Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary", fontSize: 13 }}>
			{icon}
			<span>{children}</span>
		</Box>
	);
}

/**
 * One server on the dashboard. Everything someone usually wants is on the card: whether it is up, who is on, how to join it,
 * and (for people who run it) the buttons to start, stop and restart it. Clicking the card opens the server.
 */
function ServerCard({ name, status, stats, appearance, canOpen, canControl, onOpen, onAction }) {
	// Re-renders this card when the language changes, so the t() text below switches with it.
	useT();
	const operation = useOperation(name);
	const online = Boolean(status?.online);
	const info = React.useMemo(() => getGameInfo(status?.type, appearance), [status?.type, appearance]);
	const state = operation ? "busy" : online ? "online" : "offline";
	const players = status?.playerList?.filter((p) => typeof p === "string") ?? [];
	const busy = Boolean(operation);

	return (
		<Box
			data-testid={`server-card-${name}`}
			onClick={canOpen ? () => onOpen(name) : undefined}
			role={canOpen ? "link" : undefined}
			tabIndex={canOpen ? 0 : undefined}
			onKeyDown={canOpen ? (e) => e.key === "Enter" && onOpen(name) : undefined}
			sx={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				borderRadius: 4,
				border: 1,
				borderColor: online ? (t) => t.palette.status.online + "55" : "divider",
				bgcolor: "background.paper",
				cursor: canOpen ? "pointer" : "default",
				transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
				"&:hover": canOpen ? { transform: "translateY(-3px)", boxShadow: (t) => t.custom.shadow, borderColor: "primary.main" } : undefined,
				"&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
			}}
		>
			{/* The game's artwork, dimmed, behind the name. The gradient shows through when there is none. */}
			<Box sx={{ position: "relative", height: 84, background: info.gradient }}>
				{info.banner && <Box sx={{ position: "absolute", inset: 0, backgroundImage: `url(${info.banner})`, backgroundSize: "cover", backgroundPosition: "center", opacity: online ? 1 : 0.55, transition: "opacity .3s", filter: online ? "none" : "grayscale(0.6)" }} />}
				<Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,24,0.92) 0%, rgba(8,12,24,0.35) 70%, rgba(8,12,24,0.1) 100%)" }} />
				<Box sx={{ position: "absolute", left: 16, right: 16, bottom: 10, display: "flex", alignItems: "center", gap: 1.25 }}>
					<LiveDot state={state} size={11} />
					<Box sx={{ minWidth: 0, flex: 1 }}>
						<Typography variant="subtitle1" noWrap sx={{ color: "#fff", lineHeight: 1.2, textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>
							{name}
						</Typography>
						<Typography variant="caption" noWrap sx={{ color: "rgba(255,255,255,.78)", display: "block" }}>
							{info.title}
						</Typography>
					</Box>
					{operation ? (
						<Chip size="small" color="warning" label={operationLabel(operation)} sx={{ height: 22 }} />
					) : (
						<Chip size="small" color={online ? "success" : "default"} label={online ? t("common.online") : t("common.offline")} sx={{ height: 22, bgcolor: online ? undefined : "rgba(255,255,255,.16)", color: online ? undefined : "#fff" }} />
					)}
				</Box>
			</Box>

			<Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25, flex: 1 }}>
				<Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.75 }}>
					<Stat icon={<PlayersIcon sx={{ fontSize: 16 }} />}>
						<strong>{status?.playerCount ?? 0}</strong>
						{status?.maxplayers ? ` / ${status.maxplayers}` : ""} {t("common.players")}
					</Stat>
					{online && status?.ping != null && <Stat icon={<PingIcon sx={{ fontSize: 16 }} />}>{t("server.pingMs", { ms: status.ping })}</Stat>}
					{stats?.running && <Stat icon={<MemoryIcon sx={{ fontSize: 16 }} />}>{t("server.cardCpuRam", { cpu: stats.cpuPercent, ram: (stats.ramMB / 1024).toFixed(1) })}</Stat>}
				</Box>

				{players.length > 0 && (
					<Typography variant="caption" noWrap title={players.join(", ")} sx={{ color: "text.secondary" }}>
						{players.length > 6 ? t("server.onNowMore", { players: players.slice(0, 6).join(", "), more: players.length - 6 }) : t("server.onNow", { players: players.join(", ") })}
					</Typography>
				)}

				{status?.type === "minecraft" && stats?.running && stats.heapMaxMB != null && <HeapBar usedMB={stats.heapUsedMB} maxMB={stats.heapMaxMB} percent={stats.heapPercent} />}

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }} onClick={(e) => e.stopPropagation()}>
					{(status?.session || status?.joinAddress) && <CopyChip icon={<AddressIcon />} label={t("server.join")} value={status.session || status.joinAddress} testId="chip-session" />}
					{status?.sessionName && status.sessionName !== status.session && status.sessionName !== status.joinAddress && <CopyChip icon={<AddressIcon />} label={t("common.name")} value={status.sessionName} testId="chip-name" />}
					{status?.serverPassword && <CopyChip icon={<LockIcon />} label={t("common.password")} value={status.serverPassword} testId="chip-password" />}
					{(status?.tags ?? []).map((tag) => (
						<Chip key={tag} size="small" label={tag} sx={{ bgcolor: (t) => t.custom.hover }} />
					))}
				</Box>
			</Box>

			{(canControl || canOpen) && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 1, borderTop: 1, borderColor: "divider" }} onClick={(e) => e.stopPropagation()}>
					{canControl && (
						<>
							<Tooltip title={online ? t("server.alreadyRunning") : t("common.start")}>
								<span>
									<IconButton size="small" color="success" disabled={online || busy} onClick={() => onAction(name, "start")} aria-label={t("server.startNamed", { server: name })}>
										<StartIcon />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title={t("common.restart")}>
								<span>
									<IconButton size="small" color="warning" disabled={!online || busy} onClick={() => onAction(name, "restart")} aria-label={t("server.restartNamed", { server: name })}>
										<RestartIcon />
									</IconButton>
								</span>
							</Tooltip>
							<Tooltip title={t("common.stop")}>
								<span>
									<IconButton size="small" color="error" disabled={(!online && operation !== "starting") || (busy && operation !== "starting")} onClick={() => onAction(name, "stop")} aria-label={t("server.stopNamed", { server: name })}>
										<StopIcon />
									</IconButton>
								</span>
							</Tooltip>
						</>
					)}
					<Box sx={{ flex: 1 }} />
					{canOpen && (
						<Typography variant="caption" sx={{ color: "primary.main", display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 600 }}>
							{t("common.open")} <OpenIcon sx={{ fontSize: 14 }} />
						</Typography>
					)}
				</Box>
			)}
		</Box>
	);
}

export default React.memo(ServerCard);
