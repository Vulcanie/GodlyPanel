import path from "node:path";
import { fileURLToPath } from "node:url";

// Scripts and launcher templates live OUTSIDE app.asar (electron-builder
// `extraResources`) because Windows cannot execute a .ps1/.bat from inside an
// asar archive. The main process is the only place that knows whether we're
// packaged, so it resolves the root once and passes it down via
// GHP_RESOURCE_ROOT — nothing here guesses. The fallback exists only so this
// module still works when a file is run directly with plain `node` (tests,
// one-off scripts), where no main process has set the env var.
const FALLBACK_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"resources",
);

export const resourceRoot = process.env.GHP_RESOURCE_ROOT || FALLBACK_ROOT;

/**
 * Resolve a path inside the bundled resources dir.
 * Always pass a forward-slash relative path, e.g. "scripts/launch-hidden.ps1".
 */
export function resolveResource(relPath) {
	return path.join(resourceRoot, ...relPath.split("/"));
}
