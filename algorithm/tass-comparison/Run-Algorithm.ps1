param([Parameter(Mandatory=$true)][ValidateSet('CP_SAT','GREEDY','GENETIC')][string]$Algorithm,[string]$Fixture,[string]$OutputDirectory,[string]$JavaHome)
$ErrorActionPreference='Stop'
$siblingRoot=Split-Path -Parent $PSScriptRoot
$cpRoot=Join-Path $siblingRoot 'tass-cpsat'
if (-not $Fixture) { $Fixture=Join-Path $cpRoot 'fixtures\greedy-trap.json' }
if (-not $JavaHome) { $jdk=Get-ChildItem -LiteralPath (Join-Path $cpRoot '.runtime\jdk') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1; if ($jdk) { $JavaHome=$jdk.FullName } }
if (-not $JavaHome) { throw 'Set -JavaHome or set up the local JDK in tass-cpsat.' }
$module=@{CP_SAT='tass-cpsat';GREEDY='tass-greedy';GENETIC='tass-genetic'}[$Algorithm]
$moduleRoot=Join-Path $siblingRoot $module
$jarName=if ($Algorithm -eq 'CP_SAT') { 'tass-cpsat-0.1.0.jar' } else { $module+'-0.1.0-all.jar' }
$jar=Join-Path $moduleRoot ('target\'+$jarName)
if (-not (Test-Path -LiteralPath $jar)) { throw 'Run tass-comparison\Test-All.ps1 first.' }
if (-not $OutputDirectory) { $OutputDirectory=Join-Path $moduleRoot ('output\run-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
& (Join-Path $JavaHome 'bin\java.exe') -jar $jar $Fixture $OutputDirectory
if ($LASTEXITCODE -ne 0) { throw ('Algorithm exited with code '+$LASTEXITCODE) }
