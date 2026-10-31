import React from "react";
import { Alert, Box, Breadcrumbs, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import {
	CreateNewFolder as NewFolderIcon,
	Delete as DeleteIcon,
	DeleteSweep as EmptyTrashIcon,
	Download as DownloadIcon,
	DriveFileRenameOutline as RenameIcon,
	Edit as EditIcon,
	Folder as FolderIcon,
	FolderOpen as OpenIcon,
	InsertDriveFile as FileIcon,
	Refresh as RefreshIcon,
	Restore as RestoreIcon,
	Unarchive as UnpackIcon,
	UploadFile as UploadIcon,
} from "@mui/icons-material";
import { api } from "../api/client";
import { breadcrumbs, fileActions, formatSize, friendlyError, joinPath, sortEntries, uploadWarning } from "../utils/fileBrowser";
import ConfirmDialog from "./ui/ConfirmDialog";
import { t, useT, formatDate } from "../i18n";

// A date a person can read, or "" when the server sent a date that is not one.
const whenText = (iso) => (Number.isNaN(new Date(iso).getTime()) ? "" : formatDate(iso));

/**
 * The server's own files, browsed from the panel: open folders, edit text files, upload, make folders, rename, download, move to the
 * trash, and unpack zips (administrators only). The server checks every request again, so what this shows is only a convenience.
 */
function FilesPanel({ serverName, isAdmin, can }) {
	useT();
	const base = `/api/server/${encodeURIComponent(serverName)}/files`;
	const perms = {
		view: can("files.view", serverName),
		edit: can("files.edit", serverName),
		del: can("files.delete", serverName),
	};

	const [dir, setDir] = React.useState("");
	const [listing, setListing] = React.useState(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState(null);
	const [notice, setNotice] = React.useState(null);
	const [busy, setBusy] = React.useState(false);
	// The text file open in the editor, with the text as it was when it was read. Unsaved changes are the difference between the two.
	const [editor, setEditor] = React.useState(null);
	const [saving, setSaving] = React.useState(false);
	const [confirm, setConfirm] = React.useState(null);
	const [nameDialog, setNameDialog] = React.useState(null);
	const [nameValue, setNameValue] = React.useState("");
	const [trashOpen, setTrashOpen] = React.useState(false);
	const [trash, setTrash] = React.useState([]);
	const fileInput = React.useRef(null);
	// Each listing gets a number. A slow answer for a folder the person has already left is dropped, so it cannot overwrite the new one.
	const requestNo = React.useRef(0);

	const load = React.useCallback(
		async (path) => {
			const no = ++requestNo.current;
			setLoading(true);
			try {
				const result = await api.get(`${base}/list?path=${encodeURIComponent(path)}`);
				if (no !== requestNo.current) return;
				setListing(result);
				setDir(path);
				setError(null);
			} catch (e) {
				if (no !== requestNo.current) return;
				setError(friendlyError(e));
			} finally {
				if (no === requestNo.current) setLoading(false);
			}
		},
		[base],
	);

	// Starts at the server folder, and again from there when the person switches to another server.
	React.useEffect(() => {
		setEditor(null);
		setConfirm(null);
		setNotice(null);
		load("");
	}, [load]);

	// Runs one change, shows its result, then reloads the folder so the list matches the disk.
	const run = async (fn, done) => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			await fn();
			if (done) setNotice(done);
			await load(dir);
		} catch (e) {
			setError(friendlyError(e));
		} finally {
			setBusy(false);
		}
	};

	const pathOf = (entry) => joinPath(dir, entry.name);
	const downloadUrl = (entry) => `${base}/download?path=${encodeURIComponent(pathOf(entry))}`;

	const openEditor = async (entry) => {
		setBusy(true);
		setError(null);
		setNotice(null);
		try {
			const file = await api.get(`${base}/read?path=${encodeURIComponent(pathOf(entry))}`);
			setEditor({ path: pathOf(entry), name: entry.name, size: file.size, original: file.content, text: file.content });
		} catch (e) {
			// A file that is not text, or is too big to edit, comes back as an error with the reason in plain English. No editor opens.
			setError(friendlyError(e));
		} finally {
			setBusy(false);
		}
	};

	const dirty = editor ? editor.text !== editor.original : false;

	// Closing with unsaved text asks first, so a click on Cancel cannot throw away an hour of edits by accident.
	const closeEditor = () => {
		if (dirty) setConfirm({ kind: "discard" });
		else setEditor(null);
	};

	const save = async () => {
		if (!editor) return;
		setSaving(true);
		setError(null);
		try {
			await api.put(`${base}/write`, { path: editor.path, content: editor.text });
			setEditor(null);
			setNotice(t("files.saved", { name: editor.name }));
			await load(dir);
		} catch (e) {
			setError(friendlyError(e));
		} finally {
			setSaving(false);
		}
	};

	const upload = (file) => {
		if (!file) return;
		// Refused here rather than sent, so a non-administrator gets the reason before the upload starts.
		const warning = uploadWarning({ name: file.name, isAdmin });
		if (warning) {
			setError(warning);
			return;
		}
		const form = new FormData();
		form.append("file", file);
		run(() => api.upload(`${base}/upload?dir=${encodeURIComponent(dir)}`, form), t("files.uploaded", { name: file.name }));
	};

	const submitName = () => {
		const name = nameValue.trim();
		const target = nameDialog;
		setNameDialog(null);
		if (!target) return;
		if (target.mode === "folder") {
			run(() => api.post(`${base}/mkdir`, { path: joinPath(dir, name) }), t("files.createdFolder", { name }));
		} else {
			run(() => api.post(`${base}/rename`, { from: pathOf(target.entry), to: joinPath(dir, name) }), t("files.renamedTo", { name }));
		}
	};

	const loadTrash = async () => {
		try {
			const result = await api.get(`${base}/trash`);
			setTrash(Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : []);
		} catch (e) {
			setTrash([]);
			setError(friendlyError(e));
		}
	};

	const openTrash = () => {
		setTrashOpen(true);
		loadTrash();
	};

	const onConfirm = () => {
		const choice = confirm;
		setConfirm(null);
		if (!choice) return;
		if (choice.kind === "discard") {
			setEditor(null);
		} else if (choice.kind === "delete") {
			run(() => api.post(`${base}/delete`, { path: pathOf(choice.entry) }), t("files.movedTrash", { name: choice.entry.name }));
		} else if (choice.kind === "unpack") {
			run(() => api.post(`${base}/extract`, { path: pathOf(choice.entry) }), t("files.unpacked", { name: choice.entry.name }));
		} else if (choice.kind === "empty") {
			run(() => api.post(`${base}/trash/purge`), t("files.emptied")).then(loadTrash);
		}
	};

	const restore = (item) => {
		run(() => api.post(`${base}/trash/restore`, { id: item.id }), t("files.restored", { path: item.originalPath })).then(loadTrash);
	};

	if (!perms.view) {
		return <Alert severity="info">{t("files.noPermission")}</Alert>;
	}

	const crumbs = breadcrumbs(dir);
	const rows = sortEntries(listing?.entries);
	const nameIsValid = nameValue.trim() !== "" && !/[\\/]/.test(nameValue);
	const named = confirm?.entry?.name ?? "";
	const confirmText = {
		discard: { title: t("files.discardTitle"), body: t("files.discardBody"), label: t("files.throwAway"), color: "error" },
		delete: { title: t("files.moveTrashTitle"), body: t("files.deleteBody", { name: named }), label: t("files.moveTrash"), color: "warning" },
		unpack: { title: t("files.unpackTitle"), body: t("files.unpackBody", { name: named }), label: t("files.unpack"), color: "warning" },
		empty: { title: t("files.emptyTitle"), body: t("files.emptyBody"), label: t("files.emptyTrash"), color: "error" },
	}[confirm?.kind];

	return (
		<Box>
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}
			{notice && (
				<Alert severity="success" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
					{notice}
				</Alert>
			)}

			<Paper sx={{ p: 2, mb: 2 }}>
				<Breadcrumbs aria-label={t("files.whereAria")} sx={{ mb: 1.5 }}>
					{crumbs.map((crumb, i) =>
						i === crumbs.length - 1 ? (
							<Typography key={crumb.path} variant="body2" color="text.primary">
								{crumb.label}
							</Typography>
						) : (
							<Link key={crumb.path} component="button" variant="body2" onClick={() => load(crumb.path)}>
								{crumb.label}
							</Link>
						),
					)}
				</Breadcrumbs>

				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
					{perms.edit && (
						<>
							<input ref={fileInput} type="file" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
							<Button variant="contained" startIcon={<UploadIcon />} disabled={busy} onClick={() => fileInput.current?.click()}>
								{t("files.upload")}
							</Button>
							<Button variant="outlined" startIcon={<NewFolderIcon />} disabled={busy} onClick={() => { setNameValue(""); setNameDialog({ mode: "folder" }); }}>
								{t("files.newFolder")}
							</Button>
						</>
					)}
					<Button variant="outlined" startIcon={<RefreshIcon />} disabled={loading} onClick={() => load(dir)}>
						{t("common.refresh")}
					</Button>
					{perms.del && (
						<Button variant="outlined" startIcon={<DeleteIcon />} onClick={openTrash}>
							{t("files.trash")}
						</Button>
					)}
					{(loading || busy) && <CircularProgress size={18} />}
				</Box>
			</Paper>

			<Paper>
				{!listing ? (
					loading ? <CircularProgress size={24} sx={{ m: 2 }} /> : null
				) : rows.length === 0 ? (
					<Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
						{t("files.empty")}
					</Typography>
				) : (
					<Box sx={{ overflowX: "auto" }}>
						<Table size="small" aria-label={t("files.tableAria")}>
							<TableHead>
								<TableRow>
									<TableCell>{t("common.name")}</TableCell>
									<TableCell align="right">{t("common.size")}</TableCell>
									<TableCell>{t("files.modified")}</TableCell>
									<TableCell align="right">{t("files.actions")}</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((entry) => {
									const actions = fileActions({ entry, can: perms, isAdmin });
									const isFolder = entry.type === "dir";
									return (
										<TableRow key={entry.name}>
											<TableCell sx={{ display: "flex", alignItems: "center", gap: 1, border: 0 }}>
												{isFolder ? <FolderIcon fontSize="small" color="action" /> : <FileIcon fontSize="small" color="action" />}
												{actions.open ? (
													<Button size="small" sx={{ textTransform: "none", justifyContent: "flex-start" }} onClick={() => load(pathOf(entry))}>
														{entry.name}
													</Button>
												) : actions.edit ? (
													<Button size="small" sx={{ textTransform: "none", justifyContent: "flex-start" }} onClick={() => openEditor(entry)}>
														{entry.name}
													</Button>
												) : (
													<Typography variant="body2">{entry.name}</Typography>
												)}
											</TableCell>
											<TableCell align="right">{isFolder ? "" : formatSize(entry.size)}</TableCell>
											<TableCell>{whenText(entry.modifiedAt)}</TableCell>
											<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
												{actions.open && (
													<Tooltip title={t("common.open")}>
														<IconButton size="small" aria-label={t("files.openNamed", { name: entry.name })} onClick={() => load(pathOf(entry))}>
															<OpenIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.edit && (
													<Tooltip title={t("files.edit")}>
														<IconButton size="small" aria-label={t("files.editNamed", { name: entry.name })} onClick={() => openEditor(entry)}>
															<EditIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.download && (
													<Tooltip title={isFolder ? t("files.downloadZip") : t("files.download")}>
														<IconButton size="small" component="a" href={downloadUrl(entry)} download aria-label={t("files.downloadNamed", { name: entry.name })}>
															<DownloadIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.rename && (
													<Tooltip title={t("files.rename")}>
														<IconButton size="small" aria-label={t("files.renameNamed", { name: entry.name })} onClick={() => { setNameValue(entry.name); setNameDialog({ mode: "rename", entry }); }}>
															<RenameIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.extract && (
													<Tooltip title={t("files.unpackHere")}>
														<IconButton size="small" aria-label={t("files.unpackNamed", { name: entry.name })} onClick={() => setConfirm({ kind: "unpack", entry })}>
															<UnpackIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.remove && (
													<Tooltip title={t("files.moveTrash")}>
														<IconButton size="small" aria-label={t("files.deleteNamed", { name: entry.name })} onClick={() => setConfirm({ kind: "delete", entry })}>
															<DeleteIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</Box>
				)}
				{listing?.truncated && (
					<Typography variant="caption" sx={{ display: "block", p: 2, color: "text.secondary" }}>
						{t("files.truncated")}
					</Typography>
				)}
			</Paper>

			<Dialog open={Boolean(editor)} onClose={closeEditor} maxWidth="md" fullWidth>
				<DialogTitle>{editor?.name}</DialogTitle>
				<DialogContent>
					<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
						{editor ? (perms.edit ? formatSize(editor.size) : t("files.sizeReadOnly", { size: formatSize(editor.size) })) : ""}
					</Typography>
					<TextField
						multiline
						minRows={14}
						maxRows={28}
						fullWidth
						value={editor?.text ?? ""}
						onChange={(e) => setEditor((current) => ({ ...current, text: e.target.value }))}
						InputProps={{ readOnly: !perms.edit }}
						inputProps={{ spellCheck: false, "aria-label": t("files.textOf", { name: editor?.name ?? t("files.theFile") }) }}
						sx={{ "& textarea": { fontFamily: "monospace", fontSize: 13 } }}
					/>
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						{t("files.bakNote")}
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={closeEditor}>{t("common.cancel")}</Button>
					<Button variant="contained" disabled={!perms.edit || !dirty || saving} onClick={save}>
						{saving ? t("common.saving") : t("common.save")}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(nameDialog)} onClose={() => setNameDialog(null)} maxWidth="xs" fullWidth>
				<DialogTitle>{nameDialog?.mode === "rename" ? t("files.renameTitle", { name: nameDialog.entry.name }) : t("files.newFolder")}</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						fullWidth
						margin="dense"
						label={t("common.name")}
						value={nameValue}
						onChange={(e) => setNameValue(e.target.value)}
						error={nameValue !== "" && !nameIsValid}
						helperText={nameValue !== "" && !nameIsValid ? t("files.nameInvalid") : ""}
					/>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setNameDialog(null)}>{t("common.cancel")}</Button>
					<Button variant="contained" disabled={!nameIsValid || busy} onClick={submitName}>
						{nameDialog?.mode === "rename" ? t("files.rename") : t("common.create")}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={trashOpen} onClose={() => setTrashOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>{t("files.trash")}</DialogTitle>
				<DialogContent>
					{trash.length === 0 ? (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{t("files.trashEmpty")}
						</Typography>
					) : (
						trash.map((item) => (
							<Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
										{item.originalPath}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										{t("files.deletedAt", { when: whenText(item.deletedAt) })}
									</Typography>
								</Box>
								<Button size="small" startIcon={<RestoreIcon />} disabled={busy} onClick={() => restore(item)}>
									{t("files.restore")}
								</Button>
							</Box>
						))
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setTrashOpen(false)}>{t("common.close")}</Button>
					{trash.length > 0 && (
						<Button color="error" startIcon={<EmptyTrashIcon />} disabled={busy} onClick={() => setConfirm({ kind: "empty" })}>
							{t("files.emptyTrash")}
						</Button>
					)}
				</DialogActions>
			</Dialog>

			<ConfirmDialog
				open={Boolean(confirm)}
				title={confirmText?.title ?? t("common.areYouSure")}
				confirmLabel={confirmText?.label ?? t("common.yes")}
				color={confirmText?.color ?? "warning"}
				onClose={() => setConfirm(null)}
				onConfirm={onConfirm}
			>
				{confirmText?.body}
			</ConfirmDialog>
		</Box>
	);
}

export default FilesPanel;
