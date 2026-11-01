param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = 'Stop'
$runtimeRoot = Join-Path $ProjectRoot '.runtime'
if (Test-Path -LiteralPath (Join-Path $runtimeRoot 'jdk')) { throw 'Local JDK already exists; no files overwritten.' }
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$assets = Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse'
$package = $assets[0].binary.package
if ($package.link -notlike 'https://github.com/adoptium/temurin21-binaries/releases/download/*') { throw 'Unexpected JDK download host/path' }
$archive = Join-Path $runtimeRoot 'temurin21.zip'
Invoke-WebRequest -Uri $package.link -OutFile $archive
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($actual -ne $package.checksum) { throw 'JDK SHA256 mismatch; archive will not be extracted' }
Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $runtimeRoot 'jdk')
$jdk = Get-ChildItem -LiteralPath (Join-Path $runtimeRoot 'jdk') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
if (-not $jdk) { throw 'Downloaded archive did not contain a JDK' }
Write-Output ('Verified SHA256: ' + $actual)
Write-Output ('Local JDK: ' + $jdk.FullName)
& (Join-Path $jdk.FullName 'bin\java.exe') -version
if ($LASTEXITCODE -ne 0) { throw 'Local JDK failed to start' }
