import React from "react";
import { copyToClipboard } from "../utils/clipboard";
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
	Radio,
	RadioGroup,
	Switch,
	Step,
	StepLabel,
	Stepper,
	TextField,
	Typography,
} from "@mui/material";
import { api } from "../api/client";
import { t, useT, errorText } from "../i18n";
import { rich } from "../i18n/rich";
import CommunityGuide from "./CommunityGuide";
import InfoTip from "./InfoTip";
import TipRow from "./settings/TipRow";
import SectionCard from "./ui/SectionCard";

const chipFor = (state) =>
	({
		off: { color: "default", label: t("common.off") },
		starting: { color: "info", label: t("community.starting") },
		connected: { color: "success", label: t("common.on") },
		error: { color: "error", label: t("common.needsAttention") },
	})[state];

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
	// Re-renders this card when the language changes, so the t() text below switches with it.
	useT();
	const [status, setStatus] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [wizard, setWizard] = React.useState(false);
	const [copied, setCopied] = React.useState(false);
	const [showLog, setShowLog] = React.useState(false);
	const [guide, setGuide] = React.useState(false);
	const [confirmStaff, setConfirmStaff] = React.useState(false);

	const load = React.useCallback(() => api.get("/api/community").then(setStatus).catch((e) => setError(errorText(e))), []);
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
			setError(errorText(e));
		}
	};
	const setStaff = async (on) => {
		setError(null);
		setConfirmStaff(false);
		try {
			setStatus(await api.put("/api/community", { staffSignIn: on }));
		} catch (e) {
			setError(errorText(e));
		}
	};
	const copy = () =>
		copyToClipboard(status.publicUrl, (result) => {
			if (result === "Copied!") {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			} else setError(t("community.copyAddressFailed"));
		});

	return (
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("community.view.title")}
					<InfoTip id="card.communityView" />
				</Box>
			}
			actions={<Chip size="small" color={chipFor(state).color} label={chipFor(state).label} data-testid="community-view-state" />}
		>
			<TipRow info="community.staffSignIn" center sx={{ mb: 1.5 }}>
				<FormControlLabel
					sx={{ ml: 0, mr: 0 }}
					control={<Switch checked={status.staffSignIn} onChange={(e) => (e.target.checked ? setConfirmStaff(true) : setStaff(false))} inputProps={{ "data-testid": "community-staff-switch" }} />}
					label={t("community.staffSwitch")}
				/>
			</TipRow>
			{status.staffSignIn && (
				<Alert severity="warning" sx={{ mb: 1.5 }}>
					{t("community.staffWarning")}
				</Alert>
			)}

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
				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Button variant="contained" size="small" onClick={() => setWizard(true)}>
						{status.tokenSaved || status.hostname || status.existing ? t("community.changeSettings") : t("community.setUp")}
					</Button>
					<Button size="small" onClick={() => setGuide(true)}>
						{t("community.readGuide")}
					</Button>
				</Box>
			)}

			{state !== "off" && (
				<>
					{status.publicUrl ? (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
							<Typography variant="body1" sx={{ fontFamily: (t) => t.custom.mono, wordBreak: "break-all" }} data-testid="community-view-url">
								{status.publicUrl}
							</Typography>
							<Button size="small" onClick={copy}>
								{copied ? t("common.copied") : t("common.copy")}
							</Button>
						</Box>
					) : (
						<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
							<CircularProgress size={16} />
							<Typography variant="body2">{t("community.waitingAddress")}</Typography>
						</Box>
					)}
					{status.mode === "quick" && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
							{t("community.tempAddress")}
						</Typography>
					)}
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						<Button size="small" color="warning" variant="outlined" onClick={() => toggle(false)}>
							{t("community.turnOff")}
						</Button>
						<Button size="small" onClick={() => setGuide(true)}>
							{t("community.guideBtn")}
						</Button>
						<Button size="small" onClick={() => setShowLog((v) => !v)}>
							{showLog ? t("community.hideDetails") : t("community.details")}
						</Button>
					</Box>
					{showLog && (
						<Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: (t) => t.custom.hover, fontFamily: (t) => t.custom.mono, fontSize: 12, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
							{`${t("community.smallServer", { address: `127.0.0.1:${status.listener.port ?? status.port}` })}\n${t("community.tunnelStatus", { status: status.tunnel.status })}${status.tunnel.restarts ? t("community.restarts", { count: status.tunnel.restarts }) : ""}\n\n`}
							{status.tunnel.lines.join("\n")}
						</Box>
					)}
				</>
			)}

			<SetupDialog open={wizard} onClose={() => setWizard(false)} status={status} reload={load} onDone={() => setWizard(false)} onGuide={() => setGuide(true)} />
			<Dialog open={confirmStaff} onClose={() => setConfirmStaff(false)} maxWidth="xs" fullWidth>
				<DialogTitle>{t("community.staffConfirmTitle")}</DialogTitle>
				<DialogContent>
					<Typography variant="body2" sx={{ mb: 1 }}>
						{t("community.staffConfirmBody1")}
					</Typography>
					<Typography variant="body2">{t("community.staffConfirmBody2")}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmStaff(false)}>{t("common.cancel")}</Button>
					<Button color="warning" variant="contained" onClick={() => setStaff(true)}>
						{t("community.allowStaff")}
					</Button>
				</DialogActions>
			</Dialog>
			<CommunityGuide open={guide} onClose={() => setGuide(false)} port={status.port} />
		</SectionCard>
	);
}

// ---- the set-up dialog ----------------------------------------------------------------------------------

function SetupDialog({ open, onClose, status, reload, onDone, onGuide }) {
	useT();
	const [step, setStep] = React.useState(0);
	const [mode, setMode] = React.useState("quick");
	const [hostname, setHostname] = React.useState("");
	const [token, setToken] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState(null);

	const found = status.cloudflared.found;
	const detected = status.detectedTunnel?.credentialsFound ? status.detectedTunnel : null;
	const steps = [t("community.step.cloudflared"), t("community.step.address"), t("community.step.on")];

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
			setError(errorText(e));
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
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{t("community.setup.title")}</DialogTitle>
			<DialogContent>
				<Stepper activeStep={step} sx={{ mb: 2.5, mt: 0.5 }}>
					{steps.map((s) => (
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
							{rich(t("community.setup.usesCloudflared"))}
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{t("community.setup.downloadNote")}
						</Typography>
					</>
				)}

				{step === 1 && (
					<>
						<Typography variant="body2" sx={{ mb: 1 }}>
							{found ? (status.cloudflared.source === "panel" ? t("community.setup.readyPanel") : t("community.setup.readyPc")) : ""} {t("community.setup.howFind")}
						</Typography>
						<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								{t("community.setup.addressType")}
							</Typography>
							<InfoTip id="community.mode" />
						</Box>
						<RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
							<FormControlLabel
								value="quick"
								control={<Radio />}
								label={
									<span>
										{rich(t("community.setup.quick"), { strong: <b>{t("community.setup.tempLink")}</b> })}
									</span>
								}
							/>
							<FormControlLabel
								value="existing"
								disabled={!detected}
								control={<Radio />}
								label={
									<span>
										<b>{t("community.setup.ownTunnel")}</b>
										{detected ? t("community.setup.tunnelNamed", { tunnel: detected.tunnel }) : t("community.setup.noTunnel")}
									</span>
								}
							/>
							<FormControlLabel
								value="token"
								control={<Radio />}
								label={
									<span>
										<b>{t("community.setup.ownToken")}</b>
										{t("community.setup.tokenPaste")}
									</span>
								}
							/>
						</RadioGroup>

						{mode === "existing" && detected && (
							<Box sx={{ mt: 1.5 }}>
								<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
									{t("community.setup.existingInfo", { addressNote: detected.hostnames.length > 0 ? t("community.setup.addressAlready") : "" })}
								</Typography>
								<TipRow info="community.tunnelHostname">
									<TextField
										size="small"
										fullWidth
										label={t("community.setup.publicAddress")}
										placeholder={detected.hostnames[0] ?? "panel.example.com"}
										value={hostname}
										onChange={(e) => setHostname(e.target.value)}
										// Which names this tunnel already has is information about this PC, not an explanation of the box.
										helperText={detected.hostnames.length ? t("community.setup.tunnelAddresses", { list: detected.hostnames.join(", ") }) : undefined}
									/>
								</TipRow>
								{detected.hostnames[0] && !hostname && (
									<Button size="small" sx={{ mt: 0.5 }} onClick={() => setHostname(detected.hostnames[0])}>
										{t("community.setup.useAddress", { address: detected.hostnames[0] })}
									</Button>
								)}
							</Box>
						)}

						{mode === "token" && (
							<Box sx={{ mt: 1.5 }}>
								<Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
									{rich(t("community.setup.tokenIntro", { port: status.port }), {
										guide: (
											<Link href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/" target="_blank" rel="noreferrer">
												{t("community.setup.cfGuideLink")}
											</Link>
										),
									})}
								</Typography>
								<TipRow info="community.tunnelHostname" sx={{ mb: 1.5 }}>
									<TextField size="small" fullWidth label={t("community.setup.publicAddress")} placeholder="panel.example.com" value={hostname} onChange={(e) => setHostname(e.target.value)} />
								</TipRow>
								<TipRow info="community.tunnelToken">
									<TextField
										size="small"
										fullWidth
										type="password"
										autoComplete="off"
										label={status.tokenSaved ? t("community.setup.tokenSaved") : t("community.setup.tokenLabel")}
										value={token}
										onChange={(e) => setToken(e.target.value)}
									/>
								</TipRow>
							</Box>
						)}
					</>
				)}

				{step === 2 && (
					<Typography variant="body2">
						{mode === "quick" ? t("community.setup.startQuick") : t("community.setup.startAt", { address: hostname.replace(/^https?:\/\//, "") })} {t("community.setup.startWho")}
					</Typography>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onGuide} sx={{ mr: "auto" }}>
					{t("community.readGuide")}
				</Button>
				<Button onClick={onClose} disabled={busy}>
					{t("common.cancel")}
				</Button>
				{step === 0 && (
					<Button variant="contained" onClick={download} disabled={busy}>
						{busy ? t("community.setup.downloading") : t("community.setup.download")}
					</Button>
				)}
				{step === 1 && (
					<>
						{!found && <Button onClick={() => setStep(0)}>{t("community.back")}</Button>}
						<Button variant="contained" onClick={() => setStep(2)} disabled={!ready}>
							{t("community.next")}
						</Button>
					</>
				)}
				{step === 2 && (
					<>
						<Button onClick={() => setStep(1)} disabled={busy}>
							{t("community.back")}
						</Button>
						<Button variant="contained" onClick={turnOn} disabled={busy}>
							{busy ? t("community.setup.starting") : t("community.turnOn")}
						</Button>
					</>
				)}
			</DialogActions>
		</Dialog>
	);
}

export default CommunityViewCard;
