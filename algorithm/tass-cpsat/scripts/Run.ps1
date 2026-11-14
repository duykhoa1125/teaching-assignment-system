param([string]$Fixture = 'fixtures\greedy-trap.json', [string]$OutputDirectory, [string]$JavaHome)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot ('output\run-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
$repoRoot=Split-Path -Parent (Split-Path -Parent $projectRoot)
. (Join-Path $repoRoot 'scripts/java17.ps1')
$JavaHome=Resolve-TassJava17 -JavaHome $JavaHome -RepositoryRoot $repoRoot
$javaCommand=Join-Path $JavaHome 'bin/java.exe'
Push-Location $projectRoot
try {
    & $javaCommand -jar 'target\tass-cpsat-0.1.0.jar' $Fixture $OutputDirectory
    if ($LASTEXITCODE -ne 0) { throw ('Solver exited with code ' + $LASTEXITCODE) }
} finally { Pop-Location }
