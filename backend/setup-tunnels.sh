#!/bin/bash

# AI Marketplace Backend Tunnel Setup
# This script sets up Cloudflare tunnels for the backend services

echo "🚀 Setting up AI Marketplace Backend Tunnels"

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared not found. Please install it first:"
    echo "   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
    echo "   sudo dpkg -i cloudflared.deb"
    exit 1
fi

# Create tunnel if it doesn't exist
TUNNEL_NAME="ai-marketplace-backend"
echo "🔧 Creating tunnel: $TUNNEL_NAME"

# Login to Cloudflare (if not already logged in)
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "🔐 Please login to Cloudflare first:"
    echo "   cloudflared tunnel login"
    exit 1
fi

# Create the tunnel
cloudflared tunnel create $TUNNEL_NAME 2>/dev/null || echo "Tunnel already exists"

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep $TUNNEL_NAME | awk '{print $1}')
echo "📋 Tunnel ID: $TUNNEL_ID"

# Update the config file with the actual tunnel ID
sed -i "s/tunnel: ai-marketplace-backend/tunnel: $TUNNEL_ID/" cloudflare-tunnel.yml

echo "✅ Tunnel setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your DNS records to point to the tunnel:"
echo "   cloudflared tunnel route dns $TUNNEL_NAME ai-marketplace-api.your-domain.com"
echo "   cloudflared tunnel route dns $TUNNEL_NAME ai-marketplace-ws.your-domain.com"
echo "   cloudflared tunnel route dns $TUNNEL_NAME ai-marketplace-vector.your-domain.com"
echo ""
echo "2. Start the tunnel:"
echo "   cloudflared tunnel --config cloudflare-tunnel.yml run"
echo ""
echo "3. Update your Vercel environment variables:"
echo "   NEXT_PUBLIC_API_URL=https://ai-marketplace-api.your-domain.com"
echo "   NEXT_PUBLIC_WS_URL=wss://ai-marketplace-ws.your-domain.com"
echo "   NEXT_PUBLIC_ORION_API_URL=https://ai-marketplace-vector.your-domain.com"
