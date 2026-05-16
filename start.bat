@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Minesigma BOT - Auto Launcher
echo ========================================
echo.

:: Check if Bun is installed
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Bun not found. Installing Bun...
    powershell -c "irm bun.sh/install.ps1 | iex"
    if %errorlevel% neq 0 (
        echo [X] Failed to install Bun. Please install manually from https://bun.sh
        pause
        exit /b 1
    )
    echo [+] Bun installed successfully.
    echo.
    echo [i] Please restart this script or open a new terminal for Bun to be available.
    echo     If Bun is still not found, add it to your PATH manually.
    pause
    exit /b 0
)

echo [+] Bun found: 
bun --version
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] Dependencies not installed. Running bun install...
    call bun install
    if %errorlevel% neq 0 (
        echo [X] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [+] Dependencies installed.
    echo.
)

:: Start the bot
echo ========================================
echo   Starting Minesigma BOT...
echo ========================================
echo   Open http://localhost:3000 in your browser
echo   Press Ctrl+C to stop
echo ========================================
echo.

call bun run dev
