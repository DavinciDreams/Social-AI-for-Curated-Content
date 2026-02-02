@echo off
REM Install AI service dependencies
REM Run this script directly: .\install-ai.bat

echo Installing AI dependencies...
cd ai-service
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install AI dependencies
    exit /b %errorlevel%
)
echo AI dependencies installation complete!
