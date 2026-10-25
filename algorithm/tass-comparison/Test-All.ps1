param([ValidateSet('ALL','GREEDY','GENETIC','CP_SAT')][string]$Algorithm='ALL',[switch]$Offline,[string]$JavaHome)
$ErrorActionPreference='Stop'
$siblingRoot=Split-Path -Parent $PSScriptRoot
$cpRoot=Join-Path $siblingRoot 'tass-cpsat'
if (-not $JavaHome) {
    $jdk=Get-ChildItem -LiteralPath (Join-Path $cpRoot '.runtime\jdk') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
    if (-not $jdk) { throw 'Set -JavaHome or run tass-cpsat\scripts\Setup-Java.ps1 first.' }
    $JavaHome=$jdk.FullName
}
$oldJavaHome=$env:JAVA_HOME
Push-Location $PSScriptRoot
try {
    $env:JAVA_HOME=$JavaHome
    $mavenArguments=@('-B','-ntp',('-Dmaven.repo.local='+(Join-Path $cpRoot '.m2')),'verify')
    if ($Offline) { $mavenArguments+='-o' }
    $module=@{GREEDY=':tass-greedy';GENETIC=':tass-genetic';CP_SAT=':tass-benchmark'}
    if ($Algorithm -ne 'ALL') { $mavenArguments+=@('-pl',$module[$Algorithm],'-am') }
    & mvn.cmd @mavenArguments
    if ($LASTEXITCODE -ne 0) { throw 'Comparison tests/build failed.' }
    $summary=foreach ($name in @('tass-cpsat','tass-greedy','tass-genetic','tass-benchmark')) {
        foreach ($reportType in @('surefire-reports','failsafe-reports')) {
            $reportDirectory=Join-Path $siblingRoot ($name+'\target\'+$reportType)
            if (Test-Path -LiteralPath $reportDirectory) {
                Get-ChildItem -LiteralPath $reportDirectory -Filter 'TEST-*.xml' | ForEach-Object {
                    [xml]$xml=Get-Content -Raw -LiteralPath $_.FullName
                    [PSCustomObject]@{Module=$name;Suite=$xml.testsuite.name;Tests=$xml.testsuite.tests;Failures=$xml.testsuite.failures;Errors=$xml.testsuite.errors;Skipped=$xml.testsuite.skipped;Seconds=$xml.testsuite.time}
                }
            }
        }
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'results') | Out-Null
    $summary | Export-Csv -LiteralPath (Join-Path $PSScriptRoot 'results\test-summary.csv') -NoTypeInformation -Encoding UTF8
    $summary | Format-Table -AutoSize
} finally { $env:JAVA_HOME=$oldJavaHome; Pop-Location }
