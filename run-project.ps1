# Check if truffle is installed
$truffleInstalled = Get-Command truffle -ErrorAction SilentlyContinue
if (-not $truffleInstalled) {
    Write-Host "truffle not found. Installing it globally..." -ForegroundColor Yellow
    npm install -g truffle
}

# Check if ganache-cli is installed
$ganacheInstalled = Get-Command ganache-cli -ErrorAction SilentlyContinue
if (-not $ganacheInstalled) {
    Write-Host "ganache-cli not found. Installing it globally..." -ForegroundColor Yellow
    npm install -g ganache-cli
}

# Check if Ganache GUI is running on 7545
Write-Host "Checking for Ganache GUI on port 7545..." -ForegroundColor Cyan
$guiRunning = Get-NetTCPConnection -LocalPort 7545 -ErrorAction SilentlyContinue
if ($guiRunning) {
    Write-Host "Ganache GUI detected on port 7545!" -ForegroundColor Green
    $targetNetwork = "ganache"
} else {
    # Force kill anything on 8545 to ensure a fresh Ganache with ID 1337
    Write-Host "No GUI found on 7545. Cleaning up port 8545..." -ForegroundColor Cyan
    $oldProcess = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue
    if ($oldProcess) {
        Write-Host "Closing old Ganache/process on 8545..." -ForegroundColor Yellow
        Stop-Process -Id $oldProcess.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    Write-Host "Starting fresh Ganache CLI with Network ID 1337..." -ForegroundColor Green
    $ganacheProcess = Start-Process -FilePath "ganache-cli" -ArgumentList "--p 8545 --network-id 1337" -WindowStyle Normal -PassThru
    Write-Host "Waiting 10 seconds for Ganache to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    $targetNetwork = "development"
}

# Deploy contracts specifically to the detected network
Write-Host "Deploying smart contracts to $targetNetwork network..." -ForegroundColor Cyan
truffle migrate --reset --network $targetNetwork

if ($LASTEXITCODE -ne 0) {
    Write-Error "Truffle migration failed."
    exit $LASTEXITCODE
}

# Start client
Write-Host "Starting the voting client..." -ForegroundColor Cyan
Set-Location client
npm install
npm start
