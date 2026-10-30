import React from "react";
import { Box, Button, Typography, TextField, Alert, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Tooltip, CircularProgress } from "@mui/material";
import { ArrowBack as ArrowBackIcon, Add as AddIcon, AdminPanelSettings as RolesIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { api } from "../api/client";
import { useSession } from "../SessionContext";
import { useToast } from "../ToastContext";
import { canGrant, groupedPermissions, permissionLabel, togglePermission } from "../roleEditor";
import PageHeader from "./ui/PageHeader";
import SectionCard from "./ui/SectionCard";
import ConfirmDialog from "./ui/ConfirmDialog";

// The server caps a role name at this length; the field stops the person typing past it, and the server checks it again.
const NAME_MAX = 40;

/** Makes and edits custom roles. What a role may do is the list of permissions; the server checks every change again. */
function RolesPage({ onBack }) {
	const toast = useToast();
	const { user, isAdmin } = useSession();
	const [data, setData] = React.useState(null); // { roles, permissions, groups }
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
			});
		} catch (e) {
			setError(e.message);
		}
	}, []);

	React.useEffect(() => {
		load();
	}, [load]);

	const remove = async (role) => {
		try {
			await api.del(`/api/roles/${role.id}`);
			toast(`Deleted ${role.name}.`);
			await load();
		} catch (e) {
			setError(e.message);
		}
	};

	const roles = data?.roles ?? [];

	return (
		<Box sx={{ mt: 2 }}>
			<Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
				Back to Dashboard
			</Button>

			<PageHeader title="Roles" subtitle="Choose what each role may do" icon={<RolesIcon />} />

			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			{!data ? (
				!error && <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />
			) : (
				<SectionCard
					title={`Roles (${roles.length})`}
					contentSx={{ p: 0 }}
					actions={
						<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ role: null })}>
							New role
						</Button>
					}
				>
					{roles.map((role, index) => {
						const isAdminRole = role.id === "admin";
						const count = Number(role.users) || 0;
						const deleteBlocked = Boolean(role.locked) || count > 0;
						const deleteTip = role.locked ? "Built-in roles can't be deleted." : count > 0 ? "Move the people holding it to another role first." : "Delete";
						return (
							<Box key={role.id} sx={{ px: 2.5, py: 1.5, borderTop: index === 0 ? 0 : 1, borderColor: "divider" }}>
								<Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
									<Typography sx={{ flex: "1 1 140px", minWidth: 0, wordBreak: "break-word", fontWeight: 600 }}>{role.name}</Typography>
									{role.locked && <Chip size="small" variant="outlined" label="Built in" />}
									<Chip size="small" variant="outlined" label={`${count} ${count === 1 ? "person" : "people"}`} />
									<Chip
										size="small"
										variant="outlined"
										label={isAdminRole ? "Everything" : `${role.permissions?.length ?? 0} ${role.permissions?.length === 1 ? "permission" : "permissions"}`}
									/>
									<Box sx={{ display: "flex", alignItems: "center" }}>
										{!role.locked && (
											<Tooltip title="Edit">
												<IconButton size="small" aria-label={`Edit ${role.name}`} onClick={() => setDialog({ role })}>
													<EditIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										)}
										<Tooltip title={deleteTip}>
											<span>
												<IconButton
													size="small"
													aria-label={`Delete ${role.name}`}
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
				title={`Delete ${deleting?.name}?`}
				confirmLabel="Delete"
				color="error"
				onConfirm={() => {
					setDeleteOpen(false);
					remove(deleting);
				}}
				onClose={() => setDeleteOpen(false)}
			>
				Anyone who had this role keeps nothing from it. This can't be undone.
			</ConfirmDialog>

			{dialog && (
				<RoleDialog
					key={dialog.role?.id ?? "new"}
					role={dialog.role}
					permissions={data?.permissions ?? []}
					groups={data?.groups ?? {}}
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
function RoleDialog({ role, permissions, groups, actorPermissions, isAdmin, onClose, onSaved }) {
	const editing = Boolean(role);
	const [name, setName] = React.useState(role?.name ?? "");
	const [selected, setSelected] = React.useState(() => (Array.isArray(role?.permissions) ? [...role.permissions] : []));
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState(null);

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && trimmed.length <= NAME_MAX && !saving;
	const sections = groupedPermissions(groups, permissions);

	const save = async () => {
		setSaving(true);
		setError(null);
		try {
			const body = { name: trimmed, permissions: selected };
			if (editing) await api.put(`/api/roles/${role.id}`, body);
			else await api.post("/api/roles", body);
			await onSaved(editing ? `Saved ${trimmed}.` : `Created ${trimmed}.`);
		} catch (e) {
			setError(e.message);
			setSaving(false);
		}
	};

	return (
		<Dialog open onClose={onClose} fullWidth maxWidth="sm">
			<DialogTitle>{editing ? `Edit ${role.name}` : "New role"}</DialogTitle>
			<DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: "16px !important" }}>
				{error && <Alert severity="error">{error}</Alert>}
				<TextField
					label="Name"
					size="small"
					fullWidth
					autoComplete="off"
					value={name}
					onChange={(e) => setName(e.target.value)}
					slotProps={{ htmlInput: { maxLength: NAME_MAX } }}
				/>
				{sections.length === 0 && (
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						There are no permissions to choose from.
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
														You don't have this yourself
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
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" disabled={!canSave} onClick={save}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default RolesPage;
