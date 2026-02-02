@echo off
REM Install AI service dependencies without workspace propagation
REM This script runs the install:ai:internal script at the root level only

cd /d "%~dp0.."
cd ai-service
pip install -r requirements.txt
