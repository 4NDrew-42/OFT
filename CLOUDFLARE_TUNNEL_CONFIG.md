# Cloudflare Tunnel Configuration

## Tunnel Details
- **Tunnel ID**: a43f3e03-edbc-4adc-adab-025d52917720
- **Tunnel Name**: ai-marketplace-tunnel
- **Config Location**: /root/.cloudflared/config.yml
- **Credentials**: /root/.cloudflared/a43f3e03-edbc-4adc-adab-025d52917720.json

## Routing Configuration

| Hostname | Service | Purpose |
|----------|---------|---------|
| sidekickportal.com | https://oft-1b3jvz2lf-4ndrew42s-projects.vercel.app | Frontend (Vercel) |
| api.sidekickportal.com | http://localhost:8081 | API Gateway |
| ws.sidekickportal.com | ws://localhost:3002 | WebSocket Service |
| orion-vector.sidekickportal.com | http://192.168.50.79:8081 | ORION Vector Service |
| orion-chat.sidekickportal.com | http://localhost:3002 | Chat Service |
| **fabric.sidekickportal.com** | **http://localhost:4001** | **AI Marketplace Backend (Notes + Calendar)** |

## Backend Services

### Port 4001: AI Marketplace Backend
- **Service**: Notes and Calendar APIs
- **CORS**: Configured for https://www.sidekickportal.com
- **Endpoints**:
  - `/api/notes/*` - Notes CRUD operations
  - `/api/calendar/*` - Calendar CRUD operations
- **Status**: Running in tmux session `ai-marketplace-backend`
- **Logs**: /tmp/ai-marketplace-backend.log

### Port 8089: Fabric Bridge API
- **Service**: Legacy Fabric AI integration
- **Status**: Available but not used by new frontend

## Management Commands

### Start Tunnel
```bash
tmux new-session -d -s cloudflare-tunnel "cloudflared tunnel run ai-marketplace-tunnel 2>&1 | tee /tmp/cloudflare-tunnel.log"
```

### Stop Tunnel
```bash
pkill cloudflared
```

### View Tunnel Logs
```bash
tail -f /tmp/cloudflare-tunnel.log
```

### Attach to Tunnel Session
```bash
tmux attach -t cloudflare-tunnel
```

## CORS Configuration

The backend at port 4001 is configured with the following CORS settings:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3005',
      'https://www.sidekickportal.com',
      'https://sidekickportal.com',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.trycloudflare\.com$/,
      /^https:\/\/.*\.ngrok\.io$/,
      /^https:\/\/.*\.sidekickportal\.com$/
    ];
    // ... validation logic
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

## Troubleshooting

### CORS Errors
1. Verify backend is running: `curl http://localhost:4001/api/calendar/events/user/test@example.com`
2. Check CORS headers: `curl -H "Origin: https://www.sidekickportal.com" -I http://localhost:4001/api/calendar/events/user/test@example.com`
3. Restart tunnel: `pkill cloudflared && tmux new-session -d -s cloudflare-tunnel "cloudflared tunnel run ai-marketplace-tunnel"`
4. Wait 30-60 seconds for DNS propagation

### Backend Not Responding
1. Check if service is running: `ps aux | grep "node.*server.js"`
2. Check logs: `tail -f /tmp/ai-marketplace-backend.log`
3. Restart backend: See backend/ai-service/README.md

### Tunnel Not Connecting
1. Check tunnel status: `cloudflared tunnel list`
2. View tunnel logs: `tail -f /tmp/cloudflare-tunnel.log`
3. Verify credentials exist: `ls -la /root/.cloudflared/`

## Recent Changes

### 2025-10-06: Fixed CORS Issue
- **Problem**: fabric.sidekickportal.com was routing to port 8089 instead of 4001
- **Fix**: Updated config.yml to route fabric.sidekickportal.com to http://localhost:4001
- **Result**: CORS headers now properly passed from backend to frontend
