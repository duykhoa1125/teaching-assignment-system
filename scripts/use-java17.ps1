# Dot-source to select JDK 17 in this PowerShell session. No machine/user settings are changed.
param([string]$JavaHome)
. (Join-Path $PSScriptRoot 'java17.ps1')
$tassSelectedJava=Resolve-TassJava17 -JavaHome $JavaHome -RepositoryRoot (Split-Path -Parent $PSScriptRoot)
Set-TassJava17 $tassSelectedJava
Write-Host "JAVA_HOME=$tassSelectedJava (this PowerShell session only)"
