@echo off
title Panda Kitchens Development Launcher
pushd "%~dp0"

call .venv\Scripts\activate

start "FastAPI" cmd /k ".venv\Scripts\python.exe -m uvicorn main:app --reload"

timeout /t 3 >nul

start "React" cmd /k "cd /d ui && npm.cmd run dev"

timeout /t 5 >nul

start http://localhost:5173

echo Development environment started.
pause
