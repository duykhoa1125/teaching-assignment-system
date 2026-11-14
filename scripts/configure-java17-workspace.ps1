# Generate machine-local IDE paths without committing them to shared settings.
param([string]$JavaHome)
$ErrorActionPreference='Stop'
$tassRepoRoot=Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'java17.ps1')
$tassJava=Resolve-TassJava17 -JavaHome $JavaHome -RepositoryRoot $tassRepoRoot
$tassLocalDir=Join-Path $tassRepoRoot '.runtime'
New-Item -ItemType Directory -Force -Path $tassLocalDir|Out-Null
$tassWorkspace=Join-Path $tassLocalDir 'tass-java17.code-workspace'
$tassConfig=@{
    folders=@(@{path='..'})
    settings=@{
        'java.configuration.runtimes'=@(@{name='JavaSE-17';path=$tassJava;default=$true})
        'terminal.integrated.env.windows'=@{JAVA_HOME=$tassJava;PATH=((Join-Path $tassJava 'bin')+';${env:PATH}')}
        'maven.terminal.useJavaHome'=$false
        'maven.terminal.customEnv'=@(@{environmentVariable='JAVA_HOME';value=$tassJava})
    }
}
$tassConfig|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $tassWorkspace -Encoding UTF8
Write-Host "Created local Java 17 workspace: $tassWorkspace"
Write-Host "Open in VS Code: code `"$tassWorkspace`""
