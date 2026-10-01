@echo off
title LUMINA Studio - E-Commerce Server
echo ========================================================
echo   LUMINA STUDIO - Starting Full-Stack E-Commerce Store
echo ========================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3 from https://www.python.org/
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
pip install -r requirements.txt >nul 2>&1

echo [2/3] Opening LUMINA Storefront in your browser...
start http://127.0.0.1:5000

echo [3/3] Starting backend server on http://127.0.0.1:5000 ...
echo (Press CTRL+C anytime in this window to stop the server)
echo.
python server.py
pause
