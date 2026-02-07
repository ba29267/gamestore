# Port-forward all GameStore services
Write-Host "Starting port-forwards for all services..." -ForegroundColor Green

$services = @{
    'frontend' = '8000:3000'
    'auth-service' = '3001:3001'
    'game-service' = '3002:3002'
    'orders-service' = '3003:3003'
    'reviews-service' = '3004:3004'
    'postgres' = '5432:5432'
    'redis' = '6379:6379'
    'grafana' = '3005:3000'
    'prometheus' = '9090:9090'
    'solr' = '8983:8983'
}

foreach ($service in $services.Keys) {
    $ports = $services[$service]
    Start-Job -ScriptBlock {
        param($svc, $port)
        kubectl port-forward -n gamestore svc/$svc $port
    } -ArgumentList $service, $ports | Out-Null
    
    Write-Host "Started port-forward for $service ($ports)" -ForegroundColor Cyan
    Start-Sleep -Milliseconds 500
}

Write-Host "All port-forwards are running!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Grafana: http://localhost:3005" -ForegroundColor Yellow
Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Yellow
Write-Host "To stop all: Get-Job | Stop-Job" -ForegroundColor Yellow
