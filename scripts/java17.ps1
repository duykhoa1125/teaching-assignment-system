# Shared resolver: never silently fall back to a different Java major.
function Test-TassJava17Home([string]$Candidate) {
    if (!$Candidate) { return $false }
    if (!(Test-Path -LiteralPath (Join-Path $Candidate 'bin/java.exe')) -or
        !(Test-Path -LiteralPath (Join-Path $Candidate 'bin/javac.exe')) -or
        !(Test-Path -LiteralPath (Join-Path $Candidate 'release'))) { return $false }
    $release=Get-Content -LiteralPath (Join-Path $Candidate 'release') -Raw
    return $release -match '(?m)^JAVA_VERSION="17(?:\.|"|-)'
}
function Resolve-TassJava17([string]$JavaHome,[string]$RepositoryRoot) {
    if ($JavaHome) {
        if (!(Test-TassJava17Home $JavaHome)) { throw "Expected a complete JDK 17 at -JavaHome '$JavaHome'." }
        return [IO.Path]::GetFullPath($JavaHome)
    }
    foreach($candidate in @((Join-Path $RepositoryRoot '.runtime/jdk-17'),$env:JAVA_HOME)) {
        if(Test-TassJava17Home $candidate) { return [IO.Path]::GetFullPath($candidate) }
    }
    $compiler=Get-Command javac.exe -ErrorAction SilentlyContinue
    if($compiler) {
        $candidate=Split-Path -Parent (Split-Path -Parent $compiler.Source)
        if(Test-TassJava17Home $candidate) { return $candidate }
    }
    throw 'JDK 17 not found. Run scripts/setup-java17.ps1, set JAVA_HOME to JDK 17, or pass -JavaHome. JDK 21/23 will not be selected.'
}
function Set-TassJava17([string]$JavaHome) {
    $env:JAVA_HOME=$JavaHome
    $javaBin=Join-Path $JavaHome 'bin'
    $remaining=@($env:Path -split ';' | Where-Object { $_.TrimEnd('\','/') -ine $javaBin.TrimEnd('\','/') })
    $env:Path=(@($javaBin)+$remaining) -join ';'
}
