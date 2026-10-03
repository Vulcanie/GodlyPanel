# Lists the windows that would show on the taskbar right now (visible, titled, not owned by another
# window, not a tool window), with the program that owns each. The conformance harness takes one before a
# game starts and one after, and the difference is what the game (or its start script) opened.
# Prints a JSON array: [{ handle, pid, name, path, parent, title }]
$ErrorActionPreference = "SilentlyContinue"

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class WinList {
	delegate bool EnumProc(IntPtr h, IntPtr l);
	[DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
	[DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
	[DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
	[DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
	[DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
	[DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
	[DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);

	public static List<string[]> Taskbar() {
		var found = new List<string[]>();
		EnumWindows((h, l) => {
			if (!IsWindowVisible(h)) return true;
			int len = GetWindowTextLength(h);
			if (len == 0) return true;
			if ((GetWindowLong(h, -20) & 0x80) != 0) return true;   // tool window
			if (GetWindow(h, 4) != IntPtr.Zero) return true;        // owned by another window
			uint pid; GetWindowThreadProcessId(h, out pid);
			var text = new StringBuilder(len + 1);
			GetWindowText(h, text, text.Capacity);
			found.Add(new string[] { h.ToInt64().ToString(), pid.ToString(), text.ToString() });
			return true;
		}, IntPtr.Zero);
		return found;
	}
}
"@

$procs = @{}
Get-CimInstance Win32_Process | ForEach-Object { $procs[[int]$_.ProcessId] = $_ }

$rows = @()
foreach ($w in [WinList]::Taskbar()) {
	$p = $procs[[int]$w[1]]
	$rows += [pscustomobject]@{
		handle = $w[0]
		pid    = [int]$w[1]
		name   = if ($p) { $p.Name } else { "" }
		path   = if ($p) { $p.ExecutablePath } else { "" }
		parent = if ($p) { [int]$p.ParentProcessId } else { 0 }
		title  = $w[2]
	}
}
if ($rows.Count -eq 0) { Write-Output "[]" } else { Write-Output (ConvertTo-Json -InputObject @($rows) -Compress) }
