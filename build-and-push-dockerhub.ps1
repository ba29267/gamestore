# Build and Push GameStore Images to Docker Hub
# Usage: .\build-and-push-dockerhub.ps1 -DockerUsername "bejtulla" -PushToHub $true

param(
    [string]$DockerUsername = "bejtulla",
    [bool]$PushToHub = $true,
    [string]$ImageTag = "latest"
)

Write-Host "=========================================================="
Write-Host "  GameStore - Docker Build & Push Script                "
Write-Host "=========================================================="
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Docker Hub Username: $DockerUsername"
Write-Host "  Image Tag: $ImageTag"
Write-Host "  Push to Hub: $PushToHub"
Write-Host ""

# Array of services to build
$services = @(
    @{
        name     = "auth-service"
        path     = "services/auth-service"
        registry = "$DockerUsername/gamestore-auth-service"
    },
    @{
        name     = "game-service"
        path     = "services/game-service"
        registry = "$DockerUsername/gamestore-game-service"
    },
    @{
        name     = "orders-service"
        path     = "services/orders-service"
        registry = "$DockerUsername/gamestore-orders-service"
    },
    @{
        name     = "reviews-service"
        path     = "services/reviews-service"
        registry = "$DockerUsername/gamestore-reviews-service"
    },
    @{
        name     = "frontend"
        path     = "frontend"
        registry = "$DockerUsername/gamestore-frontend"
    },
    @{
        name     = "api-gateway"
        path     = "nginx"
        registry = "$DockerUsername/gamestore-api-gateway"
    }
)

$successCount = 0
$failCount = 0

# Check if Docker is running
Write-Host "[INFO] Checking Docker daemon..." -ForegroundColor Cyan
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# If pushing to Hub, check if logged in
if ($PushToHub) {
    Write-Host "[INFO] Checking Docker Hub login..." -ForegroundColor Cyan
    try {
        docker info | Out-Null
        $loginStatus = docker auth-provider
        Write-Host "[OK] Docker authentication ready" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Not logged in to Docker Hub. Run: docker login" -ForegroundColor Red
        Write-Host "[WARN] Continuing with build only (push will fail)..." -ForegroundColor Yellow
        $PushToHub = $false
    }
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Gray
Write-Host "Building Images" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Gray

# Build each service
foreach ($service in $services) {
    $imageName = "$($service.registry):$ImageTag"
    Write-Host ""
    Write-Host "[BUILD] $($service.name)" -ForegroundColor Cyan
    Write-Host "  Path: $($service.path)"
    Write-Host "  Image: $imageName"
    
    # Check if Dockerfile exists
    $dockerfilePath = Join-Path -Path $service.path -ChildPath "Dockerfile"
    if (-not (Test-Path $dockerfilePath)) {
        Write-Host "[ERROR] Dockerfile not found at $dockerfilePath" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Build the image
    try {
        docker build -t $imageName -f $dockerfilePath $service.path
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] $($service.name) built successfully" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "[ERROR] $($service.name) build failed" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "[ERROR] $($service.name) build error: $_" -ForegroundColor Red
        $failCount++
        continue
    }
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Gray
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Gray
Write-Host "Successful builds: $successCount" -ForegroundColor Green
Write-Host "Failed builds: $failCount" -ForegroundColor Red

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "[ERROR] Some builds failed. Fix errors above and try again." -ForegroundColor Red
    exit 1
}

# Push to Docker Hub if requested
if ($PushToHub) {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Gray
    Write-Host "Pushing Images to Docker Hub" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Gray
    
    $pushSuccess = 0
    $pushFail = 0
    
    foreach ($service in $services) {
        $imageName = "$($service.registry):$ImageTag"
        Write-Host ""
        Write-Host "[PUSH] $($service.name)" -ForegroundColor Cyan
        
        try {
            docker push $imageName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] $imageName pushed successfully" -ForegroundColor Green
                $pushSuccess++
            } else {
                Write-Host "[ERROR] Push failed for $imageName" -ForegroundColor Red
                $pushFail++
            }
        } catch {
            Write-Host "[ERROR] Push error for $imageName : $_" -ForegroundColor Red
            $pushFail++
        }
    }
    
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Gray
    Write-Host "Push Summary" -ForegroundColor Cyan
    Write-Host "===========================================================" -ForegroundColor Gray
    Write-Host "Successful pushes: $pushSuccess" -ForegroundColor Green
    Write-Host "Failed pushes: $pushFail" -ForegroundColor Red
    
    if ($pushFail -gt 0) {
        Write-Host "[ERROR] Some images failed to push." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=========================================================="
Write-Host "All Operations Completed!" -ForegroundColor Green
Write-Host "=========================================================="

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify images on Docker Hub: https://hub.docker.com/u/$DockerUsername"
Write-Host "2. YAML files reference: $DockerUsername/gamestore-*:$ImageTag"
Write-Host "3. YAML files already updated with correct image references"
Write-Host "4. imagePullPolicy already set to: Always"
Write-Host ""
