#!/bin/bash

# Start all services: backend, frontend, bot, and tunnels

echo "🚀 Starting all Telegram Leaderboard services..."

cd "$(dirname "$0")"

# Start backend
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "✅ Backend already running"
else
    echo "Starting backend..."
    python3 run.py > backend.log 2>&1 &
    echo $! > backend.pid
    sleep 2
    echo "✅ Backend started on http://localhost:8000"
fi

# Start frontend
if lsof -ti:8001 > /dev/null 2>&1; then
    echo "✅ Frontend already running"
else
    echo "Starting frontend..."
    cd frontend
    python3 -m http.server 8001 > ../frontend.log 2>&1 &
    echo $! > ../frontend.pid
    cd ..
    sleep 1
    echo "✅ Frontend started on http://localhost:8001"
fi

# Start bot
if pgrep -f "run-bot.py" > /dev/null; then
    echo "✅ Bot already running"
else
    echo "Starting bot..."
    python3 run-bot.py > bot.log 2>&1 &
    echo $! > bot.pid
    sleep 3
    echo "✅ Bot started (polling)"
fi

# Start Cloudflare tunnels
if pgrep -f "cloudflared tunnel" > /dev/null; then
    echo "✅ Cloudflare tunnels already running"
else
    echo "Starting Cloudflare tunnels..."
    nohup cloudflared tunnel --url http://localhost:8000 > cloudflare-backend.log 2>&1 &
    nohup cloudflared tunnel --url http://localhost:8001 > cloudflare-tunnel.log 2>&1 &
    sleep 6
    
    # Extract URLs
    BACKEND_URL=$(cat cloudflare-backend.log 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' | head -1)
    FRONTEND_URL=$(cat cloudflare-tunnel.log 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' | head -1)
    
    if [ ! -z "$BACKEND_URL" ] && [ ! -z "$FRONTEND_URL" ]; then
        echo "$BACKEND_URL" > backend-tunnel-url.txt
        echo "$FRONTEND_URL" > frontend-tunnel-url.txt
        
        # Update frontend with backend URL
        python3 -c "
import re
with open('frontend/index.html', 'r') as f:
    content = f.read()
content = re.sub(r\"window\.API_URL = '[^']*'\", f\"window.API_URL = '{BACKEND_URL}'\", content)
with open('frontend/index.html', 'w') as f:
    f.write(content)
"
        echo "✅ Tunnels started"
        echo "   Backend:  $BACKEND_URL"
        echo "   Frontend: $FRONTEND_URL"
    else
        echo "⏳ Tunnels starting... (check logs)"
    fi
fi

echo ""
echo "✅ All services started!"
echo ""
echo "📋 URLs:"
BACKEND_URL=$(cat backend-tunnel-url.txt 2>/dev/null)
FRONTEND_URL=$(cat frontend-tunnel-url.txt 2>/dev/null)
if [ ! -z "$BACKEND_URL" ] && [ ! -z "$FRONTEND_URL" ]; then
    echo "   Backend:  $BACKEND_URL"
    echo "   Frontend: $FRONTEND_URL"
    echo ""
    echo "Используйте Frontend URL в Telegram BotFather"
fi

echo ""
echo "📝 Check status: ./status.sh"
echo "🛑 Stop all: ./stop-all.sh"

