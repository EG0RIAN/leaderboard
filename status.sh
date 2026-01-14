#!/bin/bash

# Check status of all services

echo "=== 📊 Telegram Leaderboard Services Status ==="
echo ""

# Backend
if lsof -ti:8000 > /dev/null 2>&1; then
    BACKEND_STATUS=$(curl -s http://localhost:8000/health 2>/dev/null)
    if [ "$BACKEND_STATUS" == '{"status":"ok"}' ]; then
        echo "✅ Backend:  http://localhost:8000 (running)"
    else
        echo "⚠️  Backend:  http://localhost:8000 (port open but not responding)"
    fi
else
    echo "❌ Backend:  not running"
fi

# Frontend
if lsof -ti:8001 > /dev/null 2>&1; then
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001 2>/dev/null)
    if [ "$FRONTEND_STATUS" == "200" ]; then
        echo "✅ Frontend: http://localhost:8001 (running)"
    else
        echo "⚠️  Frontend: http://localhost:8001 (port open but not responding)"
    fi
else
    echo "❌ Frontend: not running"
fi

# Cloudflare Tunnel
if pgrep -f "cloudflared tunnel" > /dev/null; then
    if [ -f tunnel-url.txt ]; then
        TUNNEL_URL=$(cat tunnel-url.txt | head -1)
        TUNNEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL" 2>/dev/null)
        if [ "$TUNNEL_STATUS" == "200" ]; then
            echo "✅ Tunnel:  $TUNNEL_URL (running)"
        else
            echo "⚠️  Tunnel:  $TUNNEL_URL (running but not accessible)"
        fi
    else
        echo "✅ Tunnel:  running (check cloudflare-tunnel.log for URL)"
    fi
else
    echo "❌ Tunnel:  not running"
fi

echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo "   Tunnel:   tail -f cloudflare-tunnel.log"

