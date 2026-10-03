# Swan Turbines Foundation — PowerShell Local Launcher
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "      SWAN TURBINES FOUNDATION - FULLSTACK LOCAL LAUNCHER" -ForegroundColor Cyan
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend
Write-Host "[1/3] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$baseDir\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend
Write-Host "[2/3] Starting Frontend Web Server on http://localhost:5500 ..." -ForegroundColor Green
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$baseDir'; .\backend\venv\Scripts\python.exe -m http.server 5500"

# 3. Wait and open browser tabs
Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Opening web applications in default browser:" -ForegroundColor White
Write-Host "  - Public Website:         http://localhost:5500/index.html" -ForegroundColor Gray
Write-Host "  - Foundation Admin:       http://localhost:5500/adminlogin/index.html" -ForegroundColor Gray
Write-Host "  - WEBSITTER Super-Admin:  http://localhost:5500/manage/index.html" -ForegroundColor Gray
Write-Host "  - Backend Swagger Docs:   http://localhost:8000/docs" -ForegroundColor Gray

Start-Process "http://localhost:5500/index.html"
Start-Process "http://localhost:5500/adminlogin/index.html"
Start-Process "http://localhost:5500/manage/index.html"
Start-Process "http://localhost:8000/docs"

Write-Host ""
Write-Host "All servers are running. Keep the terminal windows open." -ForegroundColor Cyan
