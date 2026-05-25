@echo off
title Trading Engine

echo ========================================
echo  Trading Engine - Starting All Services
echo ========================================
echo.

echo [1/2] Starting Backend API (port 8000)...
start "Backend API" cmd /c "cd /d "%~dp0" && uvicorn api.app:create_app --factory --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite)...
start "Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both services starting in separate windows.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
