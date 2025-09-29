# ORION-CORE Infrastructure Configuration

## Cloudflare Tunnel Configuration

### Tunnel: ai-marketplace-tunnel (a43f3e03-edbc-4adc-adab-025d52917720)

**Location**: `/root/.cloudflared/config.yml`

```yaml
tunnel: a43f3e03-edbc-4adc-adab-025d52917720
credentials-file: /root/.cloudflared/a43f3e03-edbc-4adc-adab-025d52917720.json

ingress:
  - hostname: orion-vector.sidekickportal.com
    service: http://localhost:8081
  - hostname: orion-chat.sidekickportal.com
    service: http://localhost:3002
  - hostname: fabric.sidekickportal.com
    service: http://localhost:8089
  - service: http_status:404
```

### DNS Routes Configured
- `orion-vector.sidekickportal.com` → ORION Vector Service (192.168.50.79:8081)
- `orion-chat.sidekickportal.com` → Enhanced Chat Service (192.168.50.79:3002)
- `fabric.sidekickportal.com` → Fabric Bridge Service (192.168.50.79:8089)

## Vercel Environment Variables (Production)

### ORION-CORE Service URLs
- `NEXT_PUBLIC_STATUS_URL`: `https://orion-vector.sidekickportal.com/health`
- `NEXT_PUBLIC_CHAT_STREAM_URL`: `https://orion-chat.sidekickportal.com/api/chat`
- `NEXT_PUBLIC_OCR_URL`: `https://fabric.sidekickportal.com/api/ocr/receipt`

### JWT Authentication
- `ORION_SHARED_JWT_SECRET`: [Encrypted]
- `ORION_SHARED_JWT_ISS`: [Encrypted] 
- `ORION_SHARED_JWT_AUD`: [Encrypted]

### OAuth Configuration
- `GOOGLE_CLIENT_ID`: [Encrypted]
- `GOOGLE_CLIENT_SECRET`: [Encrypted]
- `NEXTAUTH_SECRET`: [Encrypted]
- `NEXTAUTH_URL`: `https://www.sidekickportal.com`

## Domain Configuration

### Primary Domains
- **Production**: `https://www.sidekickportal.com`
- **Redirect**: `https://sidekickportal.com` → `https://www.sidekickportal.com`

### DNS Configuration
- **Nameservers**: Cloudflare (`archer.ns.cloudflare.com`, `samara.ns.cloudflare.com`)
- **Proxy Status**: Enabled (Cloudflare proxies traffic to Vercel)
- **SSL**: Full (strict) - Cloudflare to Vercel

## ORION-CORE Service Integration

### System Status Endpoint
- **Frontend**: `/api/proxy/system-status`
- **Backend**: `https://orion-vector.sidekickportal.com/health`
- **Response**: ORION Vector service health data

### Enhanced Chat Endpoint  
- **Frontend**: `/api/proxy/chat-stream`
- **Backend**: `https://orion-chat.sidekickportal.com/api/chat`
- **Format**: POST JSON → SSE conversion for frontend compatibility

### Authentication Flow
1. Frontend generates JWT using centralized `buildOrionJWT()` utility
2. JWT includes: `iss`, `aud`, `sub`, `iat`, `exp` (5-minute TTL)
3. Backend services validate JWT using shared secret
4. All requests include `Authorization: Bearer <jwt>` header

## Deployment Status

### Last Updated: September 29, 2025
- ✅ Cloudflare tunnels configured and active
- ✅ Vercel environment variables updated
- ✅ Domain configuration verified
- ✅ ORION-CORE integration operational
- ✅ System status 404 errors resolved
- ✅ Enhanced Chat connectivity established

### Verification Commands
```bash
# Test system status
curl "https://www.sidekickportal.com/api/proxy/system-status?sub=test@example.com"

# Test chat stream
curl "https://www.sidekickportal.com/api/proxy/chat-stream?q=test&sub=test@example.com"

# Check environment configuration
curl "https://www.sidekickportal.com/api/debug/proxy-health"
```
