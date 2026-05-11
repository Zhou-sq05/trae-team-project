param(
  [string]$OutputName = 'PrivacyLdpDemo-win32-x64'
)

$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$electronDistPath = Join-Path $workspace 'node_modules\electron\dist'

if (-not (Test-Path -LiteralPath $electronDistPath)) {
  Push-Location $workspace
  try {
    node node_modules\electron\install.js
  } finally {
    Pop-Location
  }
}

$electronDist = (Resolve-Path -LiteralPath $electronDistPath).Path
$releaseRoot = Join-Path $workspace 'release'
$out = Join-Path $releaseRoot $OutputName

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

if (Test-Path -LiteralPath $out) {
  $resolvedOut = (Resolve-Path -LiteralPath $out).Path
  if (-not $resolvedOut.StartsWith($workspace)) {
    throw "Refusing to delete outside workspace: $resolvedOut"
  }
  Remove-Item -LiteralPath $resolvedOut -Recurse -Force
}

New-Item -ItemType Directory -Path $out | Out-Null
Get-ChildItem -LiteralPath $electronDist -Force |
  Where-Object { $_.Name -notin @('electron.exe', 'resources') } |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $out -Recurse -Force
  }
Copy-Item -LiteralPath (Join-Path $electronDist 'electron.exe') -Destination (Join-Path $out 'PrivacyLdpDemo.exe') -Force

$appDir = Join-Path $out 'resources\app'
New-Item -ItemType Directory -Path $appDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $workspace 'dist') -Destination $appDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $workspace 'electron') -Destination $appDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $workspace 'package.json') -Destination $appDir -Force

Write-Host "Packaged desktop app:"
Write-Host $out
