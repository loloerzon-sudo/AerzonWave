@echo off
title AetherWave 3D Music Visualizer
echo Starting local web server for AetherWave...
echo.
echo Opening http://localhost:8000 in your browser...
start http://localhost:8000
python -m http.server 8000
if %errorlevel% neq 0 (
    echo Python not found, opening index.html directly...
    start index.html
)
pause
