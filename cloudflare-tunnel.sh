#!/bin/bash

# Script to start Cloudflare Tunnel for frontend
# This proxies local frontend (port 8001) through Cloudflare

echo "🌐 Starting Cloudflare Tunnel for frontend..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed"
    echo ""
    echo "Install it:"
    echo "  macOS: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    echo "  Or download from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

# Check if frontend is running
if ! lsof -ti:8001 > /dev/null 2>&1; then
    echo "❌ Frontend is not running on port 8001"
    echo "Start it first: cd frontend && python3 -m http.server 8001"
    exit 1
fi

# Start tunnel
echo "Starting tunnel to http://localhost:8001..."
echo "This will give you a public URL like: https://xxxxx.trycloudflare.com"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

cd "$(dirname "$0")"

# Start cloudflared tunnel
cloudflared tunnel --url http://localhost:8001

