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

// A date a person can read, or "" when the server sent a date that is not one.
const whenText = (iso) => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

/**
 * The server's own files, browsed from the panel: open folders, edit text files, upload, make folders, rename, download, move to the
 * trash, and unpack zips (administrators only). The server checks every request again, so what this shows is only a convenience.
 */
function FilesPanel({ serverName, isAdmin, can }) {
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
			setNotice(`Saved ${editor.name}.`);
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
		run(() => api.upload(`${base}/upload?dir=${encodeURIComponent(dir)}`, form), `Uploaded ${file.name}.`);
	};

	const submitName = () => {
		const name = nameValue.trim();
		const target = nameDialog;
		setNameDialog(null);
		if (!target) return;
		if (target.mode === "folder") {
			run(() => api.post(`${base}/mkdir`, { path: joinPath(dir, name) }), `Created the folder ${name}.`);
		} else {
			run(() => api.post(`${base}/rename`, { from: pathOf(target.entry), to: joinPath(dir, name) }), `Renamed to ${name}.`);
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
			run(() => api.post(`${base}/delete`, { path: pathOf(choice.entry) }), `Moved ${choice.entry.name} to the trash.`);
		} else if (choice.kind === "unpack") {
			run(() => api.post(`${base}/extract`, { path: pathOf(choice.entry) }), `Unpacked ${choice.entry.name}.`);
		} else if (choice.kind === "empty") {
			run(() => api.post(`${base}/trash/purge`), "Emptied the trash.").then(loadTrash);
		}
	};

	const restore = (item) => {
		run(() => api.post(`${base}/trash/restore`, { id: item.id }), `Restored ${item.originalPath}.`).then(loadTrash);
	};

	if (!perms.view) {
		return <Alert severity="info">You don't have permission to see this server's files.</Alert>;
	}

	const crumbs = breadcrumbs(dir);
	const rows = sortEntries(listing?.entries);
	const nameIsValid = nameValue.trim() !== "" && !/[\\/]/.test(nameValue);
	const named = confirm?.entry?.name ?? "";
	const confirmText = {
		discard: { title: "Throw away your changes?", body: "The text you changed hasn't been saved.", label: "Throw away", color: "error" },
		delete: { title: "Move to trash?", body: `${named} is moved to the trash. You can get it back from the trash.`, label: "Move to trash", color: "warning" },
		unpack: { title: "Unpack here?", body: `Unpacks ${named} into this folder. Files that already exist are never replaced; if any would be, nothing is unpacked.`, label: "Unpack", color: "warning" },
		empty: { title: "Empty the trash?", body: "Everything in the trash is deleted for good. This can't be undone.", label: "Empty trash", color: "error" },
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
				<Breadcrumbs aria-label="Where you are" sx={{ mb: 1.5 }}>
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
								Upload
							</Button>
							<Button variant="outlined" startIcon={<NewFolderIcon />} disabled={busy} onClick={() => { setNameValue(""); setNameDialog({ mode: "folder" }); }}>
								New folder
							</Button>
						</>
					)}
					<Button variant="outlined" startIcon={<RefreshIcon />} disabled={loading} onClick={() => load(dir)}>
						Refresh
					</Button>
					{perms.del && (
						<Button variant="outlined" startIcon={<DeleteIcon />} onClick={openTrash}>
							Trash
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
						This folder is empty.
					</Typography>
				) : (
					<Box sx={{ overflowX: "auto" }}>
						<Table size="small" aria-label="Files in this folder">
							<TableHead>
								<TableRow>
									<TableCell>Name</TableCell>
									<TableCell align="right">Size</TableCell>
									<TableCell>Modified</TableCell>
									<TableCell align="right">Actions</TableCell>
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
													<Tooltip title="Open">
														<IconButton size="small" aria-label={`Open ${entry.name}`} onClick={() => load(pathOf(entry))}>
															<OpenIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.edit && (
													<Tooltip title="Edit">
														<IconButton size="small" aria-label={`Edit ${entry.name}`} onClick={() => openEditor(entry)}>
															<EditIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.download && (
													<Tooltip title={isFolder ? "Download as a zip" : "Download"}>
														<IconButton size="small" component="a" href={downloadUrl(entry)} download aria-label={`Download ${entry.name}`}>
															<DownloadIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.rename && (
													<Tooltip title="Rename">
														<IconButton size="small" aria-label={`Rename ${entry.name}`} onClick={() => { setNameValue(entry.name); setNameDialog({ mode: "rename", entry }); }}>
															<RenameIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.extract && (
													<Tooltip title="Unpack here">
														<IconButton size="small" aria-label={`Unpack ${entry.name}`} onClick={() => setConfirm({ kind: "unpack", entry })}>
															<UnpackIcon fontSize="small" />
														</IconButton>
													</Tooltip>
												)}
												{actions.remove && (
													<Tooltip title="Move to trash">
														<IconButton size="small" aria-label={`Delete ${entry.name}`} onClick={() => setConfirm({ kind: "delete", entry })}>
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
						This folder has more items than can be shown here. Only the first ones are listed.
					</Typography>
				)}
			</Paper>

			<Dialog open={Boolean(editor)} onClose={closeEditor} maxWidth="md" fullWidth>
				<DialogTitle>{editor?.name}</DialogTitle>
				<DialogContent>
					<Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
						{editor ? formatSize(editor.size) : ""}
						{perms.edit ? "" : " · You can read this file but not change it."}
					</Typography>
					<TextField
						multiline
						minRows={14}
						maxRows={28}
						fullWidth
						value={editor?.text ?? ""}
						onChange={(e) => setEditor((current) => ({ ...current, text: e.target.value }))}
						InputProps={{ readOnly: !perms.edit }}
						inputProps={{ spellCheck: false, "aria-label": `Text of ${editor?.name ?? "the file"}` }}
						sx={{ "& textarea": { fontFamily: "monospace", fontSize: 13 } }}
					/>
					<Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
						A copy of the old version is kept next to the file as .bak.
					</Typography>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={closeEditor}>Cancel</Button>
					<Button variant="contained" disabled={!perms.edit || !dirty || saving} onClick={save}>
						{saving ? "Saving…" : "Save"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(nameDialog)} onClose={() => setNameDialog(null)} maxWidth="xs" fullWidth>
				<DialogTitle>{nameDialog?.mode === "rename" ? `Rename ${nameDialog.entry.name}` : "New folder"}</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						fullWidth
						margin="dense"
						label="Name"
						value={nameValue}
						onChange={(e) => setNameValue(e.target.value)}
						error={nameValue !== "" && !nameIsValid}
						helperText={nameValue !== "" && !nameIsValid ? "A name can't contain a slash, and can't be empty." : ""}
					/>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setNameDialog(null)}>Cancel</Button>
					<Button variant="contained" disabled={!nameIsValid || busy} onClick={submitName}>
						{nameDialog?.mode === "rename" ? "Rename" : "Create"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={trashOpen} onClose={() => setTrashOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Trash</DialogTitle>
				<DialogContent>
					{trash.length === 0 ? (
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							The trash is empty.
						</Typography>
					) : (
						trash.map((item) => (
							<Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
										{item.originalPath}
									</Typography>
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										Deleted {whenText(item.deletedAt)}
									</Typography>
								</Box>
								<Button size="small" startIcon={<RestoreIcon />} disabled={busy} onClick={() => restore(item)}>
									Restore
								</Button>
							</Box>
						))
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setTrashOpen(false)}>Close</Button>
					{trash.length > 0 && (
						<Button color="error" startIcon={<EmptyTrashIcon />} disabled={busy} onClick={() => setConfirm({ kind: "empty" })}>
							Empty trash
						</Button>
					)}
				</DialogActions>
			</Dialog>

			<ConfirmDialog
				open={Boolean(confirm)}
				title={confirmText?.title ?? "Are you sure?"}
				confirmLabel={confirmText?.label ?? "Yes"}
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
