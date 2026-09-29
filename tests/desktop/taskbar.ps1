# Lists the windows that would appear on the taskbar, one per line, as
# "<process name>|<window title>". The owner of a console window is often
# conhost.exe rather than the program, so the title is reported too and callers
# can match on either.
Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class TaskbarList {
	delegate bool EnumProc(IntPtr h, IntPtr l);
	[DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
	[DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
	[DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
	[DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
	[DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
	[DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
	public static List<string> Windows() {
		var r = new List<string>();
		EnumWindows((h, l) => {
			if (!IsWindowVisible(h)) return true;
			var t = new StringBuilder(512); GetWindowText(h, t, 512);
			if (t.Length == 0) return true;
			if ((GetWindowLong(h, -20) & 0x80) != 0) return true;   // tool window
			if (GetWindow(h, 4) != IntPtr.Zero) return true;        // owned by another window
			uint pid; GetWindowThreadProcessId(h, out pid);
			r.Add(pid + "|" + t);
			return true;
		}, IntPtr.Zero);
		return r;
	}
}
"@
$names = @{}
Get-Process | ForEach-Object { $names[[uint32]$_.Id] = $_.ProcessName }
[TaskbarList]::Windows() | ForEach-Object {
	$pidText, $title = $_ -split '\|', 2
	"{0}|{1}" -f $names[[uint32]$pidText], $title
}
