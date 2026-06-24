@echo off
title Vetansutra Tally Prime Bridge Agent Launcher
color 0b

echo ===================================================
echo   Vetansutra Tally Prime Bridge Agent Auto-Launcher
echo ===================================================
echo.

:: 1. Check if compiled standalone executable exists
if exist dist\tally-bridge-agent.exe (
  echo [1/1] Standalone executable found.
  echo Launching Tally Bridge Server from pre-compiled binary...
  echo ---------------------------------------------------
  echo Bridge Agent is now starting up!
  echo Keep this window open while exporting salaries to Tally Prime.
  echo ---------------------------------------------------
  echo.
  dist\tally-bridge-agent.exe
  goto end
)

:: 2. Fallback to Node.js check if no compiled executable
echo [1/3] Standalone binary not found. Checking Node.js runtime environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
  color 0c
  echo.
  echo ERROR: Node.js is NOT installed on this computer!
  echo ---------------------------------------------------
  echo Direct push bypassing CORS might fail.
  echo Please run the precompiled binary: dist\tally-bridge-agent.exe
  echo or install Node.js from https://nodejs.org/ to run the script.
  echo.
  pause
  exit
)
echo Node.js is installed.

:: Check if node_modules exists, if not run npm install
echo [2/3] Checking bridge package dependencies...
if not exist node_modules (
  echo.
  echo Dependencies not found. Installing packages, please wait...
  call npm install
  echo.
) else (
  echo Dependencies verified.
)

:: Run node server
echo.
echo [3/3] Launching Tally Bridge Server...
echo ---------------------------------------------------
echo Bridge Agent is now starting up!
echo Keep this window open while exporting salaries to Tally Prime.
echo ---------------------------------------------------
echo.
node index.js

:end
pause
