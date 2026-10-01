import React from "react";
import { Alert, Box, Button, Chip, FormControlLabel, MenuItem, Paper, Switch, TextField, Typography } from "@mui/material";
import { api } from "../api/client";

const EXPIRY = [
	{ value: "keep", label: "Keep the current setting" },
	{ value: "none", label: "Never expires" },
	{ value: "1", label: "Expires in 1 day" },
	{ value: "7", label: "Expires in 7 days" },
	{ value: "30", label: "Expires in 30 days" },
];

const when = (ms) => new Date(ms).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

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
 */
function CommunityAccessCard() {
	const [invite, setInvite] = React.useState(null);
	const [access, setAccess] = React.useState(null);
	const [error, setError] = React.useState(null);
	const [copied, setCopied] = React.useState("");
	const [expiry, setExpiry] = React.useState("keep");
	const [limit, setLimit] = React.useState("");

	const load = React.useCallback(() => {
		api.get("/api/users/invite").then((i) => {
			setInvite(i);
			setLimit(i.maxJoins ? String(i.maxJoins) : "");
		}).catch((e) => setError(e.message));
		api.get("/api/settings/access").then(setAccess).catch(() => {});
	}, []);
	React.useEffect(load, [load]);

	if (!invite) return null;

	const change = async (patch) => {
		setError(null);
		try {
			setInvite(await api.put("/api/users/invite", patch));
			if (patch.maxJoins !== undefined) setLimit(patch.maxJoins ? String(patch.maxJoins) : "");
		} catch (e) {
			setError(e.message);
		}
	};

	const copy = async (what, text) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(what);
			setTimeout(() => setCopied(""), 2000);
		} catch {
			setError("Couldn't copy to the clipboard. Select the text and copy it yourself.");
		}
	};

	const url = tailscaleUrl(access);
	const message = [
		"Here's how to see our servers:",
		"1. Install Tailscale (tailscale.com/download) and accept the share I sent you.",
		`2. Open ${url ?? "the address I sent you"} in a browser.`,
		`3. Choose "I have a community code" and use ${invite.code}.`,
		"Pick any username and password you like. You'll be able to look at the servers, not change them.",
	].join("\n");

	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
				<Typography variant="subtitle2">Community access</Typography>
				{access?.tailscale &&
					(!access.tailscale.installed ? (
						<Chip size="small" label="Tailscale isn't installed on this PC" />
					) : access.tailscale.running ? (
						<Chip size="small" color="success" label={`Tailscale connected${access.tailscale.shortName ? ` as ${access.tailscale.shortName}` : ""}`} />
					) : (
						<Chip size="small" color="warning" label={access.tailscale.state === "NeedsLogin" ? "Tailscale needs signing in" : "Tailscale isn't connected"} />
					))}
			</Box>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
				Friends and community members can make their own <b>guest</b> account with a code, so you don't have to invent a password for each. Guests can look at the dashboard (status, players, ports) and cannot change anything. They still need a way to reach the panel: see the Tailscale steps above.
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 1.5 }}>
					{error}
				</Alert>
			)}

			<FormControlLabel
				control={<Switch checked={invite.enabled} onChange={(e) => change({ enabled: e.target.checked })} />}
				label={invite.enabled ? "Anyone with the code can make a guest account" : "Community code is off"}
			/>

			{invite.enabled && (
				<>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", my: 1.5 }}>
						<Typography variant="h5" sx={{ fontFamily: "monospace", letterSpacing: 2 }} data-testid="community-code">
							{invite.code}
						</Typography>
						<Button size="small" onClick={() => copy("code", invite.code)}>
							{copied === "code" ? "Copied" : "Copy"}
						</Button>
						<Button size="small" color="warning" onClick={() => change({ regenerate: true })}>
							New code
						</Button>
					</Box>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
						{invite.joins} {invite.joins === 1 ? "person has" : "people have"} joined with this code
						{invite.expiresAt ? ` · expires ${when(invite.expiresAt)}` : " · never expires"}
						{invite.maxJoins ? ` · up to ${invite.maxJoins} people` : ""}.
						{" "}A new code stops the old one working; accounts already made stay (remove them under Users).
					</Typography>
					{invite.closedBecause === "expired" && <Alert severity="warning" sx={{ mb: 1.5 }}>This code has expired. Choose a new expiry or make a new code.</Alert>}
					{invite.closedBecause === "full" && <Alert severity="warning" sx={{ mb: 1.5 }}>The sign-up limit has been reached. Raise it or make a new code.</Alert>}

					<Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
						<TextField select size="small" label="Expiry" value={expiry} sx={{ minWidth: 230 }} onChange={(e) => {
							setExpiry(e.target.value);
							if (e.target.value === "keep") return;
							change({ expiresInDays: e.target.value === "none" ? null : Number(e.target.value) });
						}}>
							{EXPIRY.map((o) => (
								<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
							))}
						</TextField>
						<TextField
							size="small"
							label="Most people (blank = no limit)"
							type="number"
							value={limit}
							sx={{ width: 230 }}
							inputProps={{ min: 1, max: 1000 }}
							onChange={(e) => setLimit(e.target.value)}
							onBlur={() => change({ maxJoins: limit === "" ? null : Number(limit) })}
						/>
					</Box>

					<Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
						Message to send them
					</Typography>
					<TextField multiline fullWidth size="small" value={message} InputProps={{ readOnly: true }} sx={{ mb: 1 }} />
					<Button size="small" variant="outlined" onClick={() => copy("message", message)}>
						{copied === "message" ? "Copied" : "Copy message"}
					</Button>
					{!url && (
						<Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>
							The address shows up here once Tailscale is installed and connected on this PC.
						</Typography>
					)}
				</>
			)}
		</Paper>
	);
}

export default CommunityAccessCard;
