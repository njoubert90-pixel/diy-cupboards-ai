@echo off

echo Starting DIY Cupboards AI...

echo Activating Python environment
call .venv\Scripts\activate

echo Starting FastAPI backend
start cmd /k "cd /d ..\.. && .venv\Scripts\python.exe -m uvicorn main:app --reload"

echo Starting React frontend
start cmd /k "cd /d .. && npm.cmd run dev"

echo App starting...
