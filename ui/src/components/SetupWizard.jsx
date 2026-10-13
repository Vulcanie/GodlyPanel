import React from "react";
import { Alert, Box, Button, FormControlLabel, IconButton, InputAdornment, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Folder as FolderIcon, Visibility as ShowIcon, VisibilityOff as HideIcon } from "@mui/icons-material";
import FolderField from "./FolderField";
import AuthShell, { Brand } from "./AuthShell";
import { formatBytes } from "../utils/format";
import { api } from "../api/client";
import { useSession } from "../SessionContext";

/** "Step 1 of 2" as two bars that fill with the brand gradient. */
function Steps({ step, total = 2 }) {
	return (
		<Box sx={{ mb: 3 }} role="group" aria-label={`Step ${step} of ${total}`}>
			<Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
				{Array.from({ length: total }, (_, i) => (
					<Box key={i} sx={{ flex: 1, height: 4, borderRadius: "2px", background: (t) => (i < step ? t.custom.gradient : t.palette.divider), transition: "background .3s" }} />
				))}
			</Box>
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				Step {step} of {total}
			</Typography>
		</Box>
	);
}

/** One choice for where the servers live: a whole clickable row, so it is easy to hit on a phone. */
function Choice({ value, selected, title, children }) {
	return (
		<Box
			sx={{
				border: 1,
				borderColor: selected ? "primary.main" : "divider",
				borderRadius: "12px",
				px: 1.5,
				py: 0.75,
				mb: 1.25,
				backgroundColor: (t) => (selected ? alpha(t.palette.primary.main, 0.08) : "transparent"),
				transition: "border-color .15s, background-color .15s",
			}}
		>
			<FormControlLabel
				value={value}
				control={<Radio size="small" />}
				sx={{ m: 0, width: "100%", alignItems: "flex-start", "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0, pt: 0.6 } }}
				label={
					<Box>
						<Typography variant="body2" sx={{ fontWeight: 600 }}>
							{title}
						</Typography>
						{children}
					</Box>
				}
			/>
		</Box>
	);
}

// Shown once, on a brand-new install. The server only accepts this from the
// machine itself, so nobody on the network can claim the admin account first.
function SetupWizard() {
	const { completeSetup } = useSession();
	// Step 1 is where game servers will live; step 2 is the account.
	const [step, setStep] = React.useState(1);
	const [defaults, setDefaults] = React.useState(null);
	const [where, setWhere] = React.useState("default"); // default | custom
	const [customPath, setCustomPath] = React.useState("");
	const [customOk, setCustomOk] = React.useState(true);

	React.useEffect(() => {
		api.get("/api/setup/folder-defaults").then(setDefaults, () => setDefaults(null));
	}, []);

	const serversRoot = where === "custom" ? customPath.trim() : "";
	const folderReady = where === "default" ? defaults?.ok !== false : customPath.trim() !== "" && customOk;
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [confirm, setConfirm] = React.useState("");
	const [reveal, setReveal] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const mismatch = confirm.length > 0 && password !== confirm;
	const tooShort = password.length > 0 && password.length < 8;
	const canSubmit = username.trim().length >= 3 && password.length >= 8 && password === confirm && !busy;

	const submit = async () => {
		if (!canSubmit) return;
		setBusy(true);
		setError(null);
		try {
			await completeSetup(username.trim(), password, serversRoot);
		} catch (e) {
			setError(e?.message || "Something went wrong. Please try again.");
			setBusy(false);
		}
	};

	if (step === 1) {
		const errors = Array.isArray(defaults?.errors) ? defaults.errors : [];
		return (
			<AuthShell width={540}>
				<Brand compact />
				<Steps step={1} />
				<Typography variant="h5" component="h1" gutterBottom>
					Welcome to GodlyPanel
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
					First, where should your game servers be stored? Games are large — often tens of gigabytes each — so it's worth a moment's thought. You can change this later in Settings, and choose a different place for any individual server when you create it.
				</Typography>

				<RadioGroup value={where} onChange={(e) => setWhere(e.target.value)}>
					<Choice value="default" selected={where === "default"} title="Inside the app folder (recommended to start)">
						<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all", display: "block" }}>
							{defaults ? `${defaults.resolved} — ${formatBytes(defaults.freeBytes)} free` : "Checking..."}
						</Typography>
					</Choice>
					<Choice value="custom" selected={where === "custom"} title="Somewhere else, like a bigger drive" />
				</RadioGroup>

				{where === "default" && defaults?.ok === false && (
					<Alert severity="error" sx={{ mt: 1 }}>
						{errors[0] ?? "That folder can't be used."} Choose another location.
					</Alert>
				)}
				{where === "default" && (
					<Typography variant="caption" sx={{ display: "flex", gap: 0.75, alignItems: "flex-start", mt: 1, color: "text.secondary" }}>
						<FolderIcon sx={{ fontSize: 16, mt: "1px" }} />
						Keeping everything in one folder means you can move or back up the whole app together. It will use whichever drive the app is on.
					</Typography>
				)}

				{where === "custom" && (
					<Box sx={{ mt: 1 }}>
						<FolderField
							label="Server folder"
							value={customPath}
							onChange={setCustomPath}
							checkUrl="/api/setup/check-folder"
							helperText="A full path, like D:\GameServers. It's created if it doesn't exist."
							onCheck={(r) => setCustomOk(r.ok)}
						/>
					</Box>
				)}

				<Button fullWidth size="large" variant="contained" sx={{ mt: 3, py: 1.2 }} disabled={!folderReady} onClick={() => setStep(2)}>
					Continue
				</Button>
			</AuthShell>
		);
	}

	return (
		<AuthShell width={460}>
			<Brand compact />
			<Steps step={2} />
			<Typography variant="h5" component="h1" gutterBottom>
				Create your account
			</Typography>
			<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
				Create your administrator account. You'll use this to manage your servers, and you can invite others afterwards.
			</Typography>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<TextField
				fullWidth
				label="Username"
				autoFocus
				autoComplete="username"
				sx={{ mb: 2 }}
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				helperText="3-32 characters. Letters, numbers, dot, underscore or hyphen."
			/>
			<TextField
				fullWidth
				type={reveal ? "text" : "password"}
				label="Password"
				autoComplete="new-password"
				sx={{ mb: 2 }}
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				error={tooShort}
				helperText={tooShort ? "At least 8 characters." : " "}
				slotProps={{
					input: {
						endAdornment: (
							<InputAdornment position="end">
								<IconButton size="small" edge="end" aria-label={reveal ? "Hide what I typed" : "Show what I typed"} onClick={() => setReveal((v) => !v)} onMouseDown={(e) => e.preventDefault()}>
									{reveal ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
								</IconButton>
							</InputAdornment>
						),
					},
				}}
			/>
			<TextField
				fullWidth
				type={reveal ? "text" : "password"}
				label="Confirm password"
				autoComplete="new-password"
				sx={{ mb: 2 }}
				value={confirm}
				onChange={(e) => setConfirm(e.target.value)}
				onKeyDown={(e) => e.key === "Enter" && submit()}
				error={mismatch}
				helperText={mismatch ? "Passwords don't match." : " "}
			/>

			<Button fullWidth size="large" variant="contained" disabled={!canSubmit} onClick={submit} sx={{ py: 1.2 }}>
				{busy ? "Creating..." : "Create account"}
			</Button>
			<Button fullWidth sx={{ mt: 1 }} disabled={busy} onClick={() => setStep(1)}>
				Back
			</Button>
		</AuthShell>
	);
}

export default SetupWizard;
