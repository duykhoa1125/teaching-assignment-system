# Repository Maven entry point. Examples: ./scripts/mvn17.ps1 -version; ./scripts/mvn17.ps1 validate
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$MavenArguments)
$ErrorActionPreference='Stop'
$tassOldJavaHome=$env:JAVA_HOME
$tassOldPath=$env:Path
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    . (Join-Path $PSScriptRoot 'use-java17.ps1')
    if(!$MavenArguments) { $MavenArguments=@('verify') }
    & mvn @MavenArguments
    if($LASTEXITCODE -ne 0) { throw "Maven failed with exit code $LASTEXITCODE. See its output above." }
} finally {
    $env:JAVA_HOME=$tassOldJavaHome
    $env:Path=$tassOldPath
    Pop-Location
}
