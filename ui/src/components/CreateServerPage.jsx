import React from "react";
import {
	Alert,
	Box,
	Button,
	ButtonBase,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControlLabel,
	IconButton,
	InputAdornment,
	LinearProgress,
	MenuItem,
	Skeleton,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import {
	ArrowBack as ArrowBackIcon,
	ArrowForward as OpenIcon,
	Casino as DiceIcon,
	CheckCircle as DoneIcon,
	Close as ClearIcon,
	Dns as ServerIcon,
	Lan as NetworkIcon,
	Lock as AccessIcon,
	Search as SearchIcon,
	SportsEsports as GameIcon,
	Tune as TuneIcon,
	Folder as FolderIcon,
	AddCircleOutline as CreateIcon,
} from "@mui/icons-material";
import ModpackUploadField from "./ModpackUploadField";
import FolderField from "./FolderField";
import PortsToOpen, { findPortClash } from "./PortsToOpen";
import PageHeader from "./ui/PageHeader";
import SectionCard from "./ui/SectionCard";
import EmptyState from "./ui/EmptyState";
import { getGameInfo } from "../gameCatalog";
import { flatWhenDisabled } from "./cardStyles";
import { useNav } from "../NavContext";
import { api } from "../api/client";

const FIELD_LABELS = {
	sessionName: "Server / Session Name",
	serverPassword: "Server Password",
	adminPassword: "Admin Password (in-game admin rights; must differ from the server password)",
	rconPassword: "RCON Password",
	clusterId: "Cluster ID",
	mods: "Mod IDs (comma-separated, optional)",
};

// Which card each field lives in. Anything not listed here goes in "Game settings".
const BASIC_FIELDS = ["sessionName", "mapCode"];
const ACCESS_FIELDS = ["serverPassword", "adminPassword", "rconPassword"];
// The passwords that are made up for the person and can be re-rolled.
const REROLL = { serverPassword: 8, adminPassword: 10 };

// Max memory is one of a few sensible sizes, not free text.
const MEMORY_CHOICES = ["2", "3", "4", "6", "8", "10", "12", "16", "24", "32"];

// Poll cadence while a creation job is running.
const POLL_MS = 4000;

// What each stage of a creation job is called to a person, and a line on what is going on.
const JOB_STAGES = {
	queued: { label: "Waiting to start" },
	downloading: { label: "Downloading the server", hint: "Downloading it from GitHub and checking it against the checksum GitHub publishes…" },
	installing: { label: "Downloading the game", hint: "Installing the server. This can take a while for a large game…" },
	configuring: { label: "Writing scripts and config", hint: "Writing scripts and config…" },
	"first-boot": { label: "Starting it once to create its settings", hint: "Booting once to generate default config…" },
	"resolving-mods": { label: "Finding the mod files", hint: "Resolving mod files via CurseForge…" },
	"downloading-mods": { label: "Downloading the mods", hint: "Downloading mods. This can take a while for a large pack…" },
};

// A fresh join password for each new server. This used to default to one fixed
// value, which would have meant every server anyone created started out with the
// same well-known password. Letters and digits only, minus the look-alikes
// (0/O, 1/l/I), since people read these out to friends.
function randomJoinPassword(length = 8) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

// Messages from the server are strings; anything else is turned into words rather than "[object Object]".
const words = (value) => (typeof value === "string" ? value : value?.message ? String(value.message) : value ? JSON.stringify(value) : "");

/** A game's artwork (or, with none, its gradient), dimmed at the bottom so white text on it can be read in either theme. */
function Art({ type, height, children, sx }) {
	const info = React.useMemo(() => getGameInfo(type), [type]);
	return (
		<Box sx={{ position: "relative", height, background: info.gradient, overflow: "hidden", ...sx }}>
			{info.banner && <Box sx={{ position: "absolute", inset: 0, backgroundImage: `url(${info.banner})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
			<Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,24,0.88) 0%, rgba(8,12,24,0.3) 65%, rgba(8,12,24,0.05) 100%)" }} />
			{children}
		</Box>
	);
}

/** One game in the picker. The whole card is the button, and the game's name is its heading. */
function GameCard({ template, onPick }) {
	// A hint about what choosing it involves, only where it is not the usual one-step setup.
	const note = template.fields?.includes("uploadId") ? "Needs a modpack zip" : template.sharedInstall ? "Shared install" : template.zipInstall ? "Downloaded from GitHub" : template.webInstall ? "Downloaded from the maker's site" : null;
	return (
		<ButtonBase
			onClick={() => onPick(template)}
			focusRipple
			sx={{
				display: "block",
				textAlign: "left",
				borderRadius: "16px",
				border: 1,
				borderColor: "divider",
				overflow: "hidden",
				bgcolor: "background.paper",
				transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
				"&:hover, &:focus-visible": { transform: "translateY(-3px)", boxShadow: (t) => t.custom.shadow, borderColor: "primary.main" },
				"&:hover .gp-pick, &:focus-visible .gp-pick": { opacity: 1, transform: "none" },
			}}
		>
			<Art type={template.type} height={132}>
				{note && <Chip size="small" label={note} sx={{ position: "absolute", top: 8, right: 8, height: 22, bgcolor: "rgba(8,12,24,0.7)", color: "#fff" }} />}
				<Box sx={{ position: "absolute", left: 14, right: 14, bottom: 10, display: "flex", alignItems: "flex-end", gap: 1 }}>
					<Typography variant="subtitle1" component="h3" sx={{ flex: 1, color: "#fff", lineHeight: 1.2, textShadow: "0 1px 6px rgba(0,0,0,.6)" }}>
						{template.displayName}
					</Typography>
					<OpenIcon className="gp-pick" sx={{ fontSize: 18, color: "#fff", opacity: 0, transform: "translateX(-6px)", transition: "opacity .18s, transform .18s" }} />
				</Box>
			</Art>
		</ButtonBase>
	);
}

const gridSx = { display: "grid", gridTemplateColumns: { xs: "repeat(auto-fill, minmax(150px, 1fr))", sm: "repeat(auto-fill, minmax(230px, 1fr))" }, gap: 2 };

function GamePicker({ templates, loadError, onRetry, onPick }) {
	const [query, setQuery] = React.useState("");
	const list = Array.isArray(templates) ? templates : null;
	const shown = React.useMemo(() => {
		if (!list) return [];
		const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return list.filter((t) => terms.every((w) => [t.displayName, t.type, t.id].some((f) => String(f ?? "").toLowerCase().includes(w))));
	}, [list, query]);

	return (
		<>
			<TextField
				fullWidth
				placeholder="Search games"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && shown.length === 1 && onPick(shown[0])}
				sx={{ mb: 2.5, maxWidth: 520 }}
				slotProps={{
					htmlInput: { "aria-label": "Search games" },
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon fontSize="small" />
							</InputAdornment>
						),
						endAdornment: query ? (
							<InputAdornment position="end">
								<IconButton size="small" edge="end" aria-label="Clear the game search" onClick={() => setQuery("")}>
									<ClearIcon fontSize="small" />
								</IconButton>
							</InputAdornment>
						) : undefined,
					},
				}}
			/>
			{loadError ? (
				<Alert severity="error" action={<Button color="inherit" size="small" onClick={onRetry}>Try again</Button>}>
					{loadError}
				</Alert>
			) : !list ? (
				<Box sx={gridSx} aria-busy="true">
					{Array.from({ length: 8 }, (_, i) => (
						<Skeleton key={i} variant="rounded" height={132} sx={{ borderRadius: "16px" }} />
					))}
				</Box>
			) : shown.length === 0 ? (
				<EmptyState icon={<GameIcon />} title="No game matches that" action={<Button onClick={() => setQuery("")}>Show all games</Button>}>
					Try a shorter name. The panel can set up {list.length} games in one go.
				</EmptyState>
			) : (
				<Box sx={gridSx}>
					{shown.map((t) => (
						<GameCard key={t.id} template={t} onPick={onPick} />
					))}
				</Box>
			)}
		</>
	);
}

/** The picked game's banner, with its name. */
function Hero({ template, children }) {
	return (
		<Art type={template.type} height={{ xs: 104, sm: 132 }} sx={{ borderRadius: "16px", border: 1, borderColor: "divider", mb: 2.5 }}>
			<Box sx={{ position: "absolute", left: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 }, bottom: 14, display: "flex", alignItems: "flex-end", gap: 1.5, flexWrap: "wrap" }}>
				<Typography variant="h5" component="h2" sx={{ color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,.6)", mr: "auto" }}>
					{template.displayName}
				</Typography>
				{children}
			</Box>
		</Art>
	);
}

function CreateServerPage({ onBack, userRole }) {
	const { go } = useNav();
	const [templates, setTemplates] = React.useState(null);
	const [loadError, setLoadError] = React.useState(null);
	const [reloads, setReloads] = React.useState(0);
	const [selected, setSelected] = React.useState(null);
	const [suggested, setSuggested] = React.useState(null);
	const [form, setForm] = React.useState({});
	const [submitting, setSubmitting] = React.useState(false);
	const [submitError, setSubmitError] = React.useState(null);
	const [askSteamCmd, setAskSteamCmd] = React.useState(false);
	// What a game that is downloaded from GitHub (not through SteamCMD) will fetch, while the person is being asked: { repo, asset, tag?, sizeText? }.
	const [askZip, setAskZip] = React.useState(null);
	// The same for a game downloaded from its maker's website (Minecraft, Terraria): { label, host?, version?, sizeText?, checksum? }.
	const [askWeb, setAskWeb] = React.useState(null);
	// The downloads already agreed to for this server, so that a second question doesn't lose the first answer.
	const agreed = React.useRef({});
	const [job, setJob] = React.useState(null);
	// Stages the creation job has been through, in order, so the screen can show what is done and what is going on.
	const [stages, setStages] = React.useState([]);
	// Only the answer to the game picked last counts, if two are picked in quick succession.
	const pickTicket = React.useRef(0);

	React.useEffect(() => {
		if (userRole !== "admin") return undefined;
		let alive = true;
		setLoadError(null);
		api
			.get("/api/templates")
			.then((list) => alive && setTemplates(Array.isArray(list) ? list : []))
			.catch((e) => alive && setLoadError(e.message));
		return () => {
			alive = false;
		};
	}, [userRole, reloads]);

	const pickTemplate = async (template) => {
		const ticket = ++pickTicket.current;
		agreed.current = {};
		setSelected(template);
		setSuggested(null);
		setSubmitError(null);
		setJob(null);
		setStages([]);
		try {
			const data = await api.get(`/api/templates/${template.id}/suggest`);
			if (ticket !== pickTicket.current) return;
			setSuggested(data);
			const initial = {
				name: "",
				rconPassword: data.rconPassword ?? "",
				serverPassword: randomJoinPassword(),
				adminPassword: randomJoinPassword(10),
				// Where it is the address players join by, it starts as the public address and the game port, and follows the port.
				sessionName: template.sessionIsAddress && data.publicAddress ? `${data.publicAddress}:${data.ports.port}` : "",
				sessionAuto: Boolean(template.sessionIsAddress && data.publicAddress),
				// What the dashboard and Discord show as the Session, for every other game: automatic until typed in.
				sessionLabel: !template.sessionIsAddress && data.publicAddress ? `${data.publicAddress}:${data.ports.port}` : "",
				labelAuto: Boolean(!template.sessionIsAddress && data.publicAddress),
				maxPlayers: "",
				mapCode: template.mapChoices?.[0]?.code || "",
				clusterId: "MyCluster",
				mods: "",
				maxMemoryGB: "6",
				eulaAccepted: false,
				uploadId: "",
				installParent: "",
				...Object.fromEntries((template.ports ?? []).map((p) => [p.key, String(data.ports?.[p.key] ?? p.default ?? "")])),
			};
			setForm(initial);
		} catch (e) {
			if (ticket === pickTicket.current) setSubmitError(`Failed to load defaults: ${e.message}`);
		}
	};

	const chooseAnother = () => {
		pickTicket.current++;
		agreed.current = {};
		setSelected(null);
		setSuggested(null);
		setSubmitError(null);
	};

	const setField = (key, value) =>
		setForm((prev) => {
			const next = { ...prev, [key]: value };
			// Typing in the session field takes it off auto; until then it follows the game port.
			if (key === "sessionName") next.sessionAuto = false;
			if (key === "sessionLabel") next.labelAuto = false;
			if (key === "port" && prev.sessionAuto && suggested?.publicAddress) next.sessionName = `${suggested.publicAddress}:${value}`;
			if (key === "port" && prev.labelAuto && suggested?.publicAddress) next.sessionLabel = `${suggested.publicAddress}:${value}`;
			return next;
		});

	const submit = async (accept = {}) => {
		agreed.current = { ...agreed.current, ...accept };
		setAskSteamCmd(false);
		setAskZip(null);
		setAskWeb(null);
		setSubmitting(true);
		setSubmitError(null);
		try {
			const { sessionAuto, labelAuto, ...fields } = form;
			// Left automatic, the label is not stored, so it keeps following the port.
			if (labelAuto) delete fields.sessionLabel;
			const body = {
				templateId: selected.id,
				...fields,
				...(agreed.current.steamCmd ? { acceptSteamCmdDownload: true } : {}),
				...(agreed.current.zip ? { acceptZipDownload: true } : {}),
				...(agreed.current.web ? { acceptWebDownload: true } : {}),
			};
			for (const p of selected.ports) {
				body[p.key] = Number(form[p.key]);
			}
			if (form.maxPlayers) body.maxPlayers = Number(form.maxPlayers);
			if (form.maxMemoryGB) body.maxMemoryGB = Number(form.maxMemoryGB);

			const data = await api.post("/api/servers", body);
			setStages(["queued"]);
			setJob({ jobId: data.jobId, status: "queued" });
		} catch (e) {
			setSubmitting(false);
			if (e.code === "steamcmd-not-installed") {
				setAskSteamCmd(true);
				return;
			}
			if (e.code === "zip-download-not-accepted") {
				setAskZip({ ...(selected.zipInstall ?? {}), ...(e.details ?? {}) });
				return;
			}
			if (e.code === "web-download-not-accepted") {
				setAskWeb({ ...(selected.webInstall ?? {}), ...(e.details ?? {}) });
				return;
			}
			setSubmitError(e.message);
		}
	};

	// Poll the creation job until it settles.
	React.useEffect(() => {
		if (!job?.jobId || job.status === "done" || job.status === "error") return undefined;
		let alive = true;
		const timer = setTimeout(async () => {
			try {
				const data = await api.get(`/api/servers/create/${job.jobId}`);
				if (!alive) return;
				// The server's answer does not repeat the job's id, and without it polling would stop after the first reply.
				setJob({ ...data, jobId: job.jobId });
				if (data.status) setStages((seen) => (seen.includes(data.status) ? seen : [...seen, data.status]));
				if (data.status === "done" || data.status === "error") {
					setSubmitting(false);
				}
			} catch {
				// transient — keep polling
			}
		}, POLL_MS);
		return () => {
			alive = false;
			clearTimeout(timer);
		};
	}, [job]);

	const ports = selected?.ports ?? [];
	// A port has to be a real one, and not the same number as another of this server's ports.
	const portProblems = React.useMemo(() => {
		const problems = {};
		const seen = new Map();
		for (const p of ports) {
			const raw = form[p.key];
			const n = Number(raw);
			if (raw === undefined) continue;
			if (!Number.isInteger(n) || n < 1 || n > 65535) problems[p.key] = "Use a whole number from 1 to 65535.";
			else if (seen.has(n)) problems[p.key] = `Already used by ${seen.get(n)}.`;
			else seen.set(n, p.label);
		}
		return problems;
	}, [ports, form]);

	if (userRole !== "admin") {
		return (
			<Box>
				<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack}>
					Back to Dashboard
				</Button>
				<EmptyState icon={<AccessIcon />} title="Only admins can create servers">
					Ask the person who runs this panel to set a server up for you, or to make you an admin.
				</EmptyState>
			</Box>
		);
	}

	const renderField = (f) => {
		const meta = selected.fieldMeta?.[f];
		const label = meta?.label || FIELD_LABELS[f] || f;

		if (f === "mapCode") {
			if (!selected.mapChoices) return null;
			return (
				<TextField key={f} fullWidth select label="Map" value={form.mapCode ?? ""} onChange={(e) => setField("mapCode", e.target.value)}>
					{selected.mapChoices.map((m) => (
						<MenuItem key={m.code} value={m.code}>
							{m.label}
						</MenuItem>
					))}
				</TextField>
			);
		}

		if (meta?.type === "checkbox") {
			return (
				<FormControlLabel
					key={f}
					sx={{ display: "flex", alignItems: "flex-start", m: 0, "& .MuiCheckbox-root": { pt: 0.5 } }}
					control={<Checkbox checked={!!form[f]} onChange={(e) => setField(f, e.target.checked)} />}
					label={label}
				/>
			);
		}

		if (meta?.type === "file") {
			return (
				<ModpackUploadField
					key={f}
					label={label}
					onUploaded={(summary) => {
						setField(f, summary?.uploadId || "");
						if (summary) {
							setField("mcVersion", summary.mcVersion);
							setField("modLoaderFamily", summary.modLoaderFamily);
							setField("modLoaderVersion", summary.modLoaderVersion);
						}
					}}
				/>
			);
		}

		if (f === "maxMemoryGB") {
			const current = String(form.maxMemoryGB ?? "");
			const options = current && !MEMORY_CHOICES.includes(current) ? [...MEMORY_CHOICES, current] : MEMORY_CHOICES;
			return (
				<TextField key={f} fullWidth select label={label} value={current} onChange={(e) => setField(f, e.target.value)} helperText="How much of this PC's memory the game may use. Leave some for Windows.">
					{options.map((gb) => (
						<MenuItem key={gb} value={gb}>
							{gb} GB
						</MenuItem>
					))}
				</TextField>
			);
		}

		const reroll = REROLL[f];
		return (
			<TextField
				key={f}
				fullWidth
				label={label}
				value={form[f] ?? ""}
				onChange={(e) => setField(f, e.target.value)}
				helperText={f === "sessionName" && selected.sessionIsAddress ? (suggested?.publicAddress ? (form.sessionAuto ? "Filled in from the public address (Settings → Network) and the game port; it follows the port until you type here." : "") : "Set the public address under Settings → Network and this fills in by itself.") : undefined}
				slotProps={
					reroll
						? {
								input: {
									endAdornment: (
										<InputAdornment position="end">
											<Tooltip title="Make a new random one">
												<IconButton size="small" edge="end" aria-label="New random value" onClick={() => setField(f, randomJoinPassword(reroll))}>
													<DiceIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</InputAdornment>
									),
								},
							}
						: undefined
				}
			/>
		);
	};

	const fieldList = (selected?.fields ?? []).filter((f) => f !== "mapCode" || selected.mapChoices);
	const basics = fieldList.filter((f) => BASIC_FIELDS.includes(f));
	const access = fieldList.filter((f) => ACCESS_FIELDS.includes(f));
	const extras = fieldList.filter((f) => !BASIC_FIELDS.includes(f) && !ACCESS_FIELDS.includes(f));
	const fieldStack = { display: "flex", flexDirection: "column", gap: 2 };

	const hasPortProblem = Object.keys(portProblems).length > 0;
	const canCreate = !submitting && !hasPortProblem && !findPortClash(selected?.implicitPorts, form) && Boolean(form.name?.trim()) && !(selected?.requiresEula && !form.eulaAccepted);

	const subtitle = !selected ? "Pick a game. The panel downloads it and sets it up for you." : job ? "Hang tight while it is set up." : "Fill in the details. The defaults are fine for most.";

	return (
		<Box>
			<Button size="small" startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 1 }}>
				Back to Dashboard
			</Button>

			<PageHeader icon={<CreateIcon />} title="Create a New Server" subtitle={subtitle} />

			{!selected ? (
				<GamePicker templates={templates} loadError={loadError} onRetry={() => setReloads((n) => n + 1)} onPick={pickTemplate} />
			) : job ? (
				<Box sx={{ maxWidth: 760 }}>
					<Hero template={selected} />
					<JobProgress
						job={job}
						stages={stages}
						onBack={onBack}
						onOpen={job.serverName ? () => go("config", job.serverName) : null}
						onTryAgain={() => {
							setJob(null);
							setStages([]);
							setSubmitting(false);
						}}
					/>
				</Box>
			) : !suggested ? (
				<Box sx={{ maxWidth: 760 }}>
					<Hero template={selected} />
					{submitError ? (
						<>
							<Alert severity="error" sx={{ mb: 2 }}>
								{submitError}
							</Alert>
							<Button variant="outlined" onClick={chooseAnother}>
								Choose a different game
							</Button>
						</>
					) : (
						<Box sx={{ textAlign: "center", py: 4 }}>
							<CircularProgress size={28} />
						</Box>
					)}
				</Box>
			) : (
				<Box sx={{ maxWidth: 760 }}>
					<Hero template={selected}>
						{selected.sharedInstall && suggested.sharedInstallDir && <Chip size="small" label="Adding to your existing cluster" color="info" />}
					</Hero>

					<SectionCard title="The basics" subtitle="What it is called, and where it shows up" icon={<ServerIcon />}>
						<Box sx={fieldStack}>
							<TextField fullWidth label="Server Name (shown on the dashboard)" value={form.name ?? ""} onChange={(e) => setField("name", e.target.value)} />
							{basics.map(renderField)}
							{!selected.sessionIsAddress && (
								<TextField
									fullWidth
									label="Session shown on the dashboard and in Discord"
									value={form.sessionLabel ?? ""}
									onChange={(e) => setField("sessionLabel", e.target.value)}
									placeholder={suggested?.publicAddress ? "" : "Automatic once the public address is set (Settings → Network)"}
									helperText={suggested?.publicAddress ? (form.labelAuto ? "Automatic: the public address and the game port, following the port. A label only; the name players see in the game is the one above. Type here to use your own text." : "Your own text. Clear it to go back to automatic.") : "A label only; it doesn't rename the server in the game."}
								/>
							)}
						</Box>
					</SectionCard>

					<SectionCard title="Players and access" subtitle="Who can join, and how many" icon={<AccessIcon />}>
						<Box sx={fieldStack}>
							{access.map(renderField)}
							<TextField fullWidth label="Max Players (optional)" type="number" value={form.maxPlayers ?? ""} onChange={(e) => setField("maxPlayers", e.target.value)} slotProps={{ htmlInput: { min: 1 } }} />
						</Box>
					</SectionCard>

					{extras.length > 0 && (
						<SectionCard title="Game settings" icon={<TuneIcon />}>
							<Box sx={fieldStack}>{extras.map(renderField)}</Box>
						</SectionCard>
					)}

					<SectionCard title="Network ports" subtitle="The panel picked free ones. Change them only if you need to." icon={<NetworkIcon />}>
						<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(170px, 1fr))" }, gap: 2 }}>
							{ports.map((p) => (
								<TextField
									key={p.key}
									fullWidth
									label={p.label}
									type="number"
									value={form[p.key] ?? ""}
									onChange={(e) => setField(p.key, e.target.value)}
									error={Boolean(portProblems[p.key])}
									helperText={portProblems[p.key]}
									slotProps={{ htmlInput: { min: 1, max: 65535 } }}
								/>
							))}
						</Box>
						<PortsToOpen game={form.port} query={form.queryPort} rcon={form.rconPort} implicit={selected.implicitPorts} gameName={selected.displayName} />
					</SectionCard>

					<SectionCard title="Where it is installed" icon={<FolderIcon />}>
						{suggested?.sharedInstallDir ? (
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								Adding to your existing install at {suggested.sharedInstallDir} — no new download.
							</Typography>
						) : (
							<FolderField
								label="Install to"
								value={form.installParent ?? ""}
								onChange={(v) => setField("installParent", v)}
								checkUrl="/api/settings/check-folder"
								checkBody={{ blankUsesConfigured: true }}
								blankMeans={suggested?.defaultInstallParent ?? "your default server folder"}
								helperText={`Blank uses ${suggested?.defaultInstallParent ?? "your default server folder"}. The server gets its own subfolder.`}
							/>
						)}
					</SectionCard>

					{submitError && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{submitError}
						</Alert>
					)}

					{/* Stays at the bottom of the screen, so the way forward is always in reach on a phone. */}
					<Box
						sx={{
							position: "sticky",
							bottom: 0,
							zIndex: 2,
							display: "flex",
							gap: 1.5,
							flexWrap: "wrap",
							justifyContent: "space-between",
							py: 1.5,
							mt: 1,
							borderTop: 1,
							borderColor: "divider",
							backgroundColor: (t) => t.custom.glass,
							backdropFilter: "blur(14px)",
						}}
					>
						<Button variant="outlined" onClick={chooseAnother} disabled={submitting}>
							Choose a different game
						</Button>
						<Button variant="contained" size="large" onClick={() => submit()} disabled={!canCreate} sx={flatWhenDisabled}>
							{submitting ? "Creating..." : "Create Server"}
						</Button>
					</Box>
				</Box>
			)}

			<Dialog open={askSteamCmd} onClose={() => setAskSteamCmd(false)}>
				<DialogTitle>Download SteamCMD?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Games are installed with SteamCMD, Valve's official tool. It isn't included with GodlyPanel, so it will be downloaded once from Valve and kept with your data. Already have a copy? Cancel and point Settings at it instead.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAskSteamCmd(false)}>Cancel</Button>
					<Button variant="contained" onClick={() => submit({ steamCmd: true })}>
						Download and continue
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(askZip)} onClose={() => setAskZip(null)}>
				<DialogTitle>Download {selected?.displayName ?? "the server"} from GitHub?</DialogTitle>
				<DialogContent>
					<DialogContentText component="div">
						<Typography variant="body2" sx={{ mb: 1.5 }}>
							This game is not installed through SteamCMD. The panel will download it from the project's releases on GitHub:
						</Typography>
						<Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
							<li>
								<b>What:</b> {askZip?.asset}
								{askZip?.tag ? ` (release ${askZip.tag})` : ""}
							</li>
							<li>
								<b>From:</b> github.com/{askZip?.repo}
							</li>
							<li>
								<b>Size:</b> {askZip?.sizeText ?? "not known yet (GitHub could not be reached just now)"}
							</li>
						</Box>
						<Typography variant="body2">
							It is fetched over https from GitHub only, checked against the SHA-256 checksum GitHub publishes for it (a download without a matching checksum is thrown away), and unpacked only into this server's own folder. Nothing is downloaded until you press the button.
						</Typography>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAskZip(null)}>Cancel</Button>
					<Button variant="contained" onClick={() => submit({ zip: true })}>
						Download and continue
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(askWeb)} onClose={() => setAskWeb(null)}>
				<DialogTitle>Download {selected?.displayName ?? "the server"} from its maker's website?</DialogTitle>
				<DialogContent>
					<DialogContentText component="div">
						<Typography variant="body2" sx={{ mb: 1.5 }}>
							This game is not installed through SteamCMD. The panel will download the server from the people who make it:
						</Typography>
						<Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
							<li>
								<b>What:</b> {askWeb?.label}
								{askWeb?.version ? ` (version ${askWeb.version})` : ""}
							</li>
							<li>
								<b>From:</b> {askWeb?.host ?? askWeb?.hosts?.[0]}
							</li>
							<li>
								<b>Size:</b> {askWeb?.sizeText ?? "not known yet (the site could not be reached just now)"}
							</li>
						</Box>
						<Typography variant="body2">
							{askWeb?.checksum
								? `It is fetched over https from that site only and checked against the ${askWeb.checksum} checksum the maker publishes (a download that doesn't match is thrown away).`
								: "It is fetched over https from that site only. The maker publishes no checksum for it, so the panel can't check it; it shows the SHA-256 it computed in the install log so you can compare it."}{" "}
							Nothing is downloaded until you press the button.
						</Typography>
						{askWeb?.extras?.length > 0 && (
							<>
								<Typography variant="body2" sx={{ mt: 1.5, mb: 1 }}>
									It also needs {askWeb.extras.length === 1 ? "one more file" : "more files"} that the download does not include, so the panel fetches {askWeb.extras.length === 1 ? "it" : "them"} for you:
								</Typography>
								<Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
									{askWeb.extras.map((x) => (
										<li key={x.label}>
											<b>{x.label}</b> ({x.sizeText}) from {x.host}
											{x.why ? `: ${x.why}` : ""}
										</li>
									))}
								</Box>
								<Typography variant="body2">
									Each is checked against a checksum built into the panel and must carry a valid {[...new Set(askWeb.extras.map((x) => x.signer))].join(" / ")} signature, or it is thrown away. Nothing is installed on this PC: the panel only takes the needed files out and puts them in the server's own folder. By continuing you accept the licence that comes with {askWeb.extras.length === 1 ? "that file" : "those files"}.
								</Typography>
							</>
						)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAskWeb(null)}>Cancel</Button>
					<Button variant="contained" onClick={() => submit({ web: true })}>
						Download and continue
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

/** What is happening while the server is made, and what to do when it is finished or fails. */
function JobProgress({ job, stages, onBack, onOpen, onTryAgain }) {
	const running = job.status !== "done" && job.status !== "error";
	const stageLabel = (s) => JOB_STAGES[s]?.label ?? s;
	const warnings = Array.isArray(job.warnings) ? job.warnings : [];
	const finished = stages.filter((s) => s !== job.status);
	return (
		<SectionCard title={running ? "Setting up your server" : job.status === "done" ? "All done" : "That didn't work"} icon={job.status === "done" ? <DoneIcon /> : <ServerIcon />} danger={job.status === "error"}>
			{running && (
				<Box role="status" aria-live="polite">
					<LinearProgress sx={{ height: 8, mb: 2 }} />
					<Typography variant="body1" sx={{ fontWeight: 600 }}>
						{stageLabel(job.status)}
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{JOB_STAGES[job.status]?.hint ?? `Status: ${job.status}`}
					</Typography>
					{finished.length > 0 && (
						<Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
							{finished.map((s) => (
								<Typography key={s} variant="body2" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 1 }}>
									<DoneIcon sx={{ fontSize: 16, color: "success.main" }} />
									{stageLabel(s)}
								</Typography>
							))}
						</Box>
					)}
					<Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
						You can leave this page; it carries on in the background and the server appears on the dashboard when it is ready.
					</Typography>
				</Box>
			)}
			{job.status === "done" && (
				<>
					<Alert severity="success">
						"{job.serverName}" is ready and live on the dashboard now.
					</Alert>
					{warnings.length > 0 && (
						<Alert severity="warning" sx={{ mt: 1 }}>
							{warnings.length} mod(s) couldn't be downloaded automatically (the author disabled third-party distribution) — add these manually: {warnings.map((w) => w?.projectID ?? words(w)).join(", ")}
						</Alert>
					)}
				</>
			)}
			{job.status === "error" && <Alert severity="error">Creation failed: {words(job.error) || "unknown error"}</Alert>}
			{!running && (
				<Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 2.5 }}>
					{job.status === "done" && onOpen && (
						<Button variant="contained" endIcon={<OpenIcon />} onClick={onOpen}>
							Open {job.serverName}
						</Button>
					)}
					{job.status === "error" && (
						<Button variant="contained" onClick={onTryAgain}>
							Go back to the form
						</Button>
					)}
					<Button variant={job.status === "error" || (job.status === "done" && onOpen) ? "outlined" : "contained"} onClick={onBack}>
						Back to Dashboard
					</Button>
				</Box>
			)}
		</SectionCard>
	);
}

export default CreateServerPage;
