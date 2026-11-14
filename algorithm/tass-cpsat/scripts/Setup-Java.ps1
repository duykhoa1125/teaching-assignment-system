# Compatibility entry point: all modules share repository-local JDK 17.
$ErrorActionPreference='Stop'
$tassRepoRoot=Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
& (Join-Path $tassRepoRoot 'scripts/setup-java17.ps1')
