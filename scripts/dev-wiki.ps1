[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$rebuildScript = Join-Path $PSScriptRoot 'rebuild-wiki-manifest.ps1'
$watchScript = Join-Path $PSScriptRoot 'watch-wiki-manifest.ps1'

if (-not (Test-Path -LiteralPath $rebuildScript)) {
  throw "Rebuild script not found: $rebuildScript"
}

if (-not (Test-Path -LiteralPath $watchScript)) {
  throw "Watch script not found: $watchScript"
}

& $rebuildScript
& $watchScript
