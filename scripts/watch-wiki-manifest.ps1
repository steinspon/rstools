[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $repoRoot 'wiki/content'
$rebuildScript = Join-Path $PSScriptRoot 'rebuild-wiki-manifest.ps1'

if (-not (Test-Path -LiteralPath $contentRoot)) {
  throw "Wiki content directory not found: $contentRoot"
}

if (-not (Test-Path -LiteralPath $rebuildScript)) {
  throw "Rebuild script not found: $rebuildScript"
}

$script:pendingRebuild = $false
$script:lastRebuildUtc = [DateTime]::MinValue

function Invoke-WikiRebuild {
  $script:lastRebuildUtc = [DateTime]::UtcNow
  & $rebuildScript
}

Write-Host "Watching wiki markdown files under: $contentRoot"
Write-Host "Press Ctrl+C to stop."

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $contentRoot
$watcher.Filter = '*.md'
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, CreationTime, DirectoryName'
$watcher.EnableRaisingEvents = $true

$handlers = @()
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier 'WikiMdCreated'
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier 'WikiMdChanged'
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Deleted -SourceIdentifier 'WikiMdDeleted'
$handlers += Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier 'WikiMdRenamed'

try {
  Invoke-WikiRebuild

  while ($true) {
    $eventRecord = Wait-Event -Timeout 1
    if ($eventRecord) {
      $script:pendingRebuild = $true
      Remove-Event -EventIdentifier $eventRecord.EventIdentifier -ErrorAction SilentlyContinue
    }

    if (-not $script:pendingRebuild) {
      continue
    }

    $elapsedMs = ([DateTime]::UtcNow - $script:lastRebuildUtc).TotalMilliseconds
    if ($elapsedMs -lt 400) {
      continue
    }

    $script:pendingRebuild = $false
    Write-Host "Detected wiki markdown change. Rebuilding..."
    Invoke-WikiRebuild
  }
}
finally {
  foreach ($handler in $handlers) {
    Unregister-Event -SourceIdentifier $handler.SourceIdentifier -ErrorAction SilentlyContinue
    Remove-Job -Id $handler.Id -Force -ErrorAction SilentlyContinue
  }

  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()
}
