#!/bin/bash
#
# ORION-CORE Chat Backend Deployment Script
# Deploys chat-service to ORACLE (192.168.50.77) on port 3002
#

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ORION-CORE Chat Backend Deployment                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
TARGET_HOST="root@192.168.50.77"
TARGET_DIR="/opt/chat-backend"
SERVICE_NAME="chat-backend"

# Step 1: Create target directory on ORACLE
echo "📁 Creating target directory on ORACLE..."
ssh $TARGET_HOST "mkdir -p $TARGET_DIR"

# Step 2: Copy files to ORACLE
echo "📤 Copying files to ORACLE..."
scp -r ./* $TARGET_HOST:$TARGET_DIR/

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
ssh $TARGET_HOST "cd $TARGET_DIR && npm install --production"

# Step 4: Run database migration
echo "🗄️  Running database migration..."
ssh $TARGET_HOST "cd $TARGET_DIR && npm run migrate" || echo "⚠️  Migration may have already run"

# Step 5: Check if PM2 is installed
echo "🔍 Checking for PM2..."
if ssh $TARGET_HOST "command -v pm2 >/dev/null 2>&1"; then
  echo "✓ PM2 is installed"
  
  # Stop existing service if running
  echo "🛑 Stopping existing service..."
  ssh $TARGET_HOST "pm2 stop $SERVICE_NAME || true"
  ssh $TARGET_HOST "pm2 delete $SERVICE_NAME || true"
  
  # Start service with PM2
  echo "🚀 Starting service with PM2..."
  ssh $TARGET_HOST "cd $TARGET_DIR && pm2 start server.js --name $SERVICE_NAME"
  ssh $TARGET_HOST "pm2 save"
  
  # Show status
  echo ""
  echo "📊 Service Status:"
  ssh $TARGET_HOST "pm2 status $SERVICE_NAME"
  
else
  echo "⚠️  PM2 not installed. Installing PM2..."
  ssh $TARGET_HOST "npm install -g pm2"
  
  # Start service
  echo "🚀 Starting service with PM2..."
  ssh $TARGET_HOST "cd $TARGET_DIR && pm2 start server.js --name $SERVICE_NAME"
  ssh $TARGET_HOST "pm2 save"
  ssh $TARGET_HOST "pm2 startup"
fi

# Step 6: Verify service is running
echo ""
echo "🔍 Verifying service..."
sleep 3

if ssh $TARGET_HOST "netstat -tlnp | grep :3002 || ss -tlnp | grep :3002"; then
  echo "✅ Service is listening on port 3002"
else
  echo "❌ Service is NOT listening on port 3002"
  echo "Check logs: ssh $TARGET_HOST 'pm2 logs $SERVICE_NAME'"
  exit 1
fi

# Step 7: Test health endpoint
echo ""
echo "🏥 Testing health endpoint..."
if ssh $TARGET_HOST "curl -s http://localhost:3002/health | grep -q healthy"; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

# Step 8: Test CORS headers
echo ""
echo "🌐 Testing CORS headers..."
ssh $TARGET_HOST "curl -s -H 'Origin: https://www.sidekickportal.com' -I http://localhost:3002/health | grep -i 'access-control-allow-origin'" && echo "✅ CORS headers present" || echo "⚠️  CORS headers not found"

# Success!
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                                    ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Service:     chat-backend                                 ║"
echo "║  Host:        ORACLE (192.168.50.77)                       ║"
echo "║  Port:        3002                                         ║"
echo "║  Public URL:  https://orion-chat.sidekickportal.com        ║"
echo "║  Health:      http://192.168.50.77:3002/health             ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Management Commands:                                      ║"
echo "║    ssh $TARGET_HOST 'pm2 status $SERVICE_NAME'             ║"
echo "║    ssh $TARGET_HOST 'pm2 logs $SERVICE_NAME'               ║"
echo "║    ssh $TARGET_HOST 'pm2 restart $SERVICE_NAME'            ║"
echo "║    ssh $TARGET_HOST 'pm2 stop $SERVICE_NAME'               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
