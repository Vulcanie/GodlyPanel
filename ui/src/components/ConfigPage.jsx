import React from "react";
import {
	Box,
	Typography,
	Button,
	CircularProgress,
	Tabs,
	Tab,
	TextareaAutosize,
	FormControlLabel,
	Switch,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { grey } from "@mui/material/colors";
import StatusDisplay from "./StatusDisplay";
import ConfigForm from "./ConfigForm";
import RconConsole from "./RconConsole";
import { parseIni, serializeIni } from "../configParsers/ini";
import { parseProperties, serializeProperties } from "../configParsers/properties";
import { parseXmlProperties, serializeXmlProperties } from "../configParsers/xmlProperties";
import {
	parseJsonConfig,
	serializeJsonConfig,
	flattenJsonEntries,
} from "../configParsers/json";
import { parsePalworldStruct, serializePalworldStruct } from "../configParsers/palworldStruct";
import { annotateEntries, getFileParser, getStructuredPaths } from "../configCatalog";
import { detectSettingType } from "../utils/settingType";

const PARSERS = {
	ini: { parse: parseIni, serialize: serializeIni, getEntries: (p) => p.entries },
	properties: {
		parse: parseProperties,
		serialize: serializeProperties,
		getEntries: (p) => p.entries,
	},
	xml: {
		parse: parseXmlProperties,
		serialize: serializeXmlProperties,
		getEntries: (p) => p.entries,
	},
	json: {
		parse: parseJsonConfig,
		serialize: serializeJsonConfig,
		getEntries: (p, structuredPaths) =>
			flattenJsonEntries(p, new Set(structuredPaths)),
	},
	palworld: {
		parse: parsePalworldStruct,
		serialize: serializePalworldStruct,
		getEntries: (p) => p.entries,
	},
};

function ConfigPage({
	serverName,
	serverStatus,
	onBack,
	userRole,
	authToken,
	onEditBatchFiles,
}) {
	const [serverInfo, setServerInfo] = React.useState(null);
	const [configs, setConfigs] = React.useState({});
	const [activeTab, setActiveTab] = React.useState(0);
	const [message, setMessage] = React.useState("");
	const [loading, setLoading] = React.useState(true);
	const [viewRaw, setViewRaw] = React.useState(false);
	// null (closed), "update", or "reboot"
	const [updateDialogMode, setUpdateDialogMode] = React.useState(null);
	const [autoUpdateEnabled, setAutoUpdateEnabled] = React.useState(false);
	const [autoUpdateBusy, setAutoUpdateBusy] = React.useState(false);

	// ✅ Centralized and sanitized API base
	const API_BASE =
		process.env.REACT_APP_API_URL?.trim().replace(/\/+$/, "") || "";
	const joinUrl = (base, path) =>
		`${base}/${path}`.replace(/\/+/g, "/").replace(":/", "://");

	React.useEffect(() => {
		const fetchServerInfo = async () => {
			try {
				setLoading(true);
				const infoRes = await fetch(
					`${API_BASE}/api/server/${serverName}?t=${Date.now()}`,
					{
						headers: {
							Accept: "application/json",
							"ngrok-skip-browser-warning": "true",
							"Access-Control-Allow-Origin": "*",
						},
					},
				);
				if (!infoRes.ok) throw new Error("Failed to fetch server info");
				const infoData = await infoRes.json();
				setServerInfo(infoData);
				setAutoUpdateEnabled(Boolean(infoData.autoUpdateEnabled));

				if (infoData.configNames && infoData.configNames.length > 0) {
					const newConfigs = {};
					for (const name of infoData.configNames) {
						const configRes = await fetch(
							joinUrl(
								API_BASE,
								`/api/config/${serverName}?file=${name}&t=${Date.now()}`,
							),
							{
								headers: {
									Accept: "application/json",
									"ngrok-skip-browser-warning": "true",
									"Access-Control-Allow-Origin": "*",
								},
							},
						);
						const configData = await configRes.json();
						newConfigs[name] =
							configData.content ||
							`Could not load content for ${name}`;
					}
					setConfigs(newConfigs);
				}
			} catch (err) {
				setMessage(
					"Error connecting to the server to get config details.",
				);
			} finally {
				setLoading(false);
			}
		};

		if (userRole === "admin") {
			fetchServerInfo();
		}
	}, [serverName, userRole]);

	const handleTabChange = (event, newValue) => {
		setActiveTab(newValue);
	};

	const handleSave = async () => {
		const activeConfigName = serverInfo.configNames[activeTab];
		const activeConfigContent = configs[activeConfigName];
		setMessage(`Saving ${activeConfigName}...`);
		try {
			const res = await fetch(
				joinUrl(API_BASE, `/api/config/${serverName}`),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
						"ngrok-skip-browser-warning": "true",
						"Access-Control-Allow-Origin": "*",
					},
					body: JSON.stringify({
						fileName: activeConfigName,
						content: activeConfigContent,
					}),
				},
			);
			const data = await res.json();
			setMessage(data.message || data.error);
		} catch (err) {
			setMessage("Failed to send save request.");
		}
	};

	const handleControl = async (action) => {
		setMessage(`Sending ${action} command...`);
		try {
			const res = await fetch(
				joinUrl(API_BASE, `/api/control/${serverName}/${action}`),
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${authToken}`,
						"ngrok-skip-browser-warning": "true",
						"Access-Control-Allow-Origin": "*",
					},
				},
			);
			const data = await res.json();
			setMessage(data.message || data.error);
		} catch (err) {
			setMessage("Failed to send control command.");
		}
	};

	const handleToggleAutoUpdate = async () => {
		const next = !autoUpdateEnabled;
		setAutoUpdateBusy(true);
		try {
			const res = await fetch(
				joinUrl(API_BASE, `/api/server/${serverName}/auto-update`),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
						"ngrok-skip-browser-warning": "true",
						"Access-Control-Allow-Origin": "*",
					},
					body: JSON.stringify({ enabled: next }),
				},
			);
			const data = await res.json();
			if (data.success) {
				setAutoUpdateEnabled(data.autoUpdateEnabled);
				setMessage(
					`Auto-update turned ${data.autoUpdateEnabled ? "on" : "off"} for ${serverName}.`,
				);
			} else {
				setMessage(data.error || "Failed to change auto-update setting.");
			}
		} catch (err) {
			setMessage("Failed to send auto-update toggle request.");
		} finally {
			setAutoUpdateBusy(false);
		}
	};

	const handleConfirmUpdate = () => {
		const action = updateDialogMode === "reboot" ? "update-reboot" : "update";
		setUpdateDialogMode(null);
		handleControl(action);
	};

	const currentConfigName = serverInfo?.configNames?.[activeTab];
	const gameType = serverStatus?.type;
	const parserType = currentConfigName
		? getFileParser(gameType, currentConfigName)
		: null;
	const parserDef = parserType ? PARSERS[parserType] : null;
	const rawText = currentConfigName ? configs[currentConfigName] || "" : "";
	const structuredPaths = React.useMemo(
		() =>
			currentConfigName ? getStructuredPaths(gameType, currentConfigName) : [],
		[gameType, currentConfigName],
	);

	const parsed = React.useMemo(() => {
		if (!parserDef || !rawText) return null;
		try {
			return parserDef.parse(rawText);
		} catch (e) {
			return null;
		}
	}, [parserDef, rawText]);

	const groups = React.useMemo(() => {
		if (!parsed || !parserDef || !currentConfigName) return [];
		const entries = parserDef.getEntries(parsed, structuredPaths);
		return annotateEntries(gameType, currentConfigName, entries).groups;
	}, [parsed, parserDef, currentConfigName, gameType, structuredPaths]);

	const handleSettingChange = (entry, rawNewValue) => {
		if (!parserDef || !parsed || !currentConfigName) return;
		let newValue = rawNewValue;
		if (parserType === "json" && !entry.structured) {
			if (entry.rawJson) {
				try {
					newValue = JSON.parse(rawNewValue);
				} catch (e) {
					newValue = rawNewValue;
				}
			} else {
				const type = detectSettingType(entry.value);
				if (type === "boolean") {
					newValue = String(rawNewValue).toLowerCase() === "true";
				} else if (type === "number") {
					newValue = rawNewValue === "" ? rawNewValue : Number(rawNewValue);
				}
			}
		}
		const newText = parserDef.serialize(parsed, { [entry.id]: newValue });
		setConfigs((prev) => ({ ...prev, [currentConfigName]: newText }));
	};

	const parseFailed = Boolean(parserDef && rawText && !parsed);
	const showRaw = viewRaw || parseFailed;
	const isArk = gameType === "ark";

	const isReboot = updateDialogMode === "reboot";
	const updateScope = isArk
		? "every ARK server sharing this install (all the ASA maps)"
		: "this server";
	const updateAfterward = isReboot
		? isArk
			? "then start whichever of them were actually running back up automatically once the update finishes (any that were already stopped stay stopped)"
			: "then start it back up automatically once the update finishes"
		: `and leave ${isArk ? "them" : "it"} stopped when it's done — you'll need to start ${isArk ? "them" : "it"} back up manually`;

	const updateDialog = (
		<Dialog
			open={updateDialogMode !== null}
			onClose={() => setUpdateDialogMode(null)}
		>
			<DialogTitle>
				{isReboot ? "Update & reboot" : "Update"} {serverName}?
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					This will stop {updateScope}, run the SteamCMD update, {updateAfterward}.
				</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setUpdateDialogMode(null)}>Cancel</Button>
				<Button
					variant="contained"
					color="warning"
					onClick={handleConfirmUpdate}
				>
					{isReboot ? "Update & Reboot" : "Update"}
				</Button>
			</DialogActions>
		</Dialog>
	);

	if (userRole !== "admin") {
		return (
			<Box sx={{ mt: 4 }}>
				<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
					<Button startIcon={<ArrowBackIcon />} onClick={onBack}>
						Back to Dashboard
					</Button>
				</Box>

				<Typography variant="h5" color="warning.main">
					Access Denied: Guest users cannot view or edit server
					configurations.
				</Typography>
			</Box>
		);
	}

	// ✅ Handle servers with no config files
	if (!loading && serverInfo?.configNames?.length === 0) {
		return (
			<Box sx={{ mt: 4 }}>
				{updateDialog}
				<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
					<Button startIcon={<ArrowBackIcon />} onClick={onBack}>
						Back to Dashboard
					</Button>

					{userRole === "admin" && (
						<Button
							variant="outlined"
							color="warning"
							onClick={onEditBatchFiles}
						>
							Edit Batch Files
						</Button>
					)}
				</Box>

				<Typography variant="h5" color="info.main">
					This server does not have any editable config files.
				</Typography>
				<Box
					sx={{
						display: "flex",
						flexWrap: "wrap",
						gap: 2,
						mt: 3,
						alignItems: "center",
					}}
				>
					<Button
						variant="contained"
						color="success"
						onClick={() => handleControl("start")}
					>
						Start Server
					</Button>
					<Button
						variant="contained"
						color="error"
						onClick={() => handleControl("stop")}
					>
						Stop Server
					</Button>
					{serverInfo?.hasUpdate && (
						<>
							<Button
								variant="contained"
								color="warning"
								onClick={() => setUpdateDialogMode("update")}
							>
								Update Server
							</Button>
							<Button
								variant="contained"
								color="warning"
								onClick={() => setUpdateDialogMode("reboot")}
							>
								Update and Reboot
							</Button>
							<Button
								variant={autoUpdateEnabled ? "contained" : "outlined"}
								color={autoUpdateEnabled ? "success" : "inherit"}
								disabled={autoUpdateBusy}
								onClick={handleToggleAutoUpdate}
							>
								Auto-Update: {autoUpdateEnabled ? "ON" : "OFF"}
							</Button>
						</>
					)}
					{message && (
						<Typography
							variant="body2"
							sx={{
								color: grey[400],
								fontStyle: "italic",
							}}
						>
							Status: {message}
						</Typography>
					)}
				</Box>
				{serverInfo?.hasRcon && (
					<RconConsole apiBase={API_BASE} serverName={serverName} authToken={authToken} />
				)}
				<StatusDisplay serverStatus={serverStatus} />
			</Box>
		);
	}

	return (
		<Box sx={{ pb: "120px" }}>
			{updateDialog}
			<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
				<Button startIcon={<ArrowBackIcon />} onClick={onBack}>
					Back to Dashboard
				</Button>

				{userRole === "admin" && (
					<Button
						variant="outlined"
						color="warning"
						onClick={onEditBatchFiles}
					>
						Edit Batch Files
					</Button>
				)}
			</Box>

			<Box
				sx={{
					display: "flex",
					flexDirection: { xs: "column", md: "row" },
					justifyContent: "space-between",
					alignItems: { xs: "stretch", md: "flex-start" },
					gap: 2,
					mb: 2,
				}}
			>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="h4">
						{serverName} - Configuration
					</Typography>
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							gap: 2,
							my: 2,
							alignItems: "center",
							minHeight: "40px",
						}}
					>
						<Button
							variant="contained"
							color="success"
							onClick={() => handleControl("start")}
						>
							Start Server
						</Button>
						<Button
							variant="contained"
							color="error"
							onClick={() => handleControl("stop")}
						>
							Stop Server
						</Button>
						{serverInfo?.hasUpdate && (
							<>
								<Button
									variant="contained"
									color="warning"
									onClick={() => setUpdateDialogMode("update")}
								>
									Update Server
								</Button>
								<Button
									variant="contained"
									color="warning"
									onClick={() => setUpdateDialogMode("reboot")}
								>
									Update and Reboot
								</Button>
								<Button
									variant={autoUpdateEnabled ? "contained" : "outlined"}
									color={autoUpdateEnabled ? "success" : "inherit"}
									disabled={autoUpdateBusy}
									onClick={handleToggleAutoUpdate}
								>
									Auto-Update: {autoUpdateEnabled ? "ON" : "OFF"}
								</Button>
							</>
						)}
						{message && (
							<Typography
								variant="body2"
								sx={{
									color: grey[400],
									ml: 2,
									fontStyle: "italic",
								}}
							>
								Status: {message}
							</Typography>
						)}
					</Box>
				</Box>

				<StatusDisplay serverStatus={serverStatus} />
			</Box>

			{serverInfo?.hasRcon && (
				<RconConsole apiBase={API_BASE} serverName={serverName} authToken={authToken} />
			)}

			{loading ? (
				<CircularProgress />
			) : (
				<>
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							justifyContent: "space-between",
							alignItems: "center",
							gap: 1,
							borderBottom: 1,
							borderColor: "divider",
						}}
					>
						{serverInfo?.configNames?.length > 1 ? (
							<Tabs
								value={activeTab}
								onChange={handleTabChange}
								variant="scrollable"
								scrollButtons="auto"
								sx={{ minHeight: 0, maxWidth: "100%" }}
							>
								{serverInfo.configNames.map((name) => (
									<Tab label={name} key={name} />
								))}
							</Tabs>
						) : (
							<Box />
						)}
						{parserDef && (
							<FormControlLabel
								sx={{ mr: 0 }}
								control={
									<Switch
										checked={showRaw}
										disabled={parseFailed}
										onChange={(e) => setViewRaw(e.target.checked)}
									/>
								}
								label="View Raw"
							/>
						)}
					</Box>

					{parseFailed && (
						<Typography variant="body2" sx={{ color: "warning.main", mt: 1 }}>
							Couldn't parse this file into settings (it may have
							invalid syntax) — showing raw text instead.
						</Typography>
					)}

					{!parserDef || showRaw ? (
						<TextareaAutosize
							value={configs[currentConfigName] || ""}
							onChange={(e) =>
								setConfigs((prev) => ({
									...prev,
									[currentConfigName]: e.target.value,
								}))
							}
							minRows={25}
							style={{
								width: "100%",
								backgroundColor: "#2b2b2b",
								color: "white",
								fontFamily: "monospace",
								fontSize: 14,
								border: "1px solid #555",
								borderRadius: 4,
								padding: "10px",
								marginTop: "16px",
							}}
						/>
					) : groups.length === 0 ? (
						<Typography variant="body2" sx={{ color: grey[500], mt: 2 }}>
							No editable settings found in this file.
						</Typography>
					) : (
						<Box sx={{ mt: 2 }}>
							<ConfigForm groups={groups} onChange={handleSettingChange} />
						</Box>
					)}
				</>
			)}

			<Box
				sx={{
					position: "fixed",
					bottom: 0,
					left: 0,
					right: 0,
					p: 2,
					backgroundColor: "rgba(30, 30, 30, 0.9)",
					backdropFilter: "blur(5px)",
					borderTop: "1px solid",
					borderColor: "divider",
					zIndex: 1100,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Button
					variant="contained"
					onClick={handleSave}
					disabled={loading || !currentConfigName}
				>
					Save {currentConfigName}
				</Button>
			</Box>
		</Box>
	);
}

export default ConfigPage;
