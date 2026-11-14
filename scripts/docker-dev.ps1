[CmdletBinding()]
param([ValidateSet('up','down','status','logs','smoke','test','backup','migrate','config')][string]$Action='up')
$ErrorActionPreference='Stop'
$repoRoot=Split-Path -Parent $PSScriptRoot
if (!(Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker CLI is missing. Install Docker Desktop and enable its Linux engine.' }
Push-Location $repoRoot
try {
    if (!(Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env'; Write-Host 'Created .env with local demo defaults; review it before sharing.' }
    $compose=@('compose','-p','tass-dev','-f',(Join-Path $repoRoot 'compose.yaml'),'--env-file',(Join-Path $repoRoot '.env'))
    function Invoke-Compose {
        param([string[]]$Arguments)
        & docker @compose @Arguments
        if ($LASTEXITCODE -ne 0) { throw "Docker Compose action failed. Inspect the output above; project is tass-dev." }
    }
    function Assert-PublishedPorts {
        # Resolve the actual configuration: process environment can override .env.
        $configJson=& docker @compose config --format json
        if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve Compose port mappings.' }
        $config=($configJson -join "`n") | ConvertFrom-Json
        $runningJson=& docker ps --format '{{json .}}'
        if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect running containers for port conflicts.' }
        $running=@($runningJson | Where-Object { $_ } | ForEach-Object { $_ | ConvertFrom-Json })
        $conflicts=@()
        foreach($service in @('postgres','backend','frontend')) {
            foreach($mapping in $config.services.$service.ports) {
                $hostPort=[int]$mapping.published
                $hostAddress=$mapping.host_ip
                Write-Host "Port: $service $hostAddress`:$hostPort -> $($mapping.target)"
                $owners=@($running | Where-Object { $_.Ports -match ":${hostPort}->\d+/tcp" })
                $foreign=@($owners | Where-Object {
                    $labels=@($_.Labels -split ',')
                    $labels -notcontains 'com.docker.compose.project=tass-dev' -or
                    $labels -notcontains "com.docker.compose.service=$service"
                })
                if ($foreign.Count -gt 0) {
                    $conflicts+="$service port $hostPort is used by container(s): $(($foreign.Names) -join ', ')"
                } elseif ($owners.Count -eq 0) {
                    $listener=$null
                    try {
                        $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($hostAddress),$hostPort)
                        $listener.Server.ExclusiveAddressUse=$true
                        $listener.Start()
                    } catch {
                        $conflicts+="$service port $hostPort cannot be bound on $hostAddress (host process or reserved port)"
                    } finally {
                        if ($null -ne $listener) { $listener.Stop() }
                    }
                }
            }
        }
        if ($conflicts.Count -gt 0) {
            throw (($conflicts -join "`n")+"`nChoose free ports in .env; check POSTGRES_PORT/BACKEND_PORT/FRONTEND_PORT in this terminal's environment too. No containers were changed.")
        }
    }
    function Invoke-Smoke {
        $uiBinding=(& docker @compose port frontend 80).Trim()
        if ($LASTEXITCODE -ne 0 -or $uiBinding -notmatch '^127\.0\.0\.1:\d+$') { throw 'Frontend has no loopback port mapping.' }
        $apiBinding=(& docker @compose port backend 8080).Trim()
        if ($LASTEXITCODE -ne 0 -or $apiBinding -notmatch '^127\.0\.0\.1:\d+$') { throw 'Backend has no loopback port mapping.' }
        $uiOrigin="http://$uiBinding"; $apiOrigin="http://$apiBinding"
        $health=Invoke-RestMethod "$apiOrigin/internal/health" -TimeoutSec 15
        if ($health.status -ne 'UP') { throw 'Backend is not ready.' }
        $schema=Invoke-RestMethod "$uiOrigin/v3/api-docs" -TimeoutSec 30
        if ($schema.info.title -ne 'TASS Backend API') { throw 'Frontend proxy did not return the expected OpenAPI document.' }
        foreach($path in @('/api/teachers','/api/plan-versions/{id}/solver-runs','/api/plan-versions/{id}/validation')) {
            if ($schema.paths.PSObject.Properties.Name -notcontains $path) { throw "Missing OpenAPI route: $path" }
        }
        $page=Invoke-WebRequest $uiOrigin -UseBasicParsing -TimeoutSec 30
        if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<title>TASS Studio') { throw 'Demo frontend did not load.' }
        Write-Host "Frontend: $uiOrigin"
        Write-Host "Swagger:  $uiOrigin/swagger-ui.html"
        Write-Host "Backend:  $apiOrigin"
        Write-Host 'UI, API readiness and Swagger proxy checks passed. Demo interactions still use browser data.'
    }
    Invoke-Compose -Arguments @('--profile','test','--profile','tools','config','--quiet')
    if ($Action -eq 'config') { Write-Host 'Compose configuration is valid.'; return }
    try { $engine=& docker info --format '{{.OSType}}' 2>&1 }
    catch { throw 'Cannot access Docker engine. Open Docker Desktop and confirm docker info works in this terminal with your normal user account.' }
    if ($LASTEXITCODE -ne 0 -or ($engine -join "`n").Trim() -notmatch '(?m)^linux$') {
        throw 'Cannot access Docker Linux engine. Open Docker Desktop, wait for Engine running, and confirm docker info shows Server from this terminal. Java changes cannot fix an unavailable engine.'
    }
    switch($Action) {
        'up' { Assert-PublishedPorts; Invoke-Compose -Arguments @('up','-d','--build','--wait','--wait-timeout','240'); Invoke-Smoke }
        'down' { Invoke-Compose -Arguments @('down') } # Preserve volumes.
        'status' { Invoke-Compose -Arguments @('ps','-a') }
        'logs' { Invoke-Compose -Arguments @('logs','--tail','150','frontend','backend','postgres') }
        'smoke' { Invoke-Smoke }
        'backup' { New-Item -ItemType Directory -Force -Path '.runtime/docker-backups' | Out-Null; Invoke-Compose -Arguments @('--profile','tools','run','--rm','backup') }
        'migrate' {
            New-Item -ItemType Directory -Force -Path '.runtime/docker-backups' | Out-Null
            Invoke-Compose -Arguments @('--profile','tools','run','--rm','backup')
            Invoke-Compose -Arguments @('stop','frontend','backend')
            Invoke-Compose -Arguments @('--profile','tools','run','--rm','migrate')
            Write-Host 'Migration finished; inspect logs, then run docker-dev.ps1 up to restart the application.'
        }
        'test' {
            New-Item -ItemType Directory -Force -Path '.runtime/docker-test-reports' | Out-Null
            # A new test DB container gives a new tmpfs, without touching the dev DB volume.
            Invoke-Compose -Arguments @('--profile','test','stop','postgres-test')
            Invoke-Compose -Arguments @('--profile','test','rm','-f','postgres-test')
            try {
                Invoke-Compose -Arguments @('--profile','test','run','--build','--rm','verify')
            } finally {
                & docker @compose --profile test logs --no-color postgres-test *> '.runtime/docker-test-reports/postgres.log'
                & docker @compose --profile test stop postgres-test
                & docker @compose --profile test rm -f postgres-test
            }
        }
    }
} finally { Pop-Location }
