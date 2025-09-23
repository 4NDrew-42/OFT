# AI Marketplace Full Stack Deployment Guide

## 🎯 Architecture Overview

**GitHub → Vercel → Cloudflare Tunnels → Local Backend**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GitHub    │───▶│   Vercel    │───▶│ Cloudflare  │───▶│Local Backend│
│ (Frontend)  │    │ (Hosting)   │    │ (Tunnels)   │    │ (Services)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## 🚀 Services Architecture

### Frontend (Vercel)
- **Next.js App**: Deployed on Vercel from GitHub
- **Environment**: Production build with environment variables
- **Domain**: `your-app.vercel.app` or custom domain

### Backend Services (Local + Tunneled)
1. **AI Service** (Port 4001)
   - Vector search API
   - Product recommendations
   - ORION-CORE integration

2. **WebSocket Service** (Port 3004)
   - Real-time content feed
   - User interaction updates
   - Live notifications

3. **ORION-CORE Services** (192.168.50.79)
   - Vector Service (8081)
   - Memory System
   - Analytics

## 📋 Step-by-Step Deployment

### 1. Backend Services Setup

#### Start AI Service
```bash
cd sites/ai-marketplace/backend/ai-service
npm install
npm start
# ✅ Running on http://localhost:4001
```

#### Start WebSocket Service
```bash
cd sites/ai-marketplace/backend/websocket-service
npm install
npm start
# ✅ Running on ws://localhost:3004
```

### 2. Cloudflare Tunnels Setup

#### Install cloudflared (if not installed)
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

#### Login to Cloudflare
```bash
cloudflared tunnel login
```

#### Create and Configure Tunnel
```bash
cd sites/ai-marketplace/backend
./setup-tunnels.sh
```

#### Start Tunnel
```bash
cloudflared tunnel --config cloudflare-tunnel.yml run
```

### 3. DNS Configuration

Add these DNS records in your Cloudflare dashboard:
```
ai-marketplace-api.your-domain.com    → CNAME → tunnel-id.cfargotunnel.com
ai-marketplace-ws.your-domain.com     → CNAME → tunnel-id.cfargotunnel.com
ai-marketplace-vector.your-domain.com → CNAME → tunnel-id.cfargotunnel.com
```

### 4. Vercel Environment Variables

In your Vercel project settings, add:
```env
NEXT_PUBLIC_API_URL=https://ai-marketplace-api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://ai-marketplace-ws.your-domain.com
NEXT_PUBLIC_ORION_API_URL=https://ai-marketplace-vector.your-domain.com
NEXT_PUBLIC_VERCEL_ENV=production
NEXT_PUBLIC_ORION_ANALYTICS_ENABLED=true
```

### 5. GitHub Integration

1. Push changes to GitHub
2. Vercel automatically deploys
3. Environment variables are applied
4. Frontend connects to tunneled backend

## 🔧 Frontend Components Functionality

### "Explore the Catalog" (OrionVectorSearch)
**What it does:**
- AI-powered vector search using ORION-CORE
- Text search with semantic understanding
- Image upload for visual similarity search
- Voice search capability
- Advanced filtering (price, category, style, AI score)
- Real-time search suggestions

**Expected behavior:**
- Type query → API call to `/api/ai/search/vector`
- Returns artwork results with similarity scores
- Displays results in grid with hover effects
- Click result → detailed view

### "Dynamic Feed" (DynamicContentFeed)
**What it does:**
- Real-time content stream via WebSocket
- Personalized recommendations based on user behavior
- Infinite scroll with lazy loading
- Multiple content types (products, trending, AI-curated)
- Live engagement metrics (views, likes, shares)

**Expected behavior:**
- Connects to WebSocket on load
- Receives initial content batch
- Streams new content every 10 seconds
- Updates engagement metrics in real-time
- Infinite scroll loads more content

## 🐛 Troubleshooting

### WebSocket Connection Issues
```javascript
// Check browser console for:
WebSocket connection to 'wss://ai-marketplace-ws.your-domain.com' failed
```
**Solution:** Ensure WebSocket service is running and tunnel is active

### API 404 Errors
```javascript
// Check browser console for:
POST https://ai-marketplace-api.your-domain.com/api/ai/search/vector 404
```
**Solution:** Verify AI service is running and tunnel configuration is correct

### ORION-CORE Connection
```javascript
// Check for:
ORION-CORE vector service unavailable, using mock results
```
**Solution:** This is expected fallback behavior when ORION-CORE is unavailable

## 📊 Service Health Checks

### Check All Services
```bash
# AI Service
curl http://localhost:4001/health

# WebSocket Service  
curl http://localhost:3004/health

# ORION-CORE Vector
curl http://192.168.50.79:8081/health
```

### Check Tunnels
```bash
# List active tunnels
cloudflared tunnel list

# Check tunnel status
cloudflared tunnel info ai-marketplace-backend
```

## 🎉 Expected User Experience

1. **Visit Vercel URL** → Frontend loads from Vercel
2. **Search for "abstract art"** → API call through Cloudflare tunnel → Local AI service → Returns results
3. **View Dynamic Feed** → WebSocket connects through tunnel → Streams real-time content
4. **Upload image** → Image search via vector similarity → ORION-CORE processing
5. **Real-time updates** → New content appears automatically via WebSocket

The full stack is now connected: **GitHub → Vercel → Cloudflare → Local Backend** ✅
