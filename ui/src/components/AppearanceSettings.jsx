import React from "react";
import {
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { getGameInfo } from "../gameCatalog";
import { t, useT, errorText } from "../i18n";
import InfoTip from "./InfoTip";
import TipRow from "./settings/TipRow";
import SectionCard from "./ui/SectionCard";

// Per-game-type artwork. Grouped by type rather than by server because that's
// what the dashboard actually draws: every instance of a type shares one card
// and one banner.

const modeLabels = () => ({
	auto: t("appearance.modeAuto"),
	color: t("appearance.modeColor"),
	image: t("appearance.modeImage"),
});

function Preview({ type, entry }) {
	const { title, banner, gradient } = getGameInfo(type, entry);
	return (
		<Box
			sx={{
				position: "relative",
				height: 90,
				borderRadius: 2.5,
				overflow: "hidden",
				backgroundImage: banner ? `url(${banner}), ${gradient}` : gradient,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}}
		>
			<Box
				sx={{
					position: "absolute",
					inset: 0,
					// A dark fade so the game's name can be read over any picture.
					background: (t) => `linear-gradient(to top, ${alpha(t.palette.common.black, 0.85)} 0%, ${alpha(t.palette.common.black, 0)} 100%)`,
				}}
			/>
			<Typography
				variant="subtitle1"
				sx={{
					position: "absolute",
					left: 12,
					bottom: 8,
					color: (t) => t.palette.common.white,
					fontWeight: 600,
					textShadow: (t) => `0 1px 4px ${alpha(t.palette.common.black, 0.6)}`,
				}}
			>
				{title}
			</Typography>
		</Box>
	);
}

function TypeRow({ type, entry, recommended, onChanged }) {
	useT();
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [notes, setNotes] = React.useState([]);
	const [candidates, setCandidates] = React.useState(null);
	const [appId, setAppId] = React.useState(entry.appId ?? "");
	const fileInput = React.useRef(null);

	const mode = entry.mode ?? "auto";

	const run = async (work) => {
		setBusy(true);
		setError(null);
		setNotes([]);
		try {
			const updated = await work();
			if (updated) onChanged(type, updated);
			if (updated?.notes) setNotes(updated.notes);
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	const patch = (body) => run(() => api.put(`/api/appearance/${type}`, body));

	const pickFile = (event) => {
		const file = event.target.files?.[0];
		event.target.value = ""; // So picking the same file twice still fires.
		if (!file) return;
		const form = new FormData();
		form.append("image", file);
		run(() => api.upload(`/api/appearance/${type}/image`, form));
	};

	const lookUpCandidates = () =>
		run(async () => {
			const { appIds } = await api.get(`/api/appearance/${type}/steam-candidates`);
			setCandidates(appIds);
			return null;
		});

	return (
		<Accordion disableGutters variant="outlined" sx={{ borderRadius: 3, overflow: "hidden", "&:before": { display: "none" } }}>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Box sx={{ width: "100%", pr: 2 }}>
					<Preview type={type} entry={entry} />
				</Box>
			</AccordionSummary>
			<AccordionDetails>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{error && <Alert severity="error">{error}</Alert>}
					{notes.length > 0 && (
						<Alert severity="info">
							{t("appearance.saved", { notes: notes.join(" ") })}
						</Alert>
					)}

					<TipRow info="appearance.banner" sx={{ maxWidth: 380 }}>
						<TextField select fullWidth size="small" label={t("appearance.banner")} value={mode} disabled={busy} onChange={(e) => patch({ mode: e.target.value })}>
							{Object.entries(modeLabels()).map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</TextField>
					</TipRow>

					{mode === "auto" && (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
							<Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
								<TipRow info="appearance.appId" sx={{ minWidth: 260 }}>
									<TextField
										size="small"
										fullWidth
										label={t("appearance.steamAppId")}
										placeholder={t("appearance.foundAutomatically")}
										value={appId}
										disabled={busy}
										onChange={(e) => setAppId(e.target.value)}
										onBlur={() => {
											if ((entry.appId ?? "") !== appId) patch({ appId });
										}}
									/>
								</TipRow>
								<Button
									size="small"
									disabled={busy}
									sx={{ height: 40 }}
									onClick={() => run(() => api.post(`/api/appearance/${type}/refetch`))}
								>
									{t("appearance.fetchAgain")}
								</Button>
								<Button size="small" disabled={busy} sx={{ height: 40 }} onClick={lookUpCandidates}>
									{t("appearance.whatFound")}
								</Button>
							</Box>
							{candidates && (
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{candidates.length === 0 ? t("appearance.noSteamId") : t("appearance.willTry", { list: candidates.join(", ") })}
								</Typography>
							)}
						</Box>
					)}

					{mode === "color" && (
						<Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
							<TipRow info="appearance.color" sx={{ width: 150 }}>
								<TextField
									fullWidth
									size="small"
									type="color"
									label={t("appearance.colour")}
									value={entry.color ?? "#2f7a3f"}
									disabled={busy}
									onChange={(e) => patch({ color: e.target.value })}
								/>
							</TipRow>
							<TipRow info="appearance.color2" sx={{ width: 150 }}>
								<TextField
									fullWidth
									size="small"
									type="color"
									label={t("appearance.fadesTo")}
									value={entry.color2 ?? entry.color ?? "#1f4d2c"}
									disabled={busy}
									onChange={(e) => patch({ color2: e.target.value })}
								/>
							</TipRow>
						</Box>
					)}

					{mode === "image" && (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
							<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
								<Button
									size="small"
									variant="outlined"
									disabled={busy}
									onClick={() => fileInput.current?.click()}
								>
									{entry.image ? t("appearance.replaceImage") : t("appearance.chooseImage")}
								</Button>
								<InfoTip id="appearance.image" sx={{ ml: -0.5 }} />
								<Chip size="small" variant="outlined" label={t("appearance.ideal", { width: recommended.width, height: recommended.height })} />
								{entry.image && (
									<>
										<Chip
											size="small"
											label={`${entry.image.width}x${entry.image.height}`}
										/>
										<Button
											size="small"
											color="error"
											disabled={busy}
											onClick={() => run(() => api.del(`/api/appearance/${type}/image`))}
										>
											{t("common.remove")}
										</Button>
									</>
								)}
								{!entry.image && (
									<Typography variant="caption" sx={{ color: "warning.main" }}>
										{t("appearance.noImage")}
									</Typography>
								)}
							</Box>
							<input
								ref={fileInput}
								type="file"
								accept="image/png,image/jpeg"
								hidden
								onChange={pickFile}
							/>
						</Box>
					)}

					{busy && <CircularProgress size={18} />}
				</Box>
			</AccordionDetails>
		</Accordion>
	);
}

function AppearanceSettings() {
	// Re-renders this section when the language changes, so the t() text below switches with it.
	useT();
	const [data, setData] = React.useState(null);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		api.get("/api/appearance").then(setData, (e) => setError(errorText(e)));
	}, []);

	const onChanged = (type, updated) =>
		setData((prev) => ({ ...prev, types: { ...prev.types, [type]: updated } }));

	if (error) return <Alert severity="error">{error}</Alert>;
	if (!data) return <CircularProgress size={20} />;

	const types = Object.keys(data.types);

	return (
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("common.appearance")}
					<InfoTip id="card.appearance" />
				</Box>
			}
			// Unlike the boxes above, nothing here waits for the Save button, so it says so.
			actions={<Chip size="small" color="success" variant="outlined" label={t("appearance.appliesNow")} />}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
				{types.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{t("appearance.nothingToStyle")}
					</Typography>
				)}
				{types.map((type) => (
					<TypeRow
						key={type}
						type={type}
						entry={data.types[type]}
						recommended={data.recommended}
						onChanged={onChanged}
					/>
				))}
			</Box>
		</SectionCard>
	);
}

export default AppearanceSettings;
