#!/bin/bash

# Script to stop backend and frontend

echo "🛑 Stopping Telegram Leaderboard services..."

cd "$(dirname "$0")"

# Stop backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend stopped (PID: $BACKEND_PID)"
    else
        echo "Backend was not running"
    fi
    rm -f backend.pid
else
    # Try to kill by port
    lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✅ Backend stopped" || echo "Backend was not running"
fi

# Stop frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
    else
        echo "Frontend was not running"
    fi
    rm -f frontend.pid
else
    # Try to kill by port
    lsof -ti:8001 | xargs kill -9 2>/dev/null && echo "✅ Frontend stopped" || echo "Frontend was not running"
fi

# Stop Cloudflare tunnel
if pgrep -f "cloudflared tunnel" > /dev/null; then
    pkill -f "cloudflared tunnel"
    echo "✅ Cloudflare tunnel stopped"
else
    echo "Cloudflare tunnel was not running"
fi

echo ""
echo "✅ All services stopped"

