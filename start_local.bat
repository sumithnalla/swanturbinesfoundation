@echo off
title Swan Turbines Foundation - Local Environment Launcher
color 0b

echo =========================================================================
echo       SWAN TURBINES FOUNDATION - FULLSTACK LOCAL LAUNCHER
echo =========================================================================
echo.
echo [1/3] Starting FastAPI Backend on http://localhost:8000 ...
start "Swan Backend API (FastAPI)" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Frontend Web Server on http://localhost:5500 ...
start "Swan Frontend Server" cmd /k "cd /d "%~dp0" && backend\venv\Scripts\python.exe -m http.server 5500"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Opening browser tabs:
echo   - Public Website:            http://localhost:5500/index.html
echo   - Foundation Admin Login:    http://localhost:5500/adminlogin/index.html
echo   - WEBSITTER Super-Admin:     http://localhost:5500/manage/index.html
echo   - API Interactive Docs:      http://localhost:8000/docs
echo.
echo =========================================================================
echo TEST CREDENTIALS:
echo   [1] Foundation Admin Portal (http://localhost:5500/adminlogin/index.html):
echo       Email:    admin@swanturbinesfoundation.com
echo       Password: AdminSwan2026!#Secure
echo.
echo   [2] WEBSITTER Super-Admin (http://localhost:5500/manage/index.html):
echo       Email:    websitter@swanturbinesfoundation.com
echo       Password: WebsitterSuperAdmin2026!
echo =========================================================================
echo.

start http://localhost:5500/index.html
start http://localhost:5500/request-help.html
start http://localhost:5500/adminlogin/index.html
start http://localhost:5500/manage/index.html
start http://localhost:8000/docs


echo =========================================================================
echo All servers are live! Keep the background command windows open while testing.
echo Press any key to exit this launcher window.
echo =========================================================================
pause >nul
