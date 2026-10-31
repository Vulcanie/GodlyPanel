import React from "react";
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Link, TextField, Typography } from "@mui/material";
import { Visibility as ShowIcon, VisibilityOff as HideIcon } from "@mui/icons-material";
import { useSession } from "../SessionContext";
import { api } from "../api/client";
import { flatWhenDisabled } from "./cardStyles";
import AuthShell, { Brand } from "./AuthShell";
import { t, useT, errorText } from "../i18n";

function LoginPage() {
	useT();
	const { login, join } = useSession();
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");
	const [joining, setJoining] = React.useState(false);
	const [canJoin, setCanJoin] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	const [reveal, setReveal] = React.useState(false);

	// Whether the owner has a community code switched on. Nothing else about it is public.
	React.useEffect(() => {
		api.get("/api/auth/join").then((r) => setCanJoin(Boolean(r?.open))).catch(() => {});
	}, []);

	const ready = Boolean(username && password && (!joining || code));

	const submit = async () => {
		if (!ready || busy) return;
		setBusy(true);
		setError(null);
		try {
			// No token handling here any more: the server sets an HttpOnly
			// session cookie, which the browser sends on its own.
			if (joining) await join(code, username, password);
			else await login(username, password);
		} catch (e) {
			setError({ message: errorText(e, t("common.somethingWrong")), notice: e?.code === "staff_not_allowed_here" });
			setBusy(false);
		}
	};

	const switchTo = (toJoin) => {
		setJoining(toJoin);
		setError(null);
		setPassword("");
		setReveal(false);
	};

	const onEnter = (e) => e.key === "Enter" && submit();

	return (
		<AuthShell
			footer={
				<Typography variant="caption">
					{t("login.trouble")}{" "}
					<Link href="https://github.com/Vulcanie/GodlyPanel/blob/main/docs/WHAT_THE_MESSAGES_MEAN.md#signing-in" target="_blank" rel="noopener noreferrer">
						{t("login.messages")}
					</Link>
				</Typography>
			}
		>
			<Brand />
			<Typography variant="h6" component="h1" align="center" sx={{ mb: 0.5 }}>
				{joining ? t("login.joinTitle") : t("login.welcomeBack")}
			</Typography>
			<Typography variant="body2" align="center" sx={{ color: "text.secondary", mb: 3 }}>
				{joining ? t("login.joinBody") : t("login.signInBody")}
			</Typography>

			{error && (
				// Not a mistake they made: the details are a notice, not an error.
				<Alert severity={error.notice ? "info" : "error"} sx={{ mb: 2 }}>
					{error.message}
				</Alert>
			)}

			<Box component="form" noValidate onSubmit={(e) => e.preventDefault()}>
				{joining && (
					<TextField
						fullWidth
						label={t("login.communityCode")}
						autoFocus
						autoComplete="off"
						placeholder={t("login.codePlaceholder")}
						sx={{ mb: 2 }}
						value={code}
						onChange={(e) => setCode(e.target.value)}
						onKeyDown={onEnter}
						slotProps={{ htmlInput: { style: { letterSpacing: "0.08em", textTransform: "uppercase" } } }}
					/>
				)}
				<TextField
					fullWidth
					label={joining ? t("login.chooseUsername") : t("common.username")}
					autoFocus={!joining}
					autoComplete="username"
					sx={{ mb: 2 }}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					onKeyDown={onEnter}
					helperText={joining ? t("login.usernameHelp") : undefined}
				/>
				<TextField
					fullWidth
					type={reveal ? "text" : "password"}
					label={joining ? t("login.choosePassword") : t("common.password")}
					autoComplete={joining ? "new-password" : "current-password"}
					sx={{ mb: 3 }}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={onEnter}
					helperText={joining ? t("common.atLeast8") : undefined}
					slotProps={{
						input: {
							endAdornment: (
								<InputAdornment position="end">
									{/* Named so that it never matches a "password" label lookup. */}
									<IconButton size="small" edge="end" aria-label={reveal ? t("common.hideTyped") : t("common.showTyped")} onClick={() => setReveal((v) => !v)} onMouseDown={(e) => e.preventDefault()}>
										{reveal ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
									</IconButton>
								</InputAdornment>
							),
						},
					}}
				/>

				<Button fullWidth size="large" variant="contained" onClick={submit} disabled={busy || !ready} sx={{ py: 1.2, ...flatWhenDisabled }}>
					{busy ? <CircularProgress size={22} color="inherit" /> : joining ? t("login.createAccount") : t("login.signIn")}
				</Button>
			</Box>

			{canJoin && (
				<Typography variant="body2" align="center" sx={{ mt: 2.5 }}>
					{joining ? (
						<Link component="button" type="button" onClick={() => switchTo(false)}>
							{t("login.haveAccount")}
						</Link>
					) : (
						<Link component="button" type="button" onClick={() => switchTo(true)}>
							{t("login.haveCode")}
						</Link>
					)}
				</Typography>
			)}
		</AuthShell>
	);
}

export default LoginPage;
