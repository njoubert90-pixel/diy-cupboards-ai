import subprocess, time, webbrowser
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent

venv_python = ROOT/".venv"/"Scripts"/"python.exe"

backend = subprocess.Popen(
    [str(venv_python), "-m", "uvicorn", "main:app", "--reload"],
    cwd=ROOT
)

time.sleep(3)

frontend = subprocess.Popen(
    ["npm.cmd", "run", "dev"],
    cwd=ROOT/"ui",
    shell=True
)

time.sleep(5)
webbrowser.open("http://localhost:5173")

print("DIY Cupboards development environment is running.")
print("Press Ctrl+C to stop.")

try:
    backend.wait()
except KeyboardInterrupt:
    backend.terminate()
    frontend.terminate()
