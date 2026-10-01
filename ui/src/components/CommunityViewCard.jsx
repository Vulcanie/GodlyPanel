import React from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Link,
	Paper,
	Radio,
	RadioGroup,
	Step,
	StepLabel,
	Stepper,
	TextField,
	Typography,
} from "@mui/material";
import { api } from "../api/client";

const CHIP = {
	off: { color: "default", label: "Off" },
	starting: { color: "info", label: "Starting…" },
	connected: { color: "success", label: "On" },
	error: { color: "error", label: "Needs attention" },
};

function stateOf(status) {
	if (!status.enabled) return "off";
	if (status.error || status.tunnel.status === "error") return "error";
	return status.tunnel.status === "connected" && status.publicUrl ? "connected" : "starting";
}

/**
 * The community view: a public address where people outside the house can sign in as a guest and look at the
 * servers. A short set-up, in the same spirit as the SteamCMD download: nothing is fetched until it is
 * agreed to, and everything is changed here rather than in files.
 */
function CommunityViewCard() {
	const [status, setStatus] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [wizard, setWizard] = React.useState(false);
	const [copied, setCopied] = React.useState(false);
	const [showLog, setShowLog] = React.useState(false);

	const load = React.useCallback(() => api.get("/api/community").then(setStatus).catch((e) => setError(e.message)), []);
	React.useEffect(() => {
		load();
		const timer = setInterval(load, 3000);
		return () => clearInterval(timer);
	}, [load]);

	if (!status) return null;
	const state = stateOf(status);

	const toggle = async (on) => {
		setError(null);
		try {
			setStatus(await api.post(`/api/community/${on ? "enable" : "disable"}`));
		} catch (e) {
			setError(e.message);
		}
	};
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(status.publicUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			setError("Couldn't copy to the clipboard. Select the address and copy it yourself.");
		}
	};

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
				<Typography variant="subtitle2">Community view (a public address)</Typography>
				<Chip size="small" color={CHIP[state].color} label={CHIP[state].label} data-testid="community-view-state" />
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				Gives people outside your home one web address where they sign in as a <b>guest</b> and look at your servers. It goes through a Cloudflare Tunnel, so nothing is opened on your router, and it is a separate, much smaller page: administrators and moderators can't sign in on it, and nothing can be started, stopped or changed through it. The panel itself stays on your network.
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
			{status.error && state === "error" && (
				<Alert severity="error" sx={{ mb: 1.5 }}>
					{status.error}
				</Alert>
			)}
			{status.warnings.map((w) => (
				<Alert key={w.code} severity="warning" sx={{ mb: 1.5 }}>
					{w.message}
				</Alert>
			))}

			{state === "off" && (
				<Button variant="contained" size="small" onClick={() => setWizard(true)}>
					{status.tokenSaved || status.hostname || status.existing ? "Change settings" : "Set up"}
				</Button>
			)}

			{state !== "off" && (
				<>
					{status.publicUrl ? (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
							<Typography variant="body1" sx={{ fontFamily: "monospace" }} data-testid="community-view-url">
								{status.publicUrl}
							</Typography>
							<Button size="small" onClick={copy}>
								{copied ? "Copied" : "Copy"}
							</Button>
						</Box>
					) : (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
							<CircularProgress size={16} />
							<Typography variant="body2">Waiting for Cloudflare to give out the address…</Typography>
						</Box>
					)}
					{status.mode === "quick" && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
							This is a temporary address: it changes every time the view starts (and when the panel restarts), and the page refreshes every few seconds instead of live. For a permanent address with live updates, set up your own tunnel.
						</Typography>
					)}
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
						Turn on the community code below so friends can make their own guest accounts, or create accounts under Users.
					</Typography>
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						<Button size="small" color="warning" variant="outlined" onClick={() => toggle(false)}>
							Turn off
						</Button>
						<Button size="small" onClick={() => setShowLog((v) => !v)}>
							{showLog ? "Hide details" : "Details"}
						</Button>
					</Box>
					{showLog && (
						<Box sx={{ mt: 1.5, p: 1, borderRadius: 1, bgcolor: "action.hover", fontFamily: "monospace", fontSize: 12, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
							{`Small server: 127.0.0.1:${status.listener.port ?? status.port}\nTunnel: ${status.tunnel.status}${status.tunnel.restarts ? `, restarted ${status.tunnel.restarts}×` : ""}\n\n`}
							{status.tunnel.lines.join("\n")}
						</Box>
					)}
				</>
			)}

			<SetupDialog open={wizard} onClose={() => setWizard(false)} status={status} reload={load} onDone={() => setWizard(false)} />
		</Paper>
	);
}

// ---- the set-up dialog ----------------------------------------------------------------------------------

const STEPS = ["Get cloudflared", "Choose an address", "Turn it on"];

function SetupDialog({ open, onClose, status, reload, onDone }) {
	const [step, setStep] = React.useState(0);
	const [mode, setMode] = React.useState("quick");
	const [hostname, setHostname] = React.useState("");
	const [token, setToken] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	const found = status.cloudflared.found;
	const detected = status.detectedTunnel?.credentialsFound ? status.detectedTunnel : null;

	React.useEffect(() => {
		if (!open) return;
		setError(null);
		setStep(status.cloudflared.found ? 1 : 0);
		setMode(status.mode ?? "quick");
		setHostname(status.hostname ?? "");
		setToken("");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const download = async () => {
		setBusy(true);
		setError(null);
		try {
			await api.post("/api/community/cloudflared/install", { acceptDownload: true });
			await reload();
			setStep(1);
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	const needsName = mode !== "quick";
	const ready = mode === "quick" || (mode === "existing" && detected && hostname) || (mode === "token" && hostname && (token || status.tokenSaved));

	const turnOn = async () => {
		setBusy(true);
		setError(null);
		try {
			const patch = { mode, hostname: needsName ? hostname : status.hostname };
			if (mode === "existing") patch.existing = { tunnel: detected.tunnel };
			if (mode === "token" && token) patch.token = token;
			await api.put("/api/community", patch);
			await api.post("/api/community/enable");
			await reload();
			onDone();
		} catch (e) {
			setError(e.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Set up the community view</DialogTitle>
			<DialogContent>
				<Stepper activeStep={step} sx={{ mb: 2.5, mt: 0.5 }}>
					{STEPS.map((s) => (
						<Step key={s}>
							<StepLabel>{s}</StepLabel>
						</Step>
					))}
				</Stepper>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{step === 0 && (
					<>
						<Typography variant="body2" sx={{ mb: 1.5 }}>
							This uses <b>cloudflared</b>, Cloudflare's own tunnel program. It isn't included with GodlyPanel.
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							It will be downloaded once from Cloudflare's official release on GitHub, checked against the checksum GitHub publishes for it, and saved inside GodlyPanel's own data folder. It only runs while the community view is on, and nothing is installed on Windows.
						</Typography>
					</>
				)}

				{step === 1 && (
					<>
						<Typography variant="body2" sx={{ mb: 1 }}>
							{found ? `cloudflared is ready (${status.cloudflared.source === "panel" ? "downloaded by GodlyPanel" : "found on this PC"}).` : ""} How should people find the page?
						</Typography>
						<RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
							<FormControlLabel
								value="quick"
								control={<Radio />}
								label={
									<span>
										<b>A temporary link</b>, no Cloudflare account needed. A random address that changes each time it starts. Good for trying it out.
									</span>
								}
							/>
							<FormControlLabel
								value="existing"
								disabled={!detected}
								control={<Radio />}
								label={
									<span>
										<b>My own address, using the tunnel already on this PC</b>
										{detected ? ` ("${detected.tunnel}")` : ": none found on this PC"}
									</span>
								}
							/>
							<FormControlLabel
								value="token"
								control={<Radio />}
								label={
									<span>
										<b>My own address, with a tunnel from the Cloudflare dashboard</b> (a token you paste in)
									</span>
								}
							/>
						</RadioGroup>

						{mode === "existing" && detected && (
							<Box sx={{ mt: 1.5 }}>
								<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
									The panel runs this tunnel with its own settings file pointing at the community view, and doesn't change yours. {detected.hostnames.length > 0 ? "Its address already points at Cloudflare, so you only choose which one to use." : ""} If another program on this PC is already running the same tunnel, stop it first, or visitors will be split between the two.
								</Typography>
								<TextField
									size="small"
									fullWidth
									label="Public address"
									placeholder={detected.hostnames[0] ?? "panel.example.com"}
									value={hostname}
									onChange={(e) => setHostname(e.target.value)}
									helperText={detected.hostnames.length ? `Addresses on this tunnel: ${detected.hostnames.join(", ")}` : "A name already routed to this tunnel in Cloudflare."}
								/>
								{detected.hostnames[0] && !hostname && (
									<Button size="small" sx={{ mt: 0.5 }} onClick={() => setHostname(detected.hostnames[0])}>
										Use {detected.hostnames[0]}
									</Button>
								)}
							</Box>
						)}

						{mode === "token" && (
							<Box sx={{ mt: 1.5 }}>
								<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
									In the Cloudflare dashboard open <i>Zero Trust → Networks → Tunnels</i>, create a tunnel (type <i>Cloudflared</i>), and copy its token. Under <i>Public Hostname</i> add your address with the service <code>HTTP</code> and URL <code>localhost:{status.port}</code>. Then paste the token and the address here.{" "}
									<Link href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/" target="_blank" rel="noreferrer">
										Cloudflare's guide
									</Link>
								</Typography>
								<TextField size="small" fullWidth label="Public address" placeholder="panel.example.com" value={hostname} onChange={(e) => setHostname(e.target.value)} sx={{ mb: 1.5 }} />
								<TextField
									size="small"
									fullWidth
									type="password"
									autoComplete="off"
									label={status.tokenSaved ? "Tunnel token (saved; paste to replace)" : "Tunnel token"}
									value={token}
									onChange={(e) => setToken(e.target.value)}
								/>
							</Box>
						)}
					</>
				)}

				{step === 2 && (
					<Typography variant="body2">
						{mode === "quick"
							? "The community view will start now and Cloudflare will give out a temporary address."
							: `The community view will start now and answer at ${hostname.replace(/^https?:\/\//, "")}.`}{" "}
						People who open it can sign in as guests (or join with the community code) and look at the dashboard. You can turn it off at any time.
					</Typography>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				{step === 0 && (
					<Button variant="contained" onClick={download} disabled={busy}>
						{busy ? "Downloading…" : "Download cloudflared"}
					</Button>
				)}
				{step === 1 && (
					<>
						{!found && <Button onClick={() => setStep(0)}>Back</Button>}
						<Button variant="contained" onClick={() => setStep(2)} disabled={!ready}>
							Next
						</Button>
					</>
				)}
				{step === 2 && (
					<>
						<Button onClick={() => setStep(1)} disabled={busy}>
							Back
						</Button>
						<Button variant="contained" onClick={turnOn} disabled={busy}>
							{busy ? "Starting…" : "Turn it on"}
						</Button>
					</>
				)}
			</DialogActions>
		</Dialog>
	);
}

export default CommunityViewCard;
