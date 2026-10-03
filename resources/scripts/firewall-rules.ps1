# Every enabled inbound "allow" rule in Windows Firewall, with what it covers. Read-only.
#
# Read through the firewall's COM interface (the same one the Windows Firewall control panel uses) rather than
# the Get-NetFirewall*Filter cmdlets. Those refuse a bulk read for an account that isn't an administrator
# ("Access is denied"), and an earlier version of this script hid that error: every rule then came back with no
# port, protocol or address, which reads as "covers everything". The COM interface is readable by any account
# and lists several hundred rules in a fraction of a second.
$ErrorActionPreference = 'Stop'

$IN = 1        # NET_FW_RULE_DIR_IN
$ALLOW = 1     # NET_FW_ACTION_ALLOW

function Format-Profiles([int]$bits) {
	# 1 = Domain, 2 = Private, 4 = Public; all of them (or -1) means every network.
	if ($bits -eq -1 -or $bits -ge 0x7FFFFFFF -or ($bits -band 7) -eq 7) { return 'Any' }
	$names = @()
	if ($bits -band 1) { $names += 'Domain' }
	if ($bits -band 2) { $names += 'Private' }
	if ($bits -band 4) { $names += 'Public' }
	return ($names -join ', ')
}

function Format-Protocol([int]$p) {
	switch ($p) { 256 { 'Any' } 6 { 'TCP' } 17 { 'UDP' } default { [string]$p } }
}

# "*", blank and null all mean "not limited".
function Any-If-Blank($value) {
	$text = [string]$value
	if ([string]::IsNullOrWhiteSpace($text) -or $text -eq '*') { return 'Any' }
	return $text
}

$policy = New-Object -ComObject HNetCfg.FwPolicy2
$out = foreach ($r in $policy.Rules) {
	if (-not $r.Enabled -or $r.Direction -ne $IN -or $r.Action -ne $ALLOW) { continue }
	$interfaces = @($r.Interfaces | Where-Object { $_ } | ForEach-Object { [string]$_ })
	[pscustomobject]@{
		name = [string]$r.Name
		profile = Format-Profiles $r.Profiles
		protocol = Format-Protocol $r.Protocol
		localPort = @(Any-If-Blank $r.LocalPorts)
		program = Any-If-Blank $r.ApplicationName
		package = [string]$r.LocalAppPackageId
		service = Any-If-Blank $r.ServiceName
		remote = @(Any-If-Blank $r.RemoteAddresses)
		# A rule for one of this PC's own addresses (Tailscale's is for its 100.x address), one network adapter or
		# one kind of connection covers only that traffic, not the other connections where friends arrive.
		localAddress = @(Any-If-Blank $r.LocalAddresses)
		interfaces = $(if ($interfaces.Count -gt 0) { $interfaces } else { @('Any') })
		interfaceType = Any-If-Blank $r.InterfaceTypes
		# A rule tied to one user or to one app's own traffic says nothing about a game server.
		restricted = [bool]($r.LocalUserOwner -or $r.LocalUserAuthorizedList)
	}
}
ConvertTo-Json -InputObject @($out) -Compress -Depth 4
