# Download a project-local JDK. No administrator access or machine environment changes.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.runtime'))
$jdkRoot = Join-Path $runtimeRoot 'jdk-17'
$javaExecutable = Join-Path $jdkRoot 'bin/java.exe'
$javacExecutable = Join-Path $jdkRoot 'bin/javac.exe'

if (Test-Path -LiteralPath $jdkRoot) {
    if (!(Test-Path -LiteralPath $javaExecutable) -or !(Test-Path -LiteralPath $javacExecutable)) {
        throw "Existing $jdkRoot is incomplete. Inspect it before retrying; it will not be overwritten."
    }
    $release = Get-Content -LiteralPath (Join-Path $jdkRoot 'release') -Raw
    if ($release -notmatch '(?m)^JAVA_VERSION="17(?:\.|"|-)') {
        throw "Existing $jdkRoot is not JDK 17. It will not be overwritten."
    }
    Write-Host "JDK 17 already available: $jdkRoot"
    return
}

New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$stageRoot = Join-Path $runtimeRoot ('java17-install-' + [Guid]::NewGuid().ToString('N'))
$archivePath = $stageRoot + '.zip'
$runtimePrefix = $runtimeRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar

# Validate every temporary directory before moving/deleting its contents.
function Assert-UnderRuntime([string] $candidate) {
    $absolute = [IO.Path]::GetFullPath($candidate)
    if (!$absolute.StartsWith($runtimePrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside the project runtime directory: $absolute"
    }
}
Assert-UnderRuntime $stageRoot
Assert-UnderRuntime $archivePath
Assert-UnderRuntime $jdkRoot

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
try {
    $endpoint = 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
    $releases = @(Invoke-RestMethod -Uri $endpoint -TimeoutSec 60)
    $package = $releases[0].binary.package
    if ($null -eq $package -or $package.checksum -notmatch '^[a-fA-F0-9]{64}$' -or $package.link -notlike 'https://*') {
        throw 'Adoptium did not return a JDK package with a SHA-256 checksum.'
    }
    Write-Host "Downloading $($package.name)..."
    Invoke-WebRequest -Uri $package.link -OutFile $archivePath -UseBasicParsing -TimeoutSec 600
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ine $package.checksum) {
        throw 'JDK download checksum mismatch.'
    }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $stageRoot
    $candidates = @(Get-ChildItem -LiteralPath $stageRoot -Directory | Where-Object {
        (Test-Path -LiteralPath (Join-Path $_.FullName 'bin/java.exe')) -and
        (Test-Path -LiteralPath (Join-Path $_.FullName 'bin/javac.exe'))
    })
    if ($candidates.Count -ne 1) { throw 'Expected exactly one extracted JDK directory.' }
    $candidateRoot = $candidates[0].FullName
    Assert-UnderRuntime $candidateRoot
    $release = Get-Content -LiteralPath (Join-Path $candidateRoot 'release') -Raw
    if ($release -notmatch '(?m)^JAVA_VERSION="17(?:\.|"|-)') { throw 'Downloaded package is not JDK 17.' }
    Move-Item -LiteralPath $candidateRoot -Destination $jdkRoot
    Write-Host "Installed project JDK 17: $jdkRoot"
    Write-Host 'Activate it in this terminal: . .\scripts\use-java17.ps1'
} finally {
    if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
    if (Test-Path -LiteralPath $stageRoot) {
        Assert-UnderRuntime $stageRoot
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}
