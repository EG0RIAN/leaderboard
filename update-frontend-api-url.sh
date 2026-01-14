#!/bin/bash

# Update frontend with backend tunnel URL

cd "$(dirname "$0")"

BACKEND_URL=$(cat backend-tunnel-url.txt 2>/dev/null | head -1)

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend tunnel URL not found"
    echo "Make sure backend tunnel is running"
    exit 1
fi

echo "Updating frontend with backend URL: $BACKEND_URL"

# Create a temporary index.html with updated API URL
sed "s|window.API_URL = window.API_URL || 'http://localhost:8000';|window.API_URL = '$BACKEND_URL';|g" frontend/index.html > frontend/index.html.tmp

# Backup original
cp frontend/index.html frontend/index.html.backup

# Replace
mv frontend/index.html.tmp frontend/index.html

echo "✅ Frontend updated"
echo "Backend API URL: $BACKEND_URL"

