# 🎨 AI-Powered Art Marketplace

A dynamic, real-time marketplace for art, drawings, paintings, prints, and photos with AI-powered curation and video feeds.

## 🏗️ Architecture

### Frontend (Vercel)
- **Main App**: Next.js 14 with App Router
- **Motion**: Framer Motion + GSAP for rich animations
- **Real-time**: WebSocket integration for live updates
- **AI Features**: ORION-CORE powered search and recommendations

### Backend (Self-Hosted)
- **API Gateway**: Express.js with TypeScript
- **Media Service**: Video/image processing pipeline
- **AI Service**: ORION-CORE integration bridge
- **WebSocket Service**: Real-time features

### AI Integration (ORION-CORE)
- **Vector Search**: Product similarity and discovery
- **Smart Curation**: AI-powered content recommendations
- **Real-time Analysis**: Live content scoring and trends
- **Visual Search**: Image-based product discovery

## 🚀 Quick Start

### Development Setup
```bash
# Install dependencies
cd frontend && pnpm install
cd ../backend && npm install

# Start development servers
npm run dev:all
```

### Environment Variables
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
NEXT_PUBLIC_ORION_API_URL=http://localhost:8081

# Backend (.env)
ORION_VECTOR_API_BASE=http://192.168.50.79:8081
ORION_FABRIC_API_BASE=http://192.168.50.77:8089
REDIS_URL=redis://192.168.50.79:6379/0
DATABASE_URL=postgresql://orion:changeme@192.168.50.79:5432/orion_core
```

## 📁 Project Structure

```
ai-marketplace/
├── frontend/                    # Next.js apps and shared packages
│   ├── apps/web/               # Main marketplace application
│   ├── packages/ui/            # Design system components
│   └── packages/ai-features/   # ORION-CORE integration
├── backend/                    # API services
│   ├── api-gateway/           # Main API gateway
│   ├── ai-service/            # ORION-CORE bridge
│   └── websocket-service/     # Real-time features
└── config/                    # Infrastructure configurations
```

## 🎯 Features

### 🎬 Dynamic Content Feed
- **Infinite Scroll**: Optimized virtual scrolling
- **Real-time Updates**: Live product additions via WebSocket
- **Smart Curation**: AI-powered content ordering
- **Adaptive Loading**: Connection-aware media loading

### 🎨 Product Showcase
- **Rich Media**: High-resolution images with zoom/pan
- **Video Integration**: Live streams and historical content
- **Interactive Cards**: Hover effects and micro-animations
- **Smart Sorting**: AI-based product arrangement

### 🧠 AI-Powered Features
- **Visual Search**: Upload image to find similar artwork
- **Smart Recommendations**: "Users who liked this also viewed"
- **Color Search**: Find art by dominant color palette
- **Style Recognition**: Discover by artistic movement/technique

### 🎭 Motion & Animation
- **Page Transitions**: Smooth navigation between routes
- **Card Animations**: Staggered reveals and interactions
- **Loading States**: Skeleton screens and progressive enhancement
- **Gesture Support**: Swipe, pinch-to-zoom, pull-to-refresh

## 🔧 Development

### Running Services
```bash
# Start all services
npm run dev:all

# Individual services
npm run dev:frontend    # Next.js app on :3000
npm run dev:api         # API gateway on :3001
npm run dev:websocket   # WebSocket server on :3002
npm run dev:ai          # AI service on :3003
```

### Testing ORION-CORE Integration
```bash
# Test vector search
curl -X POST http://localhost:3003/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query": "abstract painting", "limit": 10}'

# Test recommendations
curl -X GET http://localhost:3003/api/ai/recommendations/user/123
```

## 📊 Monitoring

- **Frontend Analytics**: Vercel Analytics + Custom events
- **Backend Metrics**: Prometheus + Grafana dashboards
- **AI Performance**: ORION-CORE response times and accuracy
- **Real-time Metrics**: WebSocket connection health

## 🚢 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
cd frontend/apps/web
vercel --prod
```

### Backend (Docker)
```bash
# Build and deploy services
docker-compose up -d
```

---

Built with ❤️ using Next.js, ORION-CORE AI, and modern web technologies.