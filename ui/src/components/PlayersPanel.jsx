import React from "react";
import { Alert, Avatar, Box, Button, Chip, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Groups as PlayersIcon, Login as JoinIcon, Logout as LeaveIcon } from "@mui/icons-material";
import PlayerAdminCard from "./PlayerAdminCard";
import SectionCard from "./ui/SectionCard";
import CompactEmpty from "./CompactEmpty";
import LiveDot from "./ui/LiveDot";
import { api } from "../api/client";
import { t, tn, useT, formatDate, formatNumber, errorText, getLocale } from "../i18n";

const ago = (iso) => {
	const then = Date.parse(iso);
	if (!Number.isFinite(then)) return t("players.unknownAgo");
	const seconds = Math.max(0, (Date.now() - then) / 1000);
	if (seconds < 90) return t("common.justNow");
	if (seconds < 5400) return t("players.minAgo", { count: Math.round(seconds / 60) });
	if (seconds < 172800) return t("players.hoursAgo", { count: Math.round(seconds / 3600) });
	return tn("players.daysAgo", Math.round(seconds / 86400));
};

const clock = (iso) => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(getLocale());
};

const minutes = (m) => (m >= 120 ? t("players.hours", { count: formatNumber(Number((m / 60).toFixed(1))) }) : t("players.minutes", { count: m }));

const list = (value) => (Array.isArray(value) ? value : []);

/** Who is on the server, who has come and gone, and everyone the panel has seen. */
function PlayersPanel({ serverName }) {
	// Re-renders this panel when the language changes, so the t() text below switches with it.
	useT();
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [reloads, setReloads] = React.useState(0);

	React.useEffect(() => {
		let alive = true;
		// Another server's players must not linger while this one's are on the way.
		setData(null);
		setError(null);
		const load = () =>
			api
				.get(`/api/server/${encodeURIComponent(serverName)}/players`)
				.then((d) => alive && (setData(d), setError(null)))
				.catch((e) => alive && setError(errorText(e, t("players.loadFailed"))));
		load();
		const timer = setInterval(load, 8000);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [serverName, reloads]);

	if (!data) {
		return error ? (
			<Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloads((n) => n + 1)}>{t("common.tryAgain")}</Button>}>
				{error}
			</Alert>
		) : (
			<Box aria-busy="true" aria-label={t("players.loading")}>
				<Skeleton variant="rounded" height={96} sx={{ mb: 2, borderRadius: "16px" }} />
				<Skeleton variant="rounded" height={220} sx={{ borderRadius: "16px" }} />
			</Box>
		);
	}

	const online = list(data.online);
	const recent = list(data.recent);
	const people = list(data.people);
	const unnamed = Number(data.unnamed) || 0;

	return (
		<Box>
			{error && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t("players.staleNote", { error })}
				</Alert>
			)}
			<SectionCard
				title={t("players.onNow", { count: online.length })}
				icon={<LiveDot state={online.length > 0 ? "online" : "offline"} size={10} />}
				contentSx={{ py: 2 }}
			>
				{online.length === 0 ? (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{unnamed > 0 ? tn("players.unnamed", unnamed) : t("players.nobody")}
					</Typography>
				) : (
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
						{online.map((p) => (
							<Chip
								key={p.name}
								color="success"
								variant="outlined"
								avatar={<Avatar sx={{ bgcolor: (t) => alpha(t.palette.success.main, 0.2), color: "success.main", fontWeight: 700 }}>{String(p.name ?? "?").charAt(0).toUpperCase()}</Avatar>}
								label={t("players.onSince", { name: p.name, time: clock(p.since) })}
							/>
						))}
					</Box>
				)}
			</SectionCard>

			<PlayerAdminCard serverName={serverName} online={online} />

			<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
				<SectionCard title={t("players.comingAndGoing")} sx={{ flex: "1 1 320px", mb: 0 }} contentSx={{ py: 1.5 }}>
					{recent.length === 0 ? (
						<CompactEmpty icon={<PlayersIcon />} title={t("players.nothingYet")}>
							{t("players.joinedHint")}
						</CompactEmpty>
					) : (
						recent.slice(0, 40).map((e, i) => {
							const joined = e.type === "join";
							const Icon = joined ? JoinIcon : LeaveIcon;
							return (
								<Box key={`${e.t}-${i}`} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.6 }}>
									<Icon sx={{ fontSize: 16, color: joined ? "success.main" : "text.disabled", flexShrink: 0 }} />
									<Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, color: joined ? "text.primary" : "text.secondary" }}>
										<strong>{e.name}</strong> {joined ? t("players.joined") : t("players.left")}
										{e.reason ? ` (${typeof e.reason === "string" ? e.reason : JSON.stringify(e.reason)})` : ""}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }} title={Number.isFinite(Date.parse(e.t)) ? formatDate(e.t) : undefined}>
										{ago(e.t)}
									</Typography>
								</Box>
							);
						})
					)}
				</SectionCard>

				<SectionCard title={t("players.seen")} sx={{ flex: "2 1 420px", mb: 0 }} contentSx={{ p: 0 }}>
					{people.length === 0 ? (
						<CompactEmpty icon={<PlayersIcon />} title={t("players.noOne")}>
							{t("players.noOneBody")}
						</CompactEmpty>
					) : (
						<Box sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ "& td, & th": { px: 2.5 } }}>
								<TableHead>
									<TableRow>
										<TableCell>{t("players.colPlayer")}</TableCell>
										<TableCell align="right">{t("players.colVisits")}</TableCell>
										<TableCell align="right">{t("players.colTimeOn")}</TableCell>
										<TableCell align="right">{t("players.colLastSeen")}</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{people.map((p) => (
										<TableRow key={p.name} hover>
											<TableCell>
												{p.name} {p.online && <Chip size="small" color="success" label={t("players.online")} sx={{ ml: 0.5 }} />}
											</TableCell>
											<TableCell align="right">{p.sessions}</TableCell>
											<TableCell align="right">{minutes(p.totalMinutes ?? 0)}</TableCell>
											<TableCell align="right">{p.online ? t("players.now") : ago(p.lastSeen)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					)}
					<Typography variant="caption" sx={{ display: "block", p: 2, pt: 1.5, color: "text.secondary" }}>
						{t("players.namesNote")}
					</Typography>
				</SectionCard>
			</Box>
		</Box>
	);
}

export default PlayersPanel;
