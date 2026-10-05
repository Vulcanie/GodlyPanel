# Swaps a staged GodlyPanel update into the app folder, starts the new version, and puts the old one back if the
# new one doesn't come up. Run by the app itself (electron/main/updater.cjs) from a COPY in the temp folder, because the
# folder it lives in is the one being replaced. Takes one argument: the path of a JSON plan file.
#
#   appDir, exePath, exeArgs[]   the installed app and how to start it again
#   stageDir                     the verified new files, unpacked (a `resources` folder for an app-only update, the
#                                whole app for a full one)
#   mode                         "app" replaces only `resources`; "full" replaces everything but `data`
#   version, oldVersion          what is being installed, and what was running
#   parentPid                    the app's main process, which has to exit first
#   dataDir, logFile, resultFile, healthFile
#   cleanup[]                    folders and files to delete once it worked
#   healthTimeoutSec             how long the new version gets to say it is up
#
# Game servers are separate programs and are never touched: only processes whose program is this app's own exe are closed,
# and only the top level of the app folder is changed (never `data`, where the servers' files live).
param([Parameter(Mandatory = $true)][string]$PlanFile)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
$plan = [System.IO.File]::ReadAllText($PlanFile, $utf8).TrimStart([char]0xFEFF) | ConvertFrom-Json

function Log([string]$message) {
	try {
		$dir = Split-Path -Parent $plan.logFile
		if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
		[System.IO.File]::AppendAllText($plan.logFile, ("{0} {1}`r`n" -f (Get-Date).ToString("s"), $message), $utf8)
	} catch { }
}

function Save-Result([bool]$ok, [string]$message, [bool]$rolledBack) {
	$result = [ordered]@{ ok = $ok; version = [string]$plan.version; from = [string]$plan.oldVersion; message = $message; rolledBack = $rolledBack; at = (Get-Date).ToString("o") }
	try {
		$dir = Split-Path -Parent $plan.resultFile
		if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
		[System.IO.File]::WriteAllText($plan.resultFile, ($result | ConvertTo-Json), $utf8)
	} catch { Log "Could not write the result file: $($_.Exception.Message)" }
}

# Only this app's own program, never anything else that happens to live under the folder (a game server, say).
function Get-AppProcesses {
	Get-Process -ErrorAction SilentlyContinue | Where-Object {
		try { $_.Path -and ($_.Path -ieq $plan.exePath) -and ($_.Id -ne $PID) } catch { $false }
	}
}

function Stop-AppProcesses([int]$waitSec) {
	$deadline = (Get-Date).AddSeconds($waitSec)
	while ((Get-Date) -lt $deadline -and @(Get-AppProcesses).Count -gt 0) { Start-Sleep -Milliseconds 400 }
	$left = @(Get-AppProcesses)
	if ($left.Count -gt 0) {
		Log "Closing $($left.Count) process(es) of the app that were still running."
		$left | Stop-Process -Force -ErrorAction SilentlyContinue
		Start-Sleep -Seconds 2
	}
}

function Move-WithRetry([string]$from, [string]$to) {
	for ($i = 1; $i -le 6; $i++) {
		try { Move-Item -LiteralPath $from -Destination $to -Force; return } catch {
			if ($i -eq 6) { throw }
			Start-Sleep -Milliseconds 700
		}
	}
}

function Start-App {
	Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
	$argList = @($plan.exeArgs | Where-Object { $_ })
	if ($argList.Count -gt 0) {
		$line = ($argList | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -join " "
		return Start-Process -FilePath $plan.exePath -ArgumentList $line -WorkingDirectory $plan.appDir -PassThru
	} else {
		return Start-Process -FilePath $plan.exePath -WorkingDirectory $plan.appDir -PassThru
	}
}

$appDir = [string]$plan.appDir
$backup = Join-Path $appDir ".update-backup"
$never = @("data", ".update-backup", ".update-write-test")
$moved = New-Object System.Collections.ArrayList
$placed = New-Object System.Collections.ArrayList
$script:undoFailed = $false

function Undo-Swap {
	$newest = @($placed.ToArray() | Sort-Object -Descending)
	foreach ($name in $newest) {
		try { Remove-Item -LiteralPath (Join-Path $appDir $name) -Recurse -Force -ErrorAction Stop } catch { Log "Could not remove the new $name while undoing: $($_.Exception.Message)" }
	}
	foreach ($name in $moved.ToArray()) {
		try { Move-WithRetry (Join-Path $backup $name) (Join-Path $appDir $name) } catch { $script:undoFailed = $true; Log "COULD NOT RESTORE $name from $backup : $($_.Exception.Message)" }
	}
	$placed.Clear(); $moved.Clear()
	# The backup folder is only ever removed when everything in it has gone back; otherwise it is all that is left of the old version.
	if (-not $script:undoFailed) { Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue }
}

Log "Updating $($plan.oldVersion) -> $($plan.version) ($($plan.mode)) in $appDir"

# 1. Let the app finish closing.
try { Wait-Process -Id ([int]$plan.parentPid) -Timeout 60 -ErrorAction SilentlyContinue } catch { }
Stop-AppProcesses 20

# 2. Swap by renaming, so each step is instant and can be undone.
try {
	if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
	New-Item -ItemType Directory -Force -Path $backup | Out-Null
	if ($plan.mode -eq "app") {
		$outgoing = @("resources")
	} else {
		$outgoing = @(Get-ChildItem -LiteralPath $appDir -Force | Where-Object { $never -notcontains $_.Name } | ForEach-Object { $_.Name })
	}
	$incoming = @(Get-ChildItem -LiteralPath $plan.stageDir -Force | Where-Object { $never -notcontains $_.Name -and $_.Name -ne "update-manifest.json" } | ForEach-Object { $_.Name })
	if ($incoming.Count -eq 0) { throw "The unpacked update is empty." }
	foreach ($name in $outgoing) {
		if (Test-Path -LiteralPath (Join-Path $appDir $name)) {
			Move-WithRetry (Join-Path $appDir $name) (Join-Path $backup $name)
			[void]$moved.Add($name)
		}
	}
	foreach ($name in $incoming) {
		Move-WithRetry (Join-Path $plan.stageDir $name) (Join-Path $appDir $name)
		[void]$placed.Add($name)
	}
	Log "Swapped $($incoming.Count) item(s) in."
} catch {
	Log "The swap failed: $($_.Exception.Message). Putting everything back."
	Undo-Swap
	Save-Result $false "The new files couldn't be put in place ($($_.Exception.Message)), so nothing was changed." $true
	try { Start-App } catch { Log "Could not start the old version again: $($_.Exception.Message)" }
	exit 1
}

# 3. Start the new version and wait for it to say it is up.
if (Test-Path -LiteralPath $plan.healthFile) { Remove-Item -LiteralPath $plan.healthFile -Force -ErrorAction SilentlyContinue }
$healthy = $false
$why = "it didn't start within $($plan.healthTimeoutSec) seconds"
try {
	# The process handle, so a program that dies at once is noticed at once instead of after the whole wait.
	$started = Start-App
	$deadline = (Get-Date).AddSeconds([int]$plan.healthTimeoutSec)
	while ((Get-Date) -lt $deadline) {
		if (Test-Path -LiteralPath $plan.healthFile) {
			try {
				$health = [System.IO.File]::ReadAllText($plan.healthFile, $utf8).TrimStart([char]0xFEFF) | ConvertFrom-Json
				if ([string]$health.version -eq [string]$plan.version) { $healthy = $true; break }
			} catch { }
		}
		if ($started -and $started.HasExited) {
			Start-Sleep -Milliseconds 1500   # a last look: it may have said it was up just as it closed
			if (Test-Path -LiteralPath $plan.healthFile) { continue }
			$why = "it closed again straight after starting"
			break
		}
		Start-Sleep -Milliseconds 400
	}
} catch {
	$why = $_.Exception.Message
}

if ($healthy) {
	Log "The new version is up."
	Save-Result $true "Updated from $($plan.oldVersion) to $($plan.version)." $false
	foreach ($path in @($plan.cleanup)) { if ($path) { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue } }
	Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue
	exit 0
}

# 4. It didn't come up: put the old version back.
Log "The new version did not come up ($why). Going back to $($plan.oldVersion)."
Stop-AppProcesses 3
Undo-Swap
Save-Result $false "Version $($plan.version) didn't start properly ($why), so $($plan.oldVersion) was put back." $true
try { Start-App } catch { Log "Could not start the old version again: $($_.Exception.Message)" }
foreach ($path in @($plan.cleanup)) { if ($path) { Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue } }
exit 1
