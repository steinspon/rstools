[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$contentRoot = Join-Path $repoRoot 'wiki/content'
$dataRoot = Join-Path $repoRoot 'wiki/data'
$manifestPath = Join-Path $dataRoot 'content-manifest.json'
$fallbackPath = Join-Path $dataRoot 'wiki-fallback.js'

if (-not (Test-Path -LiteralPath $contentRoot)) {
  throw "Wiki content directory not found: $contentRoot"
}

New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null

function Convert-ToPosixPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return ($Path -replace '\\', '/')
}

function Get-RelativePosixPath {
  param(
    [Parameter(Mandatory = $true)][string]$BasePath,
    [Parameter(Mandatory = $true)][string]$Path
  )

  $resolvedBase = (Resolve-Path -LiteralPath $BasePath).Path.TrimEnd('\')
  $resolvedPath = (Resolve-Path -LiteralPath $Path).Path

  if (-not $resolvedPath.StartsWith($resolvedBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Path '$resolvedPath' is not under base '$resolvedBase'."
  }

  $relative = $resolvedPath.Substring($resolvedBase.Length).TrimStart('\')
  return Convert-ToPosixPath -Path $relative
}

function Get-FirstH1 {
  param([Parameter(Mandatory = $true)][string]$Markdown)

  foreach ($line in ($Markdown -split "`r?`n")) {
    if ($line -match '^#\s+(.+?)\s*$') {
      return $Matches[1].Trim()
    }
  }

  return ''
}

function Get-TitleFromFileName {
  param([Parameter(Mandatory = $true)][string]$File)

  $name = [System.IO.Path]::GetFileNameWithoutExtension($File)
  $title = ($name -replace '[-_]+', ' ' -replace '\s+', ' ').Trim()
  if ([string]::IsNullOrWhiteSpace($title)) {
    return 'Untitled'
  }

  return $title
}

$files = Get-ChildItem -LiteralPath $contentRoot -File -Recurse -Filter '*.md' |
  Sort-Object -Property @{ Expression = { $_.FullName.ToLowerInvariant() } }

$pages = @()
$pageContent = @{}

foreach ($fileInfo in $files) {
  $relative = Get-RelativePosixPath -BasePath $contentRoot -Path $fileInfo.FullName

  $folder = ''
  $lastSlash = $relative.LastIndexOf('/')
  if ($lastSlash -ge 0) {
    $folder = $relative.Substring(0, $lastSlash)
  }

  $content = [string](Get-Content -LiteralPath $fileInfo.FullName -Raw -Encoding UTF8)
  $title = Get-FirstH1 -Markdown $content
  if ([string]::IsNullOrWhiteSpace($title)) {
    $title = Get-TitleFromFileName -File $relative
  }

  $pages += [PSCustomObject]@{
    file = $relative
    title = $title
    folder = $folder
  }

  $pageContent[$relative] = $content
}

$manifest = [ordered]@{
  title = 'RSTools Wiki Content Manifest'
  generatedAt = [DateTime]::UtcNow.ToString('o')
  pages = $pages
}

$manifestJson = $manifest | ConvertTo-Json -Depth 10
Set-Content -LiteralPath $manifestPath -Value $manifestJson -Encoding UTF8

$manifestCompactJson = $manifest | ConvertTo-Json -Depth 10 -Compress
$pageKeys = $pageContent.Keys | Sort-Object -Property { $_.ToLowerInvariant() }

$pageEntries = foreach ($key in $pageKeys) {
  $jsonKey = ConvertTo-Json -InputObject $key -Compress
  $jsonValue = ConvertTo-Json -InputObject ([string]$pageContent[$key]) -Compress
  "    ${jsonKey}: $jsonValue"
}

$pagesObjectJson = if ($pageEntries.Count -gt 0) {
  "{`n$($pageEntries -join ",`n")`n  }"
}
else {
  "{}"
}

$fallbackJs = @"
window.WIKI_FALLBACK = {
  "manifest": $manifestCompactJson,
  "pages": $pagesObjectJson
};
"@
Set-Content -LiteralPath $fallbackPath -Value $fallbackJs -Encoding UTF8

Write-Host "Rebuilt wiki manifest with $($pages.Count) pages."
Write-Host "- $manifestPath"
Write-Host "- $fallbackPath"
