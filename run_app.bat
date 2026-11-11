@echo off
title CodeDoctor AI - Application Launcher
echo ========================================================
echo   Starting CodeDoctor AI Server (Backend + Frontend)
echo ========================================================
echo.
cd /d "%~dp0"

echo Opening browser at http://localhost:8000 ...
start "" "http://localhost:8000"

echo Running Uvicorn server on port 8000...
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause

