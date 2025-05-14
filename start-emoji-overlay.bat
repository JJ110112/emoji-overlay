@echo off
echo Starting emoji-overlay web app...

REM Check if Python is available
python --version > nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  REM Start a Python HTTP server
  start "" /B cmd /c "cd %~dp0 && python -m http.server 3000"
) ELSE (
  python3 --version > nul 2>&1
  IF %ERRORLEVEL% EQU 0 (
    REM Try with python3 if available
    start "" /B cmd /c "cd %~dp0 && python3 -m http.server 3000"
  ) ELSE (
    REM If Python is not available, try with default browser file:/// protocol
    echo Python not found. Opening directly in browser...
    start chrome "%~dp0index.html"
    exit /b
  )
)

REM Wait a moment for the server to start
timeout /t 2 /nobreak > nul

REM Open Chrome browser pointing to the app
start chrome http://localhost:3000

echo Emoji-overlay is now running at http://localhost:3000
echo Press Ctrl+C in the server window to stop when finished