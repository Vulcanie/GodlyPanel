import React from "react";
import { Box, Button, Typography, TextField, Alert, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, Tooltip, CircularProgress } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Add as AddIcon, AdminPanelSettings as RolesIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useSession } from "../SessionContext";
import { useToast } from "../ToastContext";
import { applyPreset, canGrant, groupedPermissions, normalizePatterns, permissionLabel, SCOPE_MODES, scopeChanged, scopeProblem, scopeSummary, togglePermission } from "../roleEditor";
import { t, tn, useT, errorText } from "../i18n";
import PageHeader from "./ui/PageHeader";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";

// The server caps a role name at this length; the field stops the person typing past it, and the server checks it again.
const NAME_MAX = 40;

/** Makes and edits custom roles. What a role may do is the list of permissions; the server checks every change again. */
function RolesPage({ onBack }) {
	const toast = useToast();
	// Re-renders this page when the language changes, so the t() text below switches with it.
	useT();
	const { user, isAdmin } = useSession();
	const [data, setData] = React.useState(null); // { roles, permissions, groups, commandPresets }
	const [error, setError] = React.useState(null);
	const [dialog, setDialog] = React.useState(null); // null, or { role: null } for a new role, or { role } to edit one
	const [deleting, setDeleting] = React.useState(null);
	const [deleteOpen, setDeleteOpen] = React.useState(false);

	const load = React.useCallback(async () => {
		try {
			const res = await api.get("/api/roles");
			setData({
				roles: Array.isArray(res?.roles) ? res.roles : [],
				permissions: Array.isArray(res?.permissions) ? res.permissions : [],
				groups: res?.groups ?? {},
				commandPresets: Array.isArray(res?.commandPresets) ? res.commandPresets : [],
			});
		} catch (e) {
			setError(errorText(e));
		}
	}, []);

	React.useEffect(() => {
		load();
	}, [load]);

	const remove = async (role) => {
		try {
			await api.del(`/api/roles/${role.id}`);
			toast(t("roles.deleted", { name: role.name }));
			await load();
		} catch (e) {
			setError(errorText(e));
		}
	};

	const roles = data?.roles ?? [];

	return (
		<Box sx={{ mt: 2 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				{t("common.backToDashboard")}
			</Button>

			<PageHeader title={t("common.roles")} subtitle={t("roles.subtitle")} icon={<RolesIcon />} />

			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{!data ? (
				!error && <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
			) : (
				<SectionCard
					title={t("roles.listTitle", { count: roles.length })}
					contentSx={{ p: 0 }}
					actions={
						<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ role: null })}>
							{t("roles.new")}
						</Button>
					}
				>
					{roles.map((role, index) => {
						const isAdminRole = role.id === "admin";
						const count = Number(role.users) || 0;
						const deleteBlocked = Boolean(role.locked) || count > 0;
						const deleteTip = role.locked ? t("roles.builtInNoDelete") : count > 0 ? t("roles.moveFirst") : t("common.delete");
						return (
							<Box key={role.id} sx={{ px: 2.5, py: 1.5, borderTop: index === 0 ? 0 : 1, borderColor: "divider" }}>
								<Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
									<Typography sx={{ flex: "1 1 140px", minWidth: 0, wordBreak: "break-word", fontWeight: 600 }}>{role.name}</Typography>
									{role.locked && <Chip size="small" variant="outlined" label={t("roles.builtIn")} />}
									<Chip size="small" variant="outlined" label={tn("roles.people", count)} />
									<Chip
										size="small"
										variant="outlined"
										label={isAdminRole ? t("roles.everything") : tn("roles.permissionCount", role.permissions?.length ?? 0)}
									/>
									{/* Only a role that can use the console has a console scope worth showing. The admin always shows one, since it can use the console. */}
									{(isAdminRole || (Array.isArray(role.permissions) && role.permissions.includes("server.console"))) && (
										<Chip size="small" variant="outlined" label={scopeSummary(role.commandScope)} />
									)}
									<Box sx={{ display: "flex", alignItems: "center" }}>
										{!role.locked && (
											<Tooltip title={t("common.edit")}>
												<IconButton size="small" aria-label={t("roles.editName", { name: role.name })} onClick={() => setDialog({ role })}>
													<EditIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										)}
										<Tooltip title={deleteTip}>
											<span>
												<IconButton
													size="small"
													aria-label={t("roles.deleteName", { name: role.name })}
													disabled={deleteBlocked}
													onClick={() => {
														setDeleting(role);
														setDeleteOpen(true);
													}}
												>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</span>
										</Tooltip>
									</Box>
								</Box>
								{/* A built-in role's permissions are fixed, so they are shown as a list instead of an editor. */}
								{role.locked && !isAdminRole && role.permissions?.length > 0 && (
									<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
										{role.permissions.map((p) => (
											<Chip key={p} size="small" label={permissionLabel(p)} />
										))}
									</Box>
								)}
							</Box>
						);
					})}
				</SectionCard>
			)}

			<ConfirmDialog
				open={deleteOpen && Boolean(deleting)}
				title={t("roles.deleteTitle", { name: deleting?.name })}
				confirmLabel={t("common.delete")}
				color="error"
				onConfirm={() => {
					setDeleteOpen(false);
					remove(deleting);
				}}
				onClose={() => setDeleteOpen(false)}
			>
				{t("roles.deleteBody")}
			</ConfirmDialog>

			{dialog && (
				<RoleDialog
					key={dialog.role?.id ?? "new"}
					role={dialog.role}
					permissions={data?.permissions ?? []}
					groups={data?.groups ?? {}}
					commandPresets={data?.commandPresets ?? []}
					actorPermissions={user?.permissions}
					isAdmin={isAdmin}
					onClose={() => setDialog(null)}
					onSaved={async (message) => {
						setDialog(null);
						toast(message);
						await load();
					}}
				/>
			)}
		</Box>
	);
}

/** A new role, or the name and permissions of one that exists. Server errors show here, so the person can fix them and try again. */
function RoleDialog({ role, permissions, groups, commandPresets, actorPermissions, isAdmin, onClose, onSaved }) {
	useT();
	const editing = Boolean(role);
	const [name, setName] = React.useState(role?.name ?? "");
	const [selected, setSelected] = React.useState(() => (Array.isArray(role?.permissions) ? [...role.permissions] : []));
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState(null);
	// The scope as it was when the dialog opened. A new role starts as Any command. Saving compares against this, so an
	// untouched scope is never sent back to the server.
	const [initialScope] = React.useState(() => applyPreset(role?.commandScope));
	const [scopeMode, setScopeMode] = React.useState(initialScope.mode);
	const [scopeText, setScopeText] = React.useState(initialScope.patterns.join("\n"));

	const trimmed = name.trim();
	const sections = groupedPermissions(groups, permissions);
	const consoleOn = selected.includes("server.console");
	const currentScope = { mode: scopeMode, patterns: scopeMode === "all" ? [] : normalizePatterns(scopeText) };
	// The scope only matters while the console is ticked, because that is when its section is shown. Saving is blocked on a bad scope
	// only then, so a hidden section can never block a save.
	const scopeError = consoleOn && isAdmin ? scopeProblem(currentScope) : "";
	const canSave = trimmed.length > 0 && trimmed.length <= NAME_MAX && !saving && scopeError === "";

	const applyPresetToForm = (preset) => {
		const next = applyPreset(preset);
		setScopeMode(next.mode);
		setScopeText(next.patterns.join("\n"));
	};

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			const body = { name: trimmed, permissions: selected };
			// Only an administrator may change the console scope, so anyone else never sends it. The scope is sent only when this save
			// changes it; otherwise the server keeps what is stored.
			if (isAdmin && consoleOn && scopeChanged(initialScope, currentScope)) body.commandScope = currentScope;
			if (editing) await api.put(`/api/roles/${role.id}`, body);
			else await api.post("/api/roles", body);
			await onSaved(editing ? t("roles.saved", { name: trimmed }) : t("roles.created", { name: trimmed }));
		} catch (e) {
			setError(errorText(e));
			setSaving(false);
		}
	};

	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>{editing ? t("roles.editName", { name: role.name }) : t("roles.new")}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "16px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				<TextField
					label={t("common.name")}
					size="small"
					fullWidth
					autoComplete="off"
					value={name}
					onChange={(e) => setName(e.target.value)}
					slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
				/>
				{sections.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{t("roles.noPermissions")}
					</Typography>
				)}
				{sections.map((section) => (
					<Box key={section.id}>
						<Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.5 }}>
							{section.label}
						</Typography>
						<Box sx={{ display: "flex", flexDirection: "column" }}>
							{section.items.map((p) => {
								// A person may not hand out a permission they lack themselves. One they already hold can still be kept.
								const grantable = canGrant(actorPermissions, p, isAdmin);
								const checked = selected.includes(p);
								return (
									// The checkbox carries its own disabled state; FormControlLabel must not set one, or it would override it.
									<FormControlLabel
										key={p}
										control={<Checkbox size="small" checked={checked} disabled={!grantable} onChange={() => setSelected((list) => togglePermission(list, p))} />}
										label={
											<Box>
												<Typography variant="body2">{permissionLabel(p)}</Typography>
												{!grantable && (
													<Typography variant="caption" sx={{ color: "text.secondary" }}>
														{t("roles.notYours")}
													</Typography>
												)}
											</Box>
										}
									/>
								);
							})}
						</Box>
					</Box>
				))}
				{consoleOn && (
					<Box>
						<Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 0.5 }}>
							{t("roles.consoleCommands")}
						</Typography>
						{!isAdmin && (
							<Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
								{t("roles.adminOnly")}
							</Typography>
						)}
						<RadioGroup value={scopeMode} onChange={(e) => setScopeMode(e.target.value)}>
							{SCOPE_MODES.map((m) => (
								<FormControlLabel
									key={m.id}
									value={m.id}
									control={<Radio size="small" disabled={!isAdmin} />}
									label={<Typography variant="body2">{m.label}</Typography>}
								/>
							))}
						</RadioGroup>
						{commandPresets.length > 0 && (
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
								{commandPresets.map((preset) => (
									<Button key={preset.id} size="small" variant="outlined" disabled={!isAdmin} onClick={() => applyPresetToForm(preset)}>
										{preset.label}
									</Button>
								))}
							</Box>
						)}
						{scopeMode !== "all" && (
							<TextField
								label={t("roles.commandsLabel")}
								size="small"
								fullWidth
								multiline
								minRows={3}
								autoComplete="off"
								disabled={!isAdmin}
								value={scopeText}
								onChange={(e) => setScopeText(e.target.value)}
								error={Boolean(scopeError)}
								helperText={scopeError ? scopeError : t("roles.commandsHelp")}
								sx={{ mt: 1.5 }}
							/>
						)}
					</Box>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t("common.cancel")}</Button>
				<Button variant="contained" disabled={!canSave} onClick={save}>
					{t("common.save")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default RolesPage;
