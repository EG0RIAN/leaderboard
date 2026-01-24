#!/bin/bash
# Server setup script for Telegram Mini App Leaderboard

set -e

echo "=== Setting up Telegram Mini App Leaderboard ==="

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git sqlite3 curl

# Create app directory
mkdir -p /home/leaderboard
cd /home/leaderboard

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

echo "=== Base packages installed ==="

