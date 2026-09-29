import { exec } from "child_process";

export function checkProcess(processName) {
	return new Promise((resolve) => {
		// A server set to process-detection without a processName is simply
		// undetectable, not a reason to bring the panel down. This used to
		// throw inside the exec callback below — an uncaught exception, so it
		// killed the whole process, on every poll, for one malformed entry.
		if (typeof processName !== "string" || processName.trim() === "") {
			return resolve(false);
		}

		const cmd = `tasklist /FI "IMAGENAME eq ${processName}"`;

		// windowsHide: without it, every one of these (one per process-based
		// server, every ~7.5s poll cycle) flashes a console window — harmless
		// with the old always-visible parent window, but PM2 now runs this
		// process fully detached with no console of its own, so each exec()
		// has to spin one up.
		exec(cmd, { windowsHide: true }, (error, stdout) => {
			if (error) {
				console.warn(
					`[PROCESS CHECK ERROR] ${processName}:`,
					error.message,
				);
				return resolve(false);
			}

			// tasklist truncates image names to 25 chars, so we match on that
			const truncatedName = processName.slice(0, 25).toLowerCase();
			const isRunning = stdout.toLowerCase().includes(truncatedName);
			resolve(isRunning);
		});
	});
}
