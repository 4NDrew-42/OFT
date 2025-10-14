#!/bin/bash
# Phase 1 Backend Deployment Script
# Deploys Phase 1 secured backend to production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET_HOST="192.168.50.77"
TARGET_PORT="3002"
TARGET_USER="root"
SOURCE_DIR="/tank/webhosting/sites/ai-marketplace/backend/chat-service"
TARGET_DIR="/opt/orion-chat-backend"
SERVICE_NAME="orion-chat-backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phase 1 Backend Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_USER@$TARGET_HOST:$TARGET_DIR"
echo "Port: $TARGET_PORT"
echo ""

# Step 1: Verify .env file exists
echo -e "${YELLOW}[1/8]${NC} Verifying .env file..."
if [ ! -f "$SOURCE_DIR/.env" ]; then
    echo -e "${RED}ERROR: .env file not found at $SOURCE_DIR/.env${NC}"
    echo "Please create .env file with production values before deploying."
    exit 1
fi
echo -e "${GREEN}✓${NC} .env file found"
echo ""

# Step 2: Verify dependencies
echo -e "${YELLOW}[2/8]${NC} Verifying dependencies..."
if [ ! -d "$SOURCE_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$SOURCE_DIR"
    npm install
fi
echo -e "${GREEN}✓${NC} Dependencies verified"
echo ""

# Step 3: Create deployment package
echo -e "${YELLOW}[3/8]${NC} Creating deployment package..."
TEMP_DIR=$(mktemp -d)
cp -r "$SOURCE_DIR"/* "$TEMP_DIR/"
# Exclude .git and other unnecessary files
rm -rf "$TEMP_DIR/.git" "$TEMP_DIR/node_modules/.cache" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Package created at $TEMP_DIR"
echo ""

# Step 4: Copy to target host
echo -e "${YELLOW}[4/8]${NC} Copying files to $TARGET_HOST..."
ssh "$TARGET_USER@$TARGET_HOST" "mkdir -p $TARGET_DIR"
rsync -avz --delete \
    --exclude 'node_modules/.cache' \
    --exclude '.git' \
    --exclude '.env' \
    "$TEMP_DIR/" "$TARGET_USER@$TARGET_HOST:$TARGET_DIR/"

# Copy .env file separately (preserve existing if present)
if [ -f "$SOURCE_DIR/.env" ]; then
  scp "$SOURCE_DIR/.env" "$TARGET_USER@$TARGET_HOST:$TARGET_DIR/.env"
  echo -e "${GREEN}✓${NC} Environment file copied"
fi

echo -e "${GREEN}✓${NC} Files copied"
echo ""

# Step 5: Install dependencies on target
echo -e "${YELLOW}[5/8]${NC} Installing dependencies on target..."
ssh "$TARGET_USER@$TARGET_HOST" "cd $TARGET_DIR && npm install --production"
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Step 6: Stop old service
echo -e "${YELLOW}[6/8]${NC} Stopping old service..."
ssh "$TARGET_USER@$TARGET_HOST" "
    # Try to stop systemd service
    systemctl stop $SERVICE_NAME 2>/dev/null || true
    
    # Try to stop PM2 process
    pm2 stop $SERVICE_NAME 2>/dev/null || true
    
    # Kill any process on port $TARGET_PORT
    lsof -ti:$TARGET_PORT | xargs kill -9 2>/dev/null || true
    
    echo 'Old service stopped'
"
echo -e "${GREEN}✓${NC} Old service stopped"
echo ""

# Step 7: Start Phase 1 service
echo -e "${YELLOW}[7/8]${NC} Starting Phase 1 service..."
ssh "$TARGET_USER@$TARGET_HOST" "
    cd $TARGET_DIR
    
    # Start with PM2 (recommended)
    if command -v pm2 &> /dev/null; then
        pm2 start server.js --name $SERVICE_NAME --env production
        pm2 save
        echo 'Service started with PM2'
    else
        # Fallback to nohup
        nohup node server.js > /var/log/$SERVICE_NAME.log 2>&1 &
        echo 'Service started with nohup'
    fi
"
echo -e "${GREEN}✓${NC} Phase 1 service started"
echo ""

# Step 8: Verify deployment
echo -e "${YELLOW}[8/8]${NC} Verifying deployment..."
sleep 3  # Give service time to start

# Test health endpoint
HEALTH_CHECK=$(ssh "$TARGET_USER@$TARGET_HOST" "curl -s http://localhost:$TARGET_PORT/health" || echo "FAILED")
if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Health check passed"
    echo "$HEALTH_CHECK" | jq . 2>/dev/null || echo "$HEALTH_CHECK"
else
    echo -e "${RED}✗${NC} Health check failed"
    echo "$HEALTH_CHECK"
    exit 1
fi
echo ""

# Test JWT middleware (should return 401)
AUTH_CHECK=$(ssh "$TARGET_USER@$TARGET_HOST" "curl -s -w '%{http_code}' -o /dev/null http://localhost:$TARGET_PORT/api/sessions/list")
if [ "$AUTH_CHECK" = "401" ] || [ "$AUTH_CHECK" = "400" ]; then
    echo -e "${GREEN}✓${NC} JWT middleware active (returned $AUTH_CHECK)"
else
    echo -e "${RED}✗${NC} JWT middleware check failed (returned $AUTH_CHECK, expected 401)"
fi
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Service: $SERVICE_NAME"
echo "Host: $TARGET_HOST"
echo "Port: $TARGET_PORT"
echo "Public URL: https://orion-chat.sidekickportal.com"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test public endpoint: curl https://orion-chat.sidekickportal.com/health"
echo "2. Run frontend validation tests"
echo "3. Verify all security tests pass"
echo "4. Update MCP memory with deployment results"
echo ""

