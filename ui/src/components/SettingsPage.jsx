import React from "react";
import {
	Box,
	Button,
	Typography,
	Paper,
	TextField,
	MenuItem,
	Switch,
	FormControlLabel,
	Alert,
	CircularProgress,
	Divider,
	Chip,
	LinearProgress,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { api } from "../api/client";

// The form is generated from the schema the server sends, so it can't drift
// out of step with what's actually honoured — adding a setting on the server
// makes it appear here with its own label, limits and restart behaviour.

const GROUP_LABELS = {
	http: "Access",
	network: "Network",
	paths: "Folders",
	portAllocation: "Ports",
	polling: "Refresh rates",
	storage: "Storage",
	servers: "New servers",
	discord: "Discord",
};

const SECRET_FIELDS = [
	{ key: "discordWebhookUrl", label: "Discord status webhook" },
	{ key: "discordUpdateWebhookUrl", label: "Discord update webhook" },
	{ key: "curseForgeApiKey", label: "CurseForge API key" },
	{ key: "fixedRconPassword", label: "Fixed RCON password" },
];

function valueAt(obj, dotted) {
	return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function nest(dotted, value) {
	const keys = dotted.split(".");
	const out = {};
	let cur = out;
	keys.forEach((k, i) => {
		if (i === keys.length - 1) cur[k] = value;
		else cur = cur[k] = {};
	});
	return out;
}

function formatBytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function SettingsPage({ onBack }) {
	const [data, setData] = React.useState(null);
	const [storage, setStorage] = React.useState(null);
	const [edits, setEdits] = React.useState({});
	const [secretEdits, setSecretEdits] = React.useState({});
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [restartNeeded, setRestartNeeded] = React.useState([]);
	const [busy, setBusy] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			const [settings, storageState] = await Promise.all([
				api.get("/api/settings"),
				api.get("/api/storage").catch(() => null),
			]);
			setData(settings);
			setStorage(storageState);
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
	}, [load]);

	const current = (spec) =>
		spec.path in edits ? edits[spec.path] : valueAt(data.config, spec.path);

	const setField = (spec, value) =>
		setEdits((prev) => ({ ...prev, [spec.path]: value }));

	const save = async () => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			let patch = {};
			for (const [dotted, value] of Object.entries(edits)) {
				patch = mergeDeep(patch, nest(dotted, value));
			}

			if (Object.keys(patch).length > 0) {
				const result = await api.put("/api/settings", patch);
				setRestartNeeded(result.restartRequired ?? []);
				if (result.issues?.length) {
					setNotice(result.issues.join(" "));
				}
			}

			const secretPatch = Object.fromEntries(
				Object.entries(secretEdits).filter(([, v]) => v !== ""),
			);
			if (Object.keys(secretPatch).length > 0) {
				await api.put("/api/settings/secrets", secretPatch);
			}

			setEdits({});
			setSecretEdits({});
			await load();
			if (!notice) setNotice("Settings saved.");
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const rescan = async () => {
		await api.post("/api/settings/storage/rescan");
		setNotice("Recalculating storage in the background — this can take a few minutes.");
	};

	if (!data) {
		return <CircularProgress sx={{ display: "block", mx: "auto", mt: 8 }} />;
	}

	const groups = {};
	for (const spec of data.fields) {
		const group = spec.path.split(".")[0];
		(groups[group] ||= []).push(spec);
	}

	const dirty = Object.keys(edits).length > 0 || Object.keys(secretEdits).length > 0;

	return (
		<Box sx={{ mt: 2, pb: 10 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<Typography variant="h5" gutterBottom>
				Settings
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
				Stored in {data.paths.configFile}
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
					{notice}
				</Alert>
			)}
			{restartNeeded.length > 0 && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Saved. {restartNeeded.join(", ")} only takes effect after a restart —
					use Restart API in the tray menu.
				</Alert>
			)}

			{storage && (
				<Paper sx={{ p: 2, mb: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
						<Typography variant="subtitle2" sx={{ flex: 1 }}>
							Storage
						</Typography>
						{storage.stale && <Chip size="small" label="Recalculating" />}
						<Button size="small" onClick={rescan}>
							Recalculate
						</Button>
					</Box>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{formatBytes(storage.totals.bytes)} across {storage.roots.length} folder
						{storage.roots.length === 1 ? "" : "s"}
						{storage.quotaBytes > 0 && ` of a ${formatBytes(storage.quotaBytes)} limit`}
						{storage.volumes?.[0] &&
							` · ${formatBytes(storage.volumes[0].freeBytes)} free on ${storage.volumes[0].root}`}
					</Typography>
					{storage.quotaBytes > 0 && (
						<LinearProgress
							variant="determinate"
							value={Math.min(100, (storage.usedRatio ?? 0) * 100)}
							sx={{ mt: 1, height: 6, borderRadius: 3 }}
						/>
					)}
				</Paper>
			)}

			{Object.entries(groups).map(([group, specs]) => (
				<Paper key={group} sx={{ p: 2, mb: 2 }}>
					<Typography variant="subtitle2" sx={{ mb: 2 }}>
						{GROUP_LABELS[group] ?? group}
					</Typography>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
						{specs.map((spec) => (
							<Field
								key={spec.path}
								spec={spec}
								value={current(spec)}
								onChange={(v) => setField(spec, v)}
							/>
						))}
					</Box>
				</Paper>
			))}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
					Keys and webhooks
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					Kept separately from the rest of your settings, so a settings file is
					safe to share when asking for help. Leave blank to keep the current value.
				</Typography>
				<Divider sx={{ my: 2 }} />
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{SECRET_FIELDS.map((field) => (
						<TextField
							key={field.key}
							fullWidth
							size="small"
							type="password"
							label={field.label}
							placeholder={data.secrets[field.key] ? "•••••••• (set)" : "Not set"}
							value={secretEdits[field.key] ?? ""}
							onChange={(e) =>
								setSecretEdits((prev) => ({ ...prev, [field.key]: e.target.value }))
							}
						/>
					))}
				</Box>
			</Paper>

			<Box
				sx={{
					position: "sticky",
					bottom: 0,
					display: "flex",
					gap: 2,
					py: 2,
					backgroundColor: (t) => t.palette.background.default,
					borderTop: "1px solid rgba(255,255,255,0.08)",
				}}
			>
				<Button variant="contained" disabled={!dirty || busy} onClick={save}>
					{busy ? "Saving..." : "Save changes"}
				</Button>
				<Button
					variant="outlined"
					disabled={!dirty || busy}
					onClick={() => {
						setEdits({});
						setSecretEdits({});
					}}
				>
					Discard
				</Button>
			</Box>
		</Box>
	);
}

function Field({ spec, value, onChange }) {
	const help = spec.help || (spec.restart ? "Takes effect after a restart." : undefined);

	if (spec.type === "bool") {
		return (
			<FormControlLabel
				control={
					<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
				}
				label={
					<Box>
						<Typography variant="body2">{spec.label}</Typography>
						{help && (
							<Typography variant="caption" sx={{ color: "text.secondary" }}>
								{help}
							</Typography>
						)}
					</Box>
				}
			/>
		);
	}

	if (spec.type === "enum") {
		return (
			<TextField
				select
				fullWidth
				size="small"
				label={spec.label}
				helperText={help}
				value={value ?? ""}
				onChange={(e) => onChange(e.target.value)}
			>
				{spec.values.map((v) => (
					<MenuItem key={v} value={v}>
						{v}
					</MenuItem>
				))}
			</TextField>
		);
	}

	if (spec.type === "intArray" || spec.type === "stringArray") {
		return (
			<TextField
				fullWidth
				size="small"
				label={spec.label}
				helperText={help ? `${help} Separate with commas.` : "Separate with commas."}
				value={Array.isArray(value) ? value.join(", ") : ""}
				onChange={(e) => {
					const parts = e.target.value
						.split(",")
						.map((s) => s.trim())
						.filter(Boolean);
					onChange(spec.type === "intArray" ? parts.map(Number).filter(Number.isFinite) : parts);
				}}
			/>
		);
	}

	return (
		<TextField
			fullWidth
			size="small"
			type={spec.type === "int" ? "number" : "text"}
			label={spec.label}
			helperText={help}
			value={value ?? ""}
			onChange={(e) =>
				onChange(spec.type === "int" ? Number(e.target.value) : e.target.value)
			}
		/>
	);
}

function mergeDeep(target, source) {
	const out = { ...target };
	for (const [key, value] of Object.entries(source)) {
		out[key] =
			value && typeof value === "object" && !Array.isArray(value)
				? mergeDeep(out[key] ?? {}, value)
				: value;
	}
	return out;
}

export default SettingsPage;
