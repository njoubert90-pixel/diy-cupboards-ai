@echo off
title Panda Kitchens - Installation

echo Installing DIY Cupboards...

if not exist ".venv" (
    python -m venv .venv
)

call .venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

cd ui
if not exist node_modules (
    npm install
)
cd ..

echo Installation Complete.
pause
