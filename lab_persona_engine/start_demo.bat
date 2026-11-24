@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动 小联数字人 (Persona Engine + Live2D) ...
start "Lian Persona Engine" cmd /k "cd /d %~dp0 && python server.py --port 8090"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8090/
