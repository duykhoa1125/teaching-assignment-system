param([string]$JavaHome, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $JavaHome) {
    $jdkRoot = Join-Path $projectRoot '.runtime\jdk'
    if (Test-Path -LiteralPath $jdkRoot) {
        $jdk = Get-ChildItem -LiteralPath $jdkRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
        if ($jdk) { $JavaHome = $jdk.FullName }
    }
}
$oldJavaHome = $env:JAVA_HOME
Push-Location $projectRoot
try {
    if ($JavaHome) { $env:JAVA_HOME = $JavaHome }
    $arguments = @('-B','-ntp',('-Dmaven.repo.local=' + (Join-Path $projectRoot '.m2')),'verify')
    if ($Offline) { $arguments += '-o' }
    & mvn.cmd @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Maven verification failed' }
} finally { $env:JAVA_HOME = $oldJavaHome; Pop-Location }
