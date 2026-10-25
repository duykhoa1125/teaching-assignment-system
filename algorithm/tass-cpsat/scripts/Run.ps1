param([string]$Fixture = 'fixtures\greedy-trap.json', [string]$OutputDirectory, [string]$JavaHome)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $projectRoot ('output\run-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
if (-not $JavaHome) {
    $jdkRoot = Join-Path $projectRoot '.runtime\jdk'
    if (Test-Path -LiteralPath $jdkRoot) {
        $jdk = Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
        if ($jdk) { $JavaHome = $jdk.FullName }
    }
}
$javaCommand = if ($JavaHome) { Join-Path $JavaHome 'bin\java.exe' } elseif ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME 'bin\java.exe' } else { 'java.exe' }
Push-Location $projectRoot
try {
    & $javaCommand -jar 'target\tass-cpsat-0.1.0.jar' $Fixture $OutputDirectory
    if ($LASTEXITCODE -ne 0) { throw ('Solver exited with code ' + $LASTEXITCODE) }
} finally { Pop-Location }
