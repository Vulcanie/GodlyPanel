# Samples per-process CPU% and RAM for every process on the machine, once
# for the system-wide stats widget's per-server breakdown.
#
# Uses Win32_PerfFormattedData_PerfProc_Process (the same class backing
# Task Manager/Resource Monitor's per-process numbers) rather than
# Win32_Process, for the same accuracy reason the system-wide CPU reading
# was switched over: it's a real performance-counter value, not a coarse
# WMI-sampled one. Two samples 1s apart are averaged since a single
# perf-counter read can be noisy, especially for a process that was
# mostly idle in the exact instant of one sample.
#
# CommandLine is pulled once (it doesn't change between samples) so the
# caller can disambiguate processes that share an executable name — ARK
# maps all run "ArkAscendedServer.exe"/"ShooterGameServer.exe", and
# distinguish only by their -RCONPort=NNNN launch argument.
#
# RAM uses WorkingSet, not WorkingSetPrivate: ZGC (used by at least one
# Minecraft server here) multi-maps its heap, which makes "private" memory
# figures badly undercount — the same issue found earlier when comparing
# Task Manager's private-bytes column against actual heap usage for a ZGC
# process. WorkingSet accounts for that correctly.

$ErrorActionPreference = "Stop"

$sample1 = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
	Where-Object { $_.Name -ne "_Total" -and $_.Name -ne "Idle" } |
	Select-Object Name, IDProcess, PercentProcessorTime, WorkingSet

Start-Sleep -Seconds 1

$sample2 = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
	Where-Object { $_.Name -ne "_Total" -and $_.Name -ne "Idle" } |
	Select-Object Name, IDProcess, PercentProcessorTime, WorkingSet

$cmdLines = Get-CimInstance Win32_Process | Select-Object ProcessId, CommandLine
$logicalCores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors

$sample1ByPid = @{}
foreach ($p in $sample1) { $sample1ByPid[[int]$p.IDProcess] = $p.PercentProcessorTime }

$cmdLineByPid = @{}
foreach ($c in $cmdLines) { $cmdLineByPid[[int]$c.ProcessId] = $c.CommandLine }

$results = foreach ($p in $sample2) {
	$procId = [int]$p.IDProcess
	if ($procId -eq 0) { continue }

	$cpu1 = $sample1ByPid[$procId]
	$cpu2 = $p.PercentProcessorTime
	$rawCpu = if ($null -ne $cpu1) { ($cpu1 + $cpu2) / 2.0 } else { $cpu2 }

	[PSCustomObject]@{
		ProcessId   = $procId
		Name        = $p.Name
		CpuPercent  = [math]::Round($rawCpu / $logicalCores, 1)
		RamMB       = [math]::Round($p.WorkingSet / 1MB, 1)
		CommandLine = $cmdLineByPid[$procId]
	}
}

$results | ConvertTo-Json -Compress -Depth 3
