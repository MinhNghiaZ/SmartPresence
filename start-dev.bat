@echo off
echo Starting SmartPresence Development Environment...
echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"
echo.
echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo Both servers are starting...
echo Backend will run on http://localhost:3000 (or your configured port)
echo Frontend will run on http://localhost:5173 (default Vite port)
echo.
pause