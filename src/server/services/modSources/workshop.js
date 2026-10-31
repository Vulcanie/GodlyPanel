import { ModError, installWorkshopItem } from "../modService.js";

// Steam Workshop items are fetched by SteamCMD by item number, not from a URL, so the
// provider only needs the number. The install itself stays in modService.js.
export const workshopProvider = {
	id: "workshop",
	label: "Steam Workshop",
	hosts: ["steamcommunity.com"],

	async resolve(ref) {
		if (typeof ref !== "string" || !/^\d{3,12}$/.test(ref)) {
			throw new ModError("A Workshop item number is digits only, like 1234567890.", "bad_id");
		}
		return { source: "workshop", ref, name: `Workshop item ${ref}`, version: "", side: "both", files: [], dependencies: [] };
	},

	install: (server, ref) => installWorkshopItem(server, ref),
};
