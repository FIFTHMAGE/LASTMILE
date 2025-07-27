@echo off
echo 🚀 Starting LastMile Development Environment...
echo.
echo 📡 Starting backend server on port 9000...
start "Backend Server" cmd /k "node test-server.js"

timeout /t 3 /nobreak >nul

echo 🎨 Starting frontend on port 3000...
cd frontend
start "Frontend Server" cmd /k "set BROWSER=true && npm start"
cd ..

echo.
echo 📋 Development URLs:
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:9000
echo API:      http://localhost:9000/api
echo.
echo 🧪 Demo Credentials:
echo Business: business@demo.com / demo123
echo Rider:    rider@demo.com / demo123
echo Admin:    admin@demo.com / demo123
echo.
echo 💡 Both servers will open in separate windows
echo 💡 Frontend will auto-open in your browser
pause