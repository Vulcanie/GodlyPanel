# Launches a script as a genuinely independent, fully hidden process — no
# visible window at any point, not even a brief flash (unlike `start /MIN`,
# which still activates the window for an instant before minimizing it).
# Used by services/serverControl.js's startServer() for every game server.
#
# Invoked with each value as its own PowerShell parameter (-ScriptPath X
# -WorkingDir Y) rather than building one big quoted command string in
# Node — Node's child_process.spawn() on Windows has to translate an args
# array into a single Win32 command line itself, and that translation does
# not reliably survive a value that already contains nested single- and
# double-quotes (confirmed directly: the same Start-Process call that works
# fine run manually silently produces no process at all when Node passes it
# as a -Command string). Plain parameters have no such nesting to mangle.
param(
	[Parameter(Mandatory = $true)]
	[string]$ScriptPath,

	[Parameter(Mandatory = $false)]
	[string]$WorkingDir
)

$startArgs = @{
	FilePath     = "cmd.exe"
	ArgumentList = "/c `"$ScriptPath`""
	WindowStyle  = "Hidden"
}

if ($WorkingDir) {
	$startArgs["WorkingDirectory"] = $WorkingDir
}

Start-Process @startArgs
