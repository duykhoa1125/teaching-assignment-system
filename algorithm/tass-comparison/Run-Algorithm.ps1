param([Parameter(Mandatory=$true)][ValidateSet('CP_SAT','GREEDY','GENETIC')][string]$Algorithm,[string]$Fixture,[string]$OutputDirectory,[string]$JavaHome)
$ErrorActionPreference='Stop'
$siblingRoot=Split-Path -Parent $PSScriptRoot
$cpRoot=Join-Path $siblingRoot 'tass-cpsat'
if (-not $Fixture) { $Fixture=Join-Path $cpRoot 'fixtures\greedy-trap.json' }
$repoRoot=Split-Path -Parent $siblingRoot
. (Join-Path $repoRoot 'scripts/java17.ps1')
$JavaHome=Resolve-TassJava17 -JavaHome $JavaHome -RepositoryRoot $repoRoot
$module=@{CP_SAT='tass-cpsat';GREEDY='tass-greedy';GENETIC='tass-genetic'}[$Algorithm]
$moduleRoot=Join-Path $siblingRoot $module
$jarName=if ($Algorithm -eq 'CP_SAT') { 'tass-cpsat-0.1.0.jar' } else { $module+'-0.1.0-all.jar' }
$jar=Join-Path $moduleRoot ('target\'+$jarName)
if (-not (Test-Path -LiteralPath $jar)) { throw 'Run tass-comparison\Test-All.ps1 first.' }
if (-not $OutputDirectory) { $OutputDirectory=Join-Path $moduleRoot ('output\run-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
& (Join-Path $JavaHome 'bin\java.exe') -jar $jar $Fixture $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw ('Algorithm exited with code '+$LASTEXITCODE) }
