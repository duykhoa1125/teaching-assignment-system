param([string]$JavaHome, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$repoRoot=Split-Path -Parent (Split-Path -Parent $projectRoot)
. (Join-Path $repoRoot 'scripts/java17.ps1')
$JavaHome=Resolve-TassJava17 -JavaHome $JavaHome -RepositoryRoot $repoRoot
$oldPath=$env:Path
$oldJavaHome = $env:JAVA_HOME
Push-Location $projectRoot
try {
    Set-TassJava17 $JavaHome
    $arguments = @('-B','-ntp',('-Dmaven.repo.local=' + (Join-Path $projectRoot '.m2')),'verify')
    if ($Offline) { $arguments += '-o' }
    & mvn.cmd @arguments
    if ($LASTEXITCODE -ne 0) { throw 'Maven verification failed' }
} finally { $env:JAVA_HOME = $oldJavaHome; $env:Path=$oldPath; Pop-Location }
