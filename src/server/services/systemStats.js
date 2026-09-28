import { exec } from "child_process";

// Single WMI/perf-counter round-trip for both memory and CPU, so the
// periodic poll only ever spawns one process instead of two.
//
// CPU uses the '% Processor Time' _Total performance counter (the same
// one Task Manager reads) rather than Win32_Processor.LoadPercentage.
// LoadPercentage is a single coarse WMI-sampled value per physical CPU
// package — on this machine that's one package covering 24 logical
// cores, so it doesn't track true aggregate load across all of them the
// way the perf counter does, and was observed reading meaningfully
// different (and less accurate) values than the real counter under
// bursty multi-threaded load. Two samples are taken 1s apart and
// averaged since a single Get-Counter read can be noisy.
const STATS_COMMAND =
	'$os = Get-CimInstance Win32_OperatingSystem; ' +
	"$cpuSamples = (Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 1 -MaxSamples 2).CounterSamples.CookedValue; " +
	"$cpu = ($cpuSamples | Measure-Object -Average).Average; " +
	"[PSCustomObject]@{TotalKB=$os.TotalVisibleMemorySize; FreeKB=$os.FreePhysicalMemory; CpuPercent=$cpu} | ConvertTo-Json -Compress";

// Last successful reading, served to clients that connect between poll
// ticks (mirrors serverStatus in pollingService.js).
export let latestStats = null;

export function getSystemStats() {
	return new Promise((resolve, reject) => {
		exec(
			`powershell -NoProfile -Command "${STATS_COMMAND}"`,
			{ windowsHide: true, timeout: 8000 },
			(error, stdout) => {
				if (error) return reject(error);

				let parsed;
				try {
					parsed = JSON.parse(stdout);
				} catch (e) {
					return reject(new Error(`Failed to parse system stats: ${e.message}`));
				}

				const totalMB = Math.round(parsed.TotalKB / 1024);
				const freeMB = Math.round(parsed.FreeKB / 1024);
				const usedMB = totalMB - freeMB;

				const stats = {
					totalMemMB: totalMB,
					usedMemMB: usedMB,
					usedMemPercent: Math.round((usedMB / totalMB) * 1000) / 10,
					cpuPercent: Math.round(parsed.CpuPercent),
					timestamp: Date.now(),
				};

				latestStats = stats;
				resolve(stats);
			},
		);
	});
}
