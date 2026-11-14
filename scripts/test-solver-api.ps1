# Runs integration tests against a NEW local PostgreSQL cluster, then verifies persisted reads in a second Maven/JVM run.
[CmdletBinding()]
param(
    [string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin',
    [string]$MavenRepository,
    [switch]$Offline
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'use-java17.ps1')
foreach ($binary in @('initdb.exe','postgres.exe','psql.exe','pg_ctl.exe')) {
    if (!(Test-Path -LiteralPath (Join-Path $PostgresBin $binary))) { throw "Missing PostgreSQL binary: $binary in $PostgresBin" }
}
if (!(Get-Command mvn -ErrorAction SilentlyContinue)) { throw 'Maven is not on PATH.' }
$runRoot = Join-Path $projectRoot ('.runtime/solver-api-tests/' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$dataPath = Join-Path $runRoot 'data'
$checkpoint = Join-Path $runRoot 'checkpoint.json'
$dbUser = 'tass_api_' + [guid]::NewGuid().ToString('N').Substring(0,8)
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback,0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$server = $null
Push-Location $projectRoot
try {
    & (Join-Path $PostgresBin 'initdb.exe') -D $dataPath -U $dbUser -A trust --no-locale -E UTF8 *> (Join-Path $runRoot 'initdb.log')
    if ($LASTEXITCODE -ne 0) { throw "initdb failed; see $runRoot" }
    $server = Start-Process -FilePath (Join-Path $PostgresBin 'postgres.exe') -ArgumentList @('-D',('"{0}"' -f $dataPath),'-h','127.0.0.1','-p',"$port") -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'postgres.out.log') -RedirectStandardError (Join-Path $runRoot 'postgres.err.log')
    $connection = @('-X','-h','127.0.0.1','-p',"$port",'-U',$dbUser,'-d','postgres','-v','ON_ERROR_STOP=1')
    $ready = $false
    for ($attempt=0; $attempt -lt 100; $attempt++) {
        if ($server.HasExited) { throw "PostgreSQL exited; see $runRoot" }
        & (Join-Path $PostgresBin 'psql.exe') @connection -qAtc 'SELECT 1' *> (Join-Path $runRoot 'ready.log')
        if ($LASTEXITCODE -eq 0) { $ready=$true; break }
        Start-Sleep -Milliseconds 100
    }
    if (!$ready) { throw "Temporary PostgreSQL did not become ready; see $runRoot" }
    foreach ($source in @('01_schema.sql','02_seed.sql')) {
        & (Join-Path $PostgresBin 'psql.exe') @connection -f (Join-Path $projectRoot "backend/sql/$source") *> (Join-Path $runRoot "$source.log")
        if ($LASTEXITCODE -ne 0) { throw "Schema/seed failed: $source; see $runRoot" }
    }
    $common = @('-B',"-Dplan.test.url=jdbc:postgresql://127.0.0.1:$port/postgres","-Dplan.test.user=$dbUser")
    if ($Offline) { $common += '-o' }
    if ($MavenRepository) { $common += "-Dmaven.repo.local=$MavenRepository" }
    & mvn @common verify '-Dplan.integration=true' "-Dsolver.e2e.artifact=$checkpoint" 2>&1 | Tee-Object -FilePath (Join-Path $runRoot 'verify.log')
    if ($LASTEXITCODE -ne 0) { throw "Maven verify failed; see $runRoot/verify.log" }
    # Other integration fixtures legitimately bump source tokens. Export only after the full suite.
    & mvn @common -pl backend -am verify '-Dplan.integration=true' '-Dtest=SolverRunPostgresTest#newCoordinatorRecoversInterruptedRunsAndRejectsSecondOwner' '-Dsurefire.failIfNoSpecifiedTests=false' "-Dsolver.e2e.artifact=$checkpoint" 2>&1 | Tee-Object -FilePath (Join-Path $runRoot 'checkpoint-verify.log')
    if ($LASTEXITCODE -ne 0) { throw "Checkpoint export failed; see $runRoot/checkpoint-verify.log" }
    if (!(Test-Path -LiteralPath $checkpoint)) { throw 'E2E test did not produce the restart checkpoint.' }
    & mvn @common -pl backend -am verify '-Dtest=PlanResultRestartPostgresTest' '-Dsurefire.failIfNoSpecifiedTests=false' "-Dsolver.replay.checkpoint=$checkpoint" 2>&1 | Tee-Object -FilePath (Join-Path $runRoot 'restart-verify.log')
    if ($LASTEXITCODE -ne 0) { throw "Restart read test failed; see $runRoot/restart-verify.log" }
    # The original CRUD suite expects a seed-sized database (its list checks use the first page).
    $crudDatabase = 'crud_verify_' + [guid]::NewGuid().ToString('N')
    & (Join-Path $PostgresBin 'psql.exe') @connection -qAtc "CREATE DATABASE $crudDatabase" *> (Join-Path $runRoot 'crud-create.log')
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create separate CRUD test database.' }
    $crudConnection = @('-X','-h','127.0.0.1','-p',"$port",'-U',$dbUser,'-d',$crudDatabase,'-v','ON_ERROR_STOP=1')
    foreach ($source in @('01_schema.sql','02_seed.sql')) {
        & (Join-Path $PostgresBin 'psql.exe') @crudConnection -f (Join-Path $projectRoot "backend/sql/$source") *> (Join-Path $runRoot "crud-$source.log")
        if ($LASTEXITCODE -ne 0) { throw "CRUD schema/seed failed: $source" }
    }
    & mvn @common -pl backend -am verify '-Dtest=PostgresCrudIntegrationTest' '-Dsurefire.failIfNoSpecifiedTests=false' '-Ddb.integration=true' "-Dspring.datasource.url=jdbc:postgresql://127.0.0.1:$port/$crudDatabase" "-Dspring.datasource.username=$dbUser" '-Dspring.datasource.password=' 2>&1 | Tee-Object -FilePath (Join-Path $runRoot 'crud-verify.log')
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL CRUD tests failed; see $runRoot/crud-verify.log" }
    Write-Host "Solver API and restart reads passed. Logs: $runRoot"
} finally {
    if ($server -and !$server.HasExited) {
        & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath -m fast -w -t 15 stop *> (Join-Path $runRoot 'stop.log')
    }
    Pop-Location
}
