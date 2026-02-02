@echo off
REM Install AI service dependencies wrapper
REM This script runs the install:ai script at the root level and in all workspaces

echo Installing AI dependencies at root level...
cd /d "%~dp0.."
cd ai-service
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install AI dependencies
    exit /b %errorlevel%
)

echo.
echo Skipping AI dependencies for workspaces (not applicable)
echo AI dependencies installation complete!
