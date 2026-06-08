@echo off
title Trading Engine

echo ========================================
echo  Trading Engine - Starting All Services
echo ========================================
echo.

echo [1/2] Starting Backend API (port 8000)...
start "Backend API" cmd /k "cd /d "%~dp0" && echo Backend starting... && "%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn api.app:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting for backend to be ready...
:wait_loop
timeout /t 2 /nobreak >nul
>nul 2>&1 curl -s http://127.0.0.1:8000/health
if not %errorlevel% equ 0 (
    echo Backend not ready yet, retrying...
    goto wait_loop
)
echo Backend is ready!

echo [2/2] Starting Frontend (Vite)...
start "Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend starting... && npm run dev"

echo.
echo Both services started.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
