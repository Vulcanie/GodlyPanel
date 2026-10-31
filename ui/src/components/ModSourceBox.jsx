import React from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { api } from "../api/client";
import { installErrorAction } from "../utils/modSource";

/**
 * The paste box: a mod's link or name goes in, and the server installs it with anything it needs. The decisions (what an error means,
 * what to ask for next) live in utils/modSource.js; this box only draws them and keeps the typed text.
 */
function ModSourceBox({ base, locked, onResult, onError }) {
	const [input, setInput] = React.useState("");
	const [busy, setBusy] = React.useState(false);
	// Set when the server says the address is not a known site. The person has to tick the box before it is sent again.
	const [needsTrust, setNeedsTrust] = React.useState(false);
	const [trusted, setTrusted] = React.useState(false);
	// The files a source offered when more than one fits. Install stays off until one is picked.
	const [choice, setChoice] = React.useState(null);
	const [assetName, setAssetName] = React.useState("");

	const clearAnswers = () => {
		setNeedsTrust(false);
		setTrusted(false);
		setChoice(null);
		setAssetName("");
	};

	// A new address is a new question, so an old tick or pick must not carry over to it.
	const changeText = (value) => {
		setInput(value);
		clearAnswers();
	};

	const blocked = Boolean(locked || busy || !input.trim() || (choice && !assetName) || (needsTrust && !trusted));

	const submit = async () => {
		if (blocked) return;
		setBusy(true);
		try {
			const result = await api.post(`${base}/install`, {
				input: input.trim(),
				trusted,
				assetName: assetName || undefined,
			});
			setInput("");
			clearAnswers();
			onResult(result);
		} catch (err) {
			const action = installErrorAction(err);
			setNeedsTrust(action.kind === "trust");
			setChoice(action.kind === "choose" ? { message: action.message, assets: action.assets } : null);
			setAssetName("");
			if (action.kind === "message") onError(action.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Box>
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
				<TextField
					size="small"
					label="Mod address or name"
					value={input}
					onChange={(e) => changeText(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && !locked && submit()}
					sx={{ minWidth: 280 }}
					disabled={locked}
				/>
				<Button variant="outlined" disabled={blocked} onClick={submit}>
					{busy ? "Working…" : "Install"}
				</Button>
				{busy && <CircularProgress size={18} />}
			</Box>
			<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
				Paste a mod's link or name. Anything it needs is installed too.
			</Typography>

			{needsTrust && (
				<Alert severity="warning" sx={{ mt: 1.5 }}>
					This address isn't one of the known mod sites. Only install from an address you trust.
					<FormControlLabel control={<Checkbox checked={trusted} onChange={(e) => setTrusted(e.target.checked)} />} label="I trust this address" sx={{ display: "block" }} />
				</Alert>
			)}

			{choice && (
				<Alert severity="info" sx={{ mt: 1.5 }}>
					{choice.message}
					<RadioGroup value={assetName} onChange={(e) => setAssetName(e.target.value)}>
						{choice.assets.map((name) => (
							<FormControlLabel key={name} value={name} control={<Radio size="small" />} label={name} />
						))}
					</RadioGroup>
				</Alert>
			)}
		</Box>
	);
}

export default ModSourceBox;
