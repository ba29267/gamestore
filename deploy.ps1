# GameStore Kubernetes Deployment Script
# Automates: Docker build, image load, Kubernetes deployment, port-forwarding

param(
    [string]$Environment = "development",
    [switch]$SkipBuild = $false,
    [switch]$SkipLoad = $false,
    [switch]$PortForward = $false
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GameStore Kubernetes Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Color functions
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args[0] -ForegroundColor Red }
function Write-Warning-Custom { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }

# ============================================================================
# 1. CHECK PREREQUISITES
# ============================================================================
Write-Info "Step 1: Checking prerequisites..."

$tools = @("docker", "kubectl", "minikube")
$missing = @()

foreach ($tool in $tools) {
    try {
        $version = & $tool version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success ("[OK] $tool is installed")
        }
        else {
            $missing += $tool
        }
    }
    catch {
        $missing += $tool
    }
}

if ($missing.Count -gt 0) {
    Write-Error-Custom "[ERROR] Missing tools: $($missing -join ', ')"
    Write-Error-Custom "Please install: https://kubernetes.io/docs/tasks/tools/"
    exit 1
}

# ============================================================================
# 2. START MINIKUBE
# ============================================================================
Write-Info ""
Write-Info "Step 2: Starting Minikube..."

$minikubeStatus = & minikube status 2>&1
if ($minikubeStatus -match "Running") {
    Write-Success "[OK] Minikube is already running"
}
else {
    Write-Warning-Custom "Starting Minikube (this may take a minute)..."
    & minikube start --driver=docker 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "[OK] Minikube started successfully"
    }
    else {
        Write-Error-Custom "[ERROR] Failed to start Minikube"
        exit 1
    }
}

# ============================================================================
# 3. BUILD DOCKER IMAGES
# ============================================================================
if ($SkipBuild) {
    Write-Warning-Custom "Skipping Docker build"
}
else {
    Write-Info ""
    Write-Info "Step 3: Building Docker images..."
    
    Write-Info "Building 6 Docker images..."
    $output = & docker-compose build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "[OK] All Docker images built successfully"
    }
    else {
        Write-Error-Custom "[ERROR] Docker build failed"
        Write-Host $output
        exit 1
    }
}

# ============================================================================
# 4. LOAD IMAGES INTO MINIKUBE
# ============================================================================
if ($SkipLoad) {
    Write-Warning-Custom "Skipping image load"
}
else {
    Write-Info ""
    Write-Info "Step 4: Loading images into Minikube..."
    
    $images = @(
        "gamestore-auth-service:latest",
        "gamestore-game-service:latest",
        "gamestore-orders-service:latest",
        "gamestore-reviews-service:latest",
        "gamestore-frontend:latest",
        "gamestore-api-gateway:latest"
    )
    
    foreach ($image in $images) {
        Write-Host ("  Loading $image...") -NoNewline
        & minikube image load $image 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
        }
        else {
            Write-Host " [FAILED]" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Success "[OK] All images loaded into Minikube"
}

# ============================================================================
# 5. DEPLOY TO KUBERNETES
# ============================================================================
Write-Info ""
Write-Info ("Step 5: Deploying to Kubernetes ($Environment environment)...")

$kubeOverlay = "kubernetes/overlays/$Environment"

if (-not (Test-Path $kubeOverlay)) {
    Write-Error-Custom "[ERROR] Environment not found: $kubeOverlay"
    Write-Host "Available environments: development, staging, production"
    exit 1
}

Write-Host "Running: kubectl apply -k $kubeOverlay"
$deployOutput = & kubectl apply -k $kubeOverlay 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "[OK] Kubernetes deployment successful"
}
else {
    Write-Error-Custom "[ERROR] Kubernetes deployment failed"
    Write-Host $deployOutput
    exit 1
}

# ============================================================================
# 6. WAIT FOR PODS TO START
# ============================================================================
Write-Info ""
Write-Info "Step 6: Waiting for pods to start (this may take a minute)..."

# Map environment names to actual namespaces from kustomization files
$namespaceMap = @{
    "development" = "gamestore-dev"
    "staging" = "gamestore-staging"
    "production" = "gamestore-prod"
}

$namespace = $namespaceMap[$Environment]
if (-not $namespace) {
    $namespace = "gamestore-$Environment"
}
$elapsed = 0

while ($elapsed -lt $maxWait) {
    $pods = & kubectl get pods -n $namespace 2>&1
    $running = ($pods | Select-String "Running" | Measure-Object).Count
    $total = ($pods | Select-String "^[a-z]" | Measure-Object).Count
    
    Write-Host "  Pods ready: $running/$total" -NoNewline
    
    if ($running -ge 5) {
        Write-Host " [OK]" -ForegroundColor Green
        break
    }
    
    Write-Host " ..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    $elapsed += 5
}

Write-Success "[OK] Pods are starting"

# ============================================================================
# 7. SHOW STATUS
# ============================================================================
Write-Info ""
Write-Info "Step 7: Deployment Status"
Write-Info "================================="

$podStatus = & kubectl get pods -n $namespace --no-headers 2>&1
Write-Host $podStatus

# ============================================================================
# 8. SETUP PORT FORWARDS (Optional)
# ============================================================================
Write-Info ""
Write-Info "Step 8: Port Forwarding Setup"
Write-Info "================================="

if ($PortForward) {
    Write-Info "Starting port forwards..."
    
    $processes = Get-Process kubectl -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "port-forward" }
    if ($processes) {
        $processes | Stop-Process -Force
        Write-Warning-Custom "Stopped existing port-forward processes"
    }
    
    # Use full path to PowerShell executable
    $psExe = "powershell.exe"
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        $psExe = "pwsh.exe"
    }
    
    $cmd_frontend = "kubectl port-forward -n $namespace svc/frontend 8000:3000"
    Write-Info "Starting: $cmd_frontend"
    Start-Process -FilePath $psExe -ArgumentList "-NoExit", "-Command", $cmd_frontend
    
    $cmd_grafana = "kubectl port-forward -n $namespace svc/grafana 3005:3000"
    Write-Info "Starting: $cmd_grafana"
    Start-Process -FilePath $psExe -ArgumentList "-NoExit", "-Command", $cmd_grafana
    
    $cmd_prometheus = "kubectl port-forward -n $namespace svc/prometheus 9090:9090"
    Write-Info "Starting: $cmd_prometheus"
    Start-Process -FilePath $psExe -ArgumentList "-NoExit", "-Command", $cmd_prometheus
    
    Start-Sleep -Seconds 2
    Write-Success "[OK] Port forwards started in new terminals"
}
else {
    Write-Warning-Custom "To start port forwards, run with PortForward flag:"
    Write-Host "  .\deploy.ps1 -PortForward"
}

# ============================================================================
# 9. SHOW ACCESS URLS
# ============================================================================
Write-Info ""
Write-Info "========================================" -ForegroundColor Cyan
Write-Info "  Deployment Complete!" -ForegroundColor Cyan
Write-Info "========================================" -ForegroundColor Cyan

Write-Info ""
Write-Success "Access your services:"
Write-Info ""
Write-Host "  Frontend (React)     -> http://localhost:8000" -ForegroundColor White
Write-Host "  Grafana Dashboards   -> http://localhost:3005  (admin/admin)" -ForegroundColor White
Write-Host "  Prometheus Metrics   -> http://localhost:9090" -ForegroundColor White
Write-Host "  API Gateway          -> http://localhost" -ForegroundColor White
Write-Host "  Swagger Docs         -> http://localhost:3002/docs" -ForegroundColor White
Write-Host "  GraphQL              -> http://localhost:3002/graphql" -ForegroundColor White

Write-Info ""
Write-Success "Useful commands:"
Write-Host "  kubectl get pods -n $namespace"
Write-Host "  kubectl logs -f deployment/game-service -n $namespace"
Write-Host "  kubectl exec -it postgres-0 -n $namespace -- psql -U gamestore_user -d gamestore_db"

Write-Info ""
Write-Success "To stop the deployment:"
Write-Host "  kubectl delete -k $kubeOverlay"

Write-Info ""
Write-Info "Documentation: See README.md for detailed information"
Write-Info ""
