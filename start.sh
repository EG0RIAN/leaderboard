#!/bin/bash

# Script to start backend and frontend locally

echo "🚀 Starting Telegram Leaderboard services..."

# Check if backend is already running
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "✅ Backend already running on http://localhost:8000"
else
    echo "Starting backend..."
    cd "$(dirname "$0")"
    python3 run.py > backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend started (PID: $BACKEND_PID) on http://localhost:8000"
    echo $BACKEND_PID > backend.pid
fi

# Check if frontend is already running
if lsof -ti:8001 > /dev/null 2>&1; then
    echo "✅ Frontend already running on http://localhost:8001"
else
    echo "Starting frontend..."
    cd "$(dirname "$0")/frontend"
    python3 -m http.server 8001 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend started (PID: $FRONTEND_PID) on http://localhost:8001"
    echo $FRONTEND_PID > ../frontend.pid
fi

echo ""
echo "✅ Services are running:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:8001"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🌐 To proxy frontend through Cloudflare:"
echo "   ./cloudflare-tunnel.sh"
echo "   (Make sure frontend is running first)"
echo ""
echo "To stop services, run: ./stop.sh"
echo "Or kill processes: kill \$(cat backend.pid) \$(cat frontend.pid)"

