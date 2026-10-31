import React from "react";
import { copyToClipboard } from "../utils/clipboard";
import { Alert, Box, Button, Chip, FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { t, tn, useT, formatDate, errorText } from "../i18n";
import InfoTip from "./InfoTip";
import TipRow from "./settings/TipRow";
import SectionCard from "./ui/SectionCard";

/** The panel's address for someone on the owner's Tailscale network, or a placeholder until Tailscale is connected. */
function tailscaleUrl(access) {
	const ts = access?.tailscale;
	if (!ts?.running) return null;
	const host = ts.dnsName || ts.ips?.[0];
	return host ? `http://${host}:${access.port}/` : null;
}

/**
 * Letting the community in: a code people use to make their own guest account, and what to send them.
 * Reaching the panel at all is the network's job (see "Opening the panel from another device").
 * What each box does is behind its (i).
 */
function CommunityAccessCard() {
	// Re-renders this card when the language changes, so the t() text below switches with it.
	useT();
	const [invite, setInvite] = React.useState(null);
	const [access, setAccess] = React.useState(null);
	const [view, setView] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [copied, setCopied] = React.useState("");
	const [expiry, setExpiry] = React.useState("keep");
	const [limit, setLimit] = React.useState("");

	const load = React.useCallback(() => {
		api.get("/api/users/invite").then((i) => {
			setInvite(i);
			setLimit(i.maxJoins ? String(i.maxJoins) : "");
		}).catch((e) => setError(errorText(e)));
		api.get("/api/settings/access").then(setAccess).catch(() => {});
		api.get("/api/community").then(setView).catch(() => {});
	}, []);
	React.useEffect(() => {
		load();
		// The public address appears and goes while the community view is switched on and off just above.
		const timer = setInterval(() => api.get("/api/community").then(setView).catch(() => {}), 4000);
		return () => clearInterval(timer);
	}, [load]);

	if (!invite) return null;

	const change = async (patch) => {
		setError(null);
		try {
			setInvite(await api.put("/api/users/invite", patch));
			if (patch.maxJoins !== undefined) setLimit(patch.maxJoins ? String(patch.maxJoins) : "");
		} catch (e) {
			setError(errorText(e));
		}
	};

	// Not navigator.clipboard: the panel is usually opened over plain http, where the browser switches that off.
	const copy = (what, text) =>
		copyToClipboard(text, (result) => {
			if (result === "Copied!") {
				setCopied(what);
				setTimeout(() => setCopied(""), 2000);
			} else setError(t("community.copyFailed"));
		});

	const expiryOptions = [
		{ value: "keep", label: t("community.expiryKeep") },
		{ value: "none", label: t("community.expiryNever") },
		{ value: "1", label: tn("community.expiresIn", 1) },
		{ value: "7", label: tn("community.expiresIn", 7) },
		{ value: "30", label: tn("community.expiresIn", 30) },
	];

	const url = tailscaleUrl(access);
	// The public address (no software to install) when the community view is on, otherwise Tailscale.
	const publicUrl = view?.enabled ? view.publicUrl : null;
	const closing = t("community.msg.closing");
	const message = (publicUrl
		? [t("community.msg.intro"), t("community.msg.openPublic", { address: publicUrl }), t("community.msg.codePublic", { code: invite.code }), closing]
		: [
				t("community.msg.intro"),
				t("community.msg.install"),
				t("community.msg.openTailscale", { address: url ?? t("community.msg.addressSentYou") }),
				t("community.msg.codeTailscale", { code: invite.code }),
				closing,
			]
	).join("\n");

	return (
		<SectionCard
			title={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
					{t("community.access.title")}
					<InfoTip id="card.communityAccess" />
				</Box>
			}
			actions={
				access?.tailscale &&
				(!access.tailscale.installed ? (
					<Chip size="small" label={t("community.tsNotInstalled")} />
				) : access.tailscale.running ? (
					<Chip size="small" color="success" label={access.tailscale.shortName ? t("community.tsConnectedAs", { name: access.tailscale.shortName }) : t("community.tsConnected")} />
				) : (
					<Chip size="small" color="warning" label={access.tailscale.state === "NeedsLogin" ? t("community.tsNeedsLogin") : t("community.tsNotConnected")} />
				))
			}
		>
			{error && (
				<Alert severity="error" sx={{ mb: 1.5 }}>
					{error}
				</Alert>
			)}

			<TipRow info="community.codeEnabled" center>
				<FormControlLabel
					sx={{ ml: 0, mr: 0 }}
					control={<Switch checked={invite.enabled} onChange={(e) => change({ enabled: e.target.checked })} />}
					label={invite.enabled ? t("community.codeOn") : t("community.codeOff")}
				/>
			</TipRow>

			{invite.enabled && (
				<>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", my: 1.5 }}>
						<Typography variant="h5" sx={{ fontFamily: (t) => t.custom.mono, letterSpacing: 2 }} data-testid="community-code">
							{invite.code}
						</Typography>
						<Button size="small" onClick={() => copy("code", invite.code)}>
							{copied === "code" ? t("common.copied") : t("common.copy")}
						</Button>
						<Button size="small" color="warning" onClick={() => change({ regenerate: true })}>
							{t("community.newCode")}
						</Button>
					</Box>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
						{tn("community.joined", invite.joins)}
						{invite.expiresAt ? t("community.expires", { when: formatDate(invite.expiresAt) }) : t("community.neverExpires")}
						{invite.maxJoins ? tn("community.upTo", invite.maxJoins) : ""}.
					</Typography>
					{invite.closedBecause === "expired" && <Alert severity="warning" sx={{ mb: 1.5 }}>{t("community.closedExpired")}</Alert>}
					{invite.closedBecause === "full" && <Alert severity="warning" sx={{ mb: 1.5 }}>{t("community.closedFull")}</Alert>}

					<Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2, mb: 2.5 }}>
						<TipRow info="community.codeExpiry">
							<TextField select fullWidth size="small" label={t("community.expiry")} value={expiry} onChange={(e) => {
								setExpiry(e.target.value);
								if (e.target.value === "keep") return;
								change({ expiresInDays: e.target.value === "none" ? null : Number(e.target.value) });
							}}>
								{expiryOptions.map((o) => (
									<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
								))}
							</TextField>
						</TipRow>
						<TipRow info="community.codeMaxUses">
							<TextField
								fullWidth
								size="small"
								label={t("community.mostPeople")}
								type="number"
								value={limit}
								inputProps={{ min: 1, max: 1000 }}
								onChange={(e) => setLimit(e.target.value)}
								onBlur={() => change({ maxJoins: limit === "" ? null : Number(limit) })}
							/>
						</TipRow>
					</Box>

					<Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{t("community.messageToSend")}
						</Typography>
						<InfoTip id="community.codeMessage" />
					</Box>
					<TextField multiline fullWidth size="small" value={message} InputProps={{ readOnly: true }} inputProps={{ "aria-label": t("community.messageToSend") }} sx={{ mb: 1 }} />
					<Button size="small" variant="outlined" onClick={() => copy("message", message)}>
						{copied === "message" ? t("common.copied") : t("community.copyMessage")}
					</Button>
					{!url && !publicUrl && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>
							{t("community.addressHint")}
						</Typography>
					)}
				</>
			)}
		</SectionCard>
	);
}

export default CommunityAccessCard;
