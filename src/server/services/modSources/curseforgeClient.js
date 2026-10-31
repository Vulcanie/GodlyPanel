import { ModError } from "../modService.js";
import { getSecrets } from "../../config/secretsStore.js";
import { readCapped, TIMEOUT_MS } from "./http.js";

// The one place the CurseForge calls read their API address and key. The mod provider and the modpack importer both use these, so
// the key is looked up the same way in both. The address is an environment variable so a test can point it at a stand-in server.

export const cfApiBase = () => process.env.GHP_CURSEFORGE_API || "https://api.curseforge.com/v1";
export const cfApiKey = (ctx = {}) => ctx.secrets?.curseForgeApiKey ?? getSecrets().curseForgeApiKey ?? "";

const tooBig = () => new ModError("CurseForge's answer is bigger than the panel reads, so it was refused.", "curseforge_failed", 502);

// A GET to CurseForge's API. The request never follows a redirect: the key is in a header, and a redirect could send it to another host.
export async function cfGetJson(pathAndQuery, ctx = {}, notFound) {
	const key = cfApiKey(ctx);
	// Checked again here, not only by the callers, so no request ever goes out without the key it needs.
	if (!key) throw new ModError("Add a CurseForge key in Settings to install from CurseForge.", "needs_api_key", 400);
	const fetchImpl = ctx.fetchImpl ?? fetch;
	let res;
	try {
		res = await fetchImpl(`${cfApiBase()}${pathAndQuery}`, {
			headers: { Accept: "application/json", "x-api-key": key, "User-Agent": "GodlyPanel" },
			redirect: "error",
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch {
		// With redirect "error", a redirect makes the request fail rather than being followed. Either way the answer isn't used.
		throw new ModError("CurseForge couldn't be reached, or it sent a redirect the panel won't follow.", "curseforge_failed", 502);
	}
	if (res.status === 404) throw new ModError(notFound, "not_found", 404);
	if (res.status === 401 || res.status === 403) throw new ModError("CurseForge refused the API key. Check it in Settings.", "needs_api_key", 400);
	if (!res.ok) throw new ModError(`CurseForge answered ${res.status}.`, "curseforge_failed", 502);
	const text = await readCapped(res, { tooBig });
	try {
		return JSON.parse(text);
	} catch {
		throw new ModError("CurseForge sent a reply that isn't JSON.", "curseforge_failed", 502);
	}
}
