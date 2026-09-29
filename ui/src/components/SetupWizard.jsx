import React from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	Alert,
	RadioGroup,
	Radio,
	FormControlLabel,
} from "@mui/material";
import FolderField from "./FolderField";
import { formatBytes } from "../utils/format";
import { api } from "../api/client";
import { useSession } from "../SessionContext";

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
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);

	const mismatch = confirm.length > 0 && password !== confirm;
	const tooShort = password.length > 0 && password.length < 8;
	const canSubmit =
		username.trim().length >= 3 && password.length >= 8 && password === confirm && !busy;

	const submit = async () => {
		if (!canSubmit) return;
		setBusy(true);
		setError(null);
		try {
			await completeSetup(username.trim(), password, serversRoot);
		} catch (e) {
			setError(e.message);
			setBusy(false);
		}
	};

	if (step === 1) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
				<Paper sx={{ p: 4, maxWidth: 520, width: "100%" }}>
					<Typography variant="h5" gutterBottom>
						Welcome to GodlyPanel
					</Typography>
					<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
						First, where should your game servers be stored? Games are large — often tens of
						gigabytes each — so it's worth a moment's thought. You can change this later in
						Settings, and choose a different place for any individual server when you
						create it.
					</Typography>

					<RadioGroup value={where} onChange={(e) => setWhere(e.target.value)}>
						<FormControlLabel
							value="default"
							control={<Radio />}
							label={
								<Box>
									<Typography variant="body2">Inside the app folder (recommended to start)</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary", wordBreak: "break-all" }}>
										{defaults
											? `${defaults.resolved} — ${formatBytes(defaults.freeBytes)} free`
											: "Checking..."}
									</Typography>
								</Box>
							}
						/>
						<FormControlLabel
							value="custom"
							control={<Radio />}
							sx={{ mt: 1 }}
							label={<Typography variant="body2">Somewhere else, like a bigger drive</Typography>}
						/>
					</RadioGroup>

					{where === "default" && defaults?.ok === false && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{defaults.errors[0]} Choose another location.
						</Alert>
					)}
					{where === "default" && (
						<Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "text.secondary" }}>
							Keeping everything in one folder means you can move or back up the whole app
							together. It will use whichever drive the app is on.
						</Typography>
					)}

					{where === "custom" && (
						<Box sx={{ mt: 2 }}>
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

					<Button
						fullWidth
						variant="contained"
						sx={{ mt: 3 }}
						disabled={!folderReady}
						onClick={() => setStep(2)}
					>
						Continue
					</Button>
				</Paper>
			</Box>
		);
	}

	return (
		<Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
			<Paper sx={{ p: 4, maxWidth: 460, width: "100%" }}>
				<Typography variant="h5" gutterBottom>
					Create your account
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
					Create your administrator account. You'll use this to manage your
					servers, and you can invite others afterwards.
				</Typography>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<TextField
					fullWidth
					label="Username"
					sx={{ mb: 2 }}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					helperText="3-32 characters. Letters, numbers, dot, underscore or hyphen."
				/>
				<TextField
					fullWidth
					type="password"
					label="Password"
					sx={{ mb: 2 }}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					error={tooShort}
					helperText={tooShort ? "At least 8 characters." : " "}
				/>
				<TextField
					fullWidth
					type="password"
					label="Confirm password"
					sx={{ mb: 3 }}
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && submit()}
					error={mismatch}
					helperText={mismatch ? "Passwords don't match." : " "}
				/>

				<Button fullWidth variant="contained" disabled={!canSubmit} onClick={submit}>
					{busy ? "Creating..." : "Create account"}
				</Button>
				<Button fullWidth sx={{ mt: 1 }} disabled={busy} onClick={() => setStep(1)}>
					Back
				</Button>
			</Paper>
		</Box>
	);
}

export default SetupWizard;
