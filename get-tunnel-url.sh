#!/bin/bash

# Get Cloudflare Tunnel URL

echo "🌐 Getting Cloudflare Tunnel URL..."
echo ""

# Kill existing tunnel if running
pkill -f "cloudflared tunnel --url http://localhost:8001" 2>/dev/null
sleep 1

# Start tunnel and capture URL
cloudflared tunnel --url http://localhost:8001 2>&1 | while IFS= read -r line; do
    if [[ $line == *"https://"* ]]; then
        echo "$line" | grep -o 'https://[^ ]*' | head -1
        TUNNEL_URL=$(echo "$line" | grep -o 'https://[^ ]*' | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            echo ""
            echo "✅ Public URL: $TUNNEL_URL"
            echo ""
            echo "Use this URL in Telegram BotFather for Mini App"
            echo "Press Ctrl+C to stop the tunnel"
            # Keep tunnel running
            break
        fi
    fi
    echo "$line"
done

