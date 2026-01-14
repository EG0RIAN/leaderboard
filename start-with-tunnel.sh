#!/bin/bash

# Script to start backend, frontend, and Cloudflare tunnel

echo "🚀 Starting Telegram Leaderboard services with Cloudflare Tunnel..."

cd "$(dirname "$0")"

# Start backend
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "✅ Backend already running on http://localhost:8000"
else
    echo "Starting backend..."
    python3 run.py > backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend started (PID: $BACKEND_PID) on http://localhost:8000"
    echo $BACKEND_PID > backend.pid
    sleep 2
fi

# Start frontend
if lsof -ti:8001 > /dev/null 2>&1; then
    echo "✅ Frontend already running on http://localhost:8001"
else
    echo "Starting frontend..."
    cd frontend
    python3 -m http.server 8001 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend started (PID: $FRONTEND_PID) on http://localhost:8001"
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    sleep 2
fi

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo ""
    echo "⚠️  cloudflared is not installed"
    echo "Install it:"
    echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo ""
    echo "Services are running locally:"
    echo "   Backend:  http://localhost:8000"
    echo "   Frontend: http://localhost:8001"
    exit 0
fi

# Start Cloudflare tunnel
echo ""
echo "Starting Cloudflare Tunnel..."
echo "This will give you a public URL for frontend"
echo ""

cloudflared tunnel --url http://localhost:8001

