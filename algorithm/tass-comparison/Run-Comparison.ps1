param([string]$FixturesDirectory,[string]$OutputDirectory,[int]$Repeats=5,[double]$Seconds=2,[string]$JavaHome)
$ErrorActionPreference='Stop'
$siblingRoot=Split-Path -Parent $PSScriptRoot
$cpRoot=Join-Path $siblingRoot 'tass-cpsat'
if (-not $FixturesDirectory) { $FixturesDirectory=Join-Path $cpRoot 'fixtures' }
if (-not $OutputDirectory) { $OutputDirectory=Join-Path $PSScriptRoot ('results\comparison-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')) }
if (-not $JavaHome) { $jdk=Get-ChildItem -LiteralPath (Join-Path $cpRoot '.runtime\jdk') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1; if ($jdk) { $JavaHome=$jdk.FullName } }
if (-not $JavaHome) { throw 'Set -JavaHome or set up the local JDK in tass-cpsat.' }
$jar=Join-Path $siblingRoot 'tass-benchmark\target\tass-benchmark-0.1.0-all.jar'
if (-not (Test-Path -LiteralPath $jar)) { throw 'Run Test-All.ps1 to build the benchmark JAR first.' }
& (Join-Path $JavaHome 'bin\java.exe') -jar $jar $FixturesDirectory $OutputDirectory $Repeats $Seconds.ToString([Globalization.CultureInfo]::InvariantCulture)
if ($LASTEXITCODE -ne 0) { throw ('Comparison failed, exit code '+$LASTEXITCODE) }
