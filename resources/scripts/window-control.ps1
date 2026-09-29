# Hides (or later restores) the taskbar windows that game servers open for
# themselves. Many servers are started with `start /MIN game.exe`, and games
# such as the Unreal ones open their own log window well after launch, so
# hiding is done by watching for a while rather than once.
#
# Which windows: those owned by a server's processes (matched by image name and,
# for ARK, by its RCON port on the command line) and their direct children. Only
# real taskbar windows are touched — titled, unowned, not tool windows — so the
# invisible helper windows every program keeps are left alone. Windows that were
# hidden are recorded, and "show" restores exactly those and nothing else.
#
# -SpecFile  JSON array of { key, names[], cmdContains }
# -Action    hide | show
# -Seconds   how long to keep watching (hide only)
param(
	[Parameter(Mandatory = $true)] [string]$SpecFile,
	[ValidateSet("hide", "show")] [string]$Action = "hide",
	[int]$Seconds = 0,
	[Parameter(Mandatory = $true)] [string]$StateFile
)

$ErrorActionPreference = "SilentlyContinue"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class WinCtl {
	delegate bool EnumProc(IntPtr h, IntPtr l);
	[DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
	[DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
	[DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
	[DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
	[DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
	[DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
	[DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
	[DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);

	// Hide every visible taskbar window owned by one of `pids`; returns their handles.
	public static List<long> Hide(HashSet<uint> pids) {
		var done = new List<long>();
		EnumWindows((h, l) => {
			uint pid; GetWindowThreadProcessId(h, out pid);
			if (!pids.Contains(pid) || !IsWindowVisible(h)) return true;
			if (GetWindowTextLength(h) == 0) return true;
			if ((GetWindowLong(h, -20) & 0x80) != 0) return true;   // tool window
			if (GetWindow(h, 4) != IntPtr.Zero) return true;        // owned by another window
			ShowWindow(h, 0);                                       // SW_HIDE
			done.Add(h.ToInt64());
			return true;
		}, IntPtr.Zero);
		return done;
	}

	// Bring a window we hid back, minimized and without taking focus.
	public static bool Restore(long handle) {
		var h = new IntPtr(handle);
		if (!IsWindow(h)) return false;
		ShowWindow(h, 7);                                           // SW_SHOWMINNOACTIVE
		return true;
	}
}
"@

function Read-State {
	$state = @{}
	if (Test-Path -LiteralPath $StateFile) {
		try {
			$raw = Get-Content -Raw -LiteralPath $StateFile -Encoding UTF8 | ConvertFrom-Json
			foreach ($p in $raw.PSObject.Properties) { $state[$p.Name] = @($p.Value) }
		} catch { }
	}
	return $state
}

function Write-State($state) {
	$dir = Split-Path -Parent $StateFile
	if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
	$json = if ($state.Count -eq 0) { "{}" } else { $state | ConvertTo-Json -Compress }
	# No BOM: Set-Content -Encoding UTF8 writes one on 5.1, and other readers of
	# this file (the panel's tests, JSON.parse) choke on it.
	[System.IO.File]::WriteAllText($StateFile, $json, (New-Object System.Text.UTF8Encoding($false)))
}

# Several of these can be running at once (a start plus the startup sweep), and
# they share one state file.
$mutex = New-Object System.Threading.Mutex($false, "Local\GodlyPanelWindowControl")

function Get-Pids($spec, $procs) {
	$set = New-Object 'System.Collections.Generic.HashSet[uint32]'
	$direct = @()
	foreach ($p in $procs) {
		if ($spec.names -contains $p.Name) {
			if ($spec.cmdContains -and -not ($p.CommandLine -and $p.CommandLine.Contains($spec.cmdContains))) { continue }
			[void]$set.Add([uint32]$p.ProcessId)
			$direct += [uint32]$p.ProcessId
		}
	}
	# Direct children too: launcher stubs and crash handlers own windows as well.
	foreach ($p in $procs) { if ($direct -contains [uint32]$p.ParentProcessId) { [void]$set.Add([uint32]$p.ProcessId) } }
	return , $set
}

# Piped through ForEach-Object so a JSON array always becomes separate items.
# Windows PowerShell 5.1 unrolls a one-element array but keeps a longer one
# wrapped, which silently broke every run with more than one server.
$specs = @(Get-Content -Raw -LiteralPath $SpecFile -Encoding UTF8 | ConvertFrom-Json | ForEach-Object { $_ })
$changed = 0

try {
	if ($Action -eq "show") {
		[void]$mutex.WaitOne(5000)
		$state = Read-State
		foreach ($spec in $specs) {
			foreach ($handle in @($state[$spec.key])) {
				if ($handle -and [WinCtl]::Restore([long]$handle)) { $changed++ }
			}
			$state.Remove($spec.key)
		}
		Write-State $state
		$mutex.ReleaseMutex()
	}
	else {
		$startUtc = (Get-Date).ToUniversalTime()
		$deadline = (Get-Date).AddSeconds($Seconds)
		do {
			$procs = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
			foreach ($spec in $specs) {
				# The owner asked for this server's window back (or changed its mode)
				# after this watcher started: stop hiding it, or the window we just
				# restored would vanish again within a second.
				if ($spec.cancelFlag -and (Test-Path -LiteralPath $spec.cancelFlag)) {
					if ((Get-Item -LiteralPath $spec.cancelFlag).LastWriteTimeUtc -gt $startUtc) { continue }
				}
				$pids = Get-Pids $spec $procs
				if ($pids.Count -eq 0) { continue }
				$hidden = [WinCtl]::Hide($pids)
				if ($hidden.Count -gt 0) {
					$changed += $hidden.Count
					[void]$mutex.WaitOne(5000)
					$state = Read-State
					$known = @($state[$spec.key])
					$state[$spec.key] = @($known + $hidden | Where-Object { $_ } | Select-Object -Unique)
					Write-State $state
					$mutex.ReleaseMutex()
				}
			}
			if ($Seconds -le 0) { break }
			Start-Sleep -Milliseconds 700
		} while ((Get-Date) -lt $deadline)
	}
}
catch {
	# Errors are otherwise swallowed (see the preference above), which is how a
	# broken run once looked exactly like a working one.
	[Console]::Error.WriteLine($_.Exception.Message)
	exit 1
}
finally {
	Remove-Item -LiteralPath $SpecFile -Force -ErrorAction SilentlyContinue
}

Write-Output (@{ changed = $changed } | ConvertTo-Json -Compress)
