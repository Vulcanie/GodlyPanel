$ErrorActionPreference = 'SilentlyContinue'
# Every enabled inbound "allow" rule in Windows Firewall, with what it covers. Read-only.
$rules = Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow
$ports = @{}
Get-NetFirewallPortFilter -All | ForEach-Object { $ports[$_.InstanceID] = $_ }
$apps = @{}
Get-NetFirewallApplicationFilter -All | ForEach-Object { $apps[$_.InstanceID] = $_ }
$addresses = @{}
Get-NetFirewallAddressFilter -All | ForEach-Object { $addresses[$_.InstanceID] = $_ }
$services = @{}
Get-NetFirewallServiceFilter -All | ForEach-Object { $services[$_.InstanceID] = $_ }
$out = foreach ($r in $rules) {
	$p = $ports[$r.InstanceID]
	$a = $apps[$r.InstanceID]
	$d = $addresses[$r.InstanceID]
	$s = $services[$r.InstanceID]
	[pscustomobject]@{
		name = [string]$r.DisplayName
		profile = [string]$r.Profile
		protocol = [string]$p.Protocol
		localPort = @($p.LocalPort | ForEach-Object { [string]$_ })
		program = [string]$a.Program
		package = [string]$a.Package
		service = [string]$s.Service
		remote = @($d.RemoteAddress | ForEach-Object { [string]$_ })
		# A rule tied to one user or to one app's own traffic says nothing about a game server.
		restricted = [bool](($r.Owner) -or ($r.LocalOnlyMapping))
	}
}
ConvertTo-Json -InputObject @($out) -Compress -Depth 4
