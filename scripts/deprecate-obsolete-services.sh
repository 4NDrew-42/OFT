#!/bin/bash

# AI Marketplace - Safe Service Deprecation Script
# Date: 2025-10-15
# Purpose: Archive obsolete backend services after verification

set -e  # Exit on error

REMOTE_HOST="root@192.168.50.77"
ARCHIVE_DATE=$(date +%Y%m%d)
ARCHIVE_DIR="/opt/deprecated/${ARCHIVE_DATE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AI Marketplace - Service Deprecation Script              ║${NC}"
echo -e "${BLUE}║  Date: ${ARCHIVE_DATE}                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo

# ============================================================================
# PHASE 1: VERIFICATION
# ============================================================================

echo -e "${YELLOW}[PHASE 1] Verifying Production Services...${NC}"
echo

# 1.1 Check PM2 process
echo -e "${BLUE}→ Checking PM2 process...${NC}"
PM2_STATUS=$(ssh $REMOTE_HOST "pm2 list | grep chat-backend" || echo "NOT_FOUND")

if [[ "$PM2_STATUS" == "NOT_FOUND" ]]; then
  echo -e "${RED}✗ ERROR: chat-backend PM2 process not found!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ PM2 process 'chat-backend' is running${NC}"
echo "$PM2_STATUS"
echo

# 1.2 Check PM2 process directory
echo -e "${BLUE}→ Checking PM2 process directory...${NC}"
PM2_DIR=$(ssh $REMOTE_HOST "pm2 describe chat-backend | grep 'exec cwd' | awk '{print \$NF}'")

if [[ "$PM2_DIR" != "/opt/chat-backend" ]]; then
  echo -e "${RED}✗ ERROR: PM2 process running from unexpected directory: $PM2_DIR${NC}"
  echo -e "${RED}  Expected: /opt/chat-backend${NC}"
  exit 1
fi

echo -e "${GREEN}✓ PM2 process running from correct directory: $PM2_DIR${NC}"
echo

# 1.3 Check health endpoint
echo -e "${BLUE}→ Checking backend health endpoint...${NC}"
HEALTH_CHECK=$(curl -s "https://orion-chat.sidekickportal.com/health" | jq -r '.status' 2>/dev/null || echo "FAILED")

if [[ "$HEALTH_CHECK" != "healthy" ]]; then
  echo -e "${RED}✗ ERROR: Health check failed! Response: $HEALTH_CHECK${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Backend health check passed${NC}"
echo

# 1.4 Check JWT secret synchronization
echo -e "${BLUE}→ Checking JWT secret synchronization...${NC}"

# Get frontend secret (first 8 chars)
cd /tank/webhosting/sites/ai-marketplace/frontend/apps/web
vercel env pull .env.production.local --environment=production --yes > /dev/null 2>&1
FRONTEND_SECRET=$(grep ORION_SHARED_JWT_SECRET .env.production.local | cut -d'=' -f2 | tr -d '"' | head -c 8)
rm .env.production.local

# Get backend secret (first 8 chars)
BACKEND_SECRET=$(ssh $REMOTE_HOST "grep ORION_SHARED_JWT_SECRET /opt/chat-backend/.env | cut -d'=' -f2 | head -c 8")

if [[ "$FRONTEND_SECRET" != "$BACKEND_SECRET" ]]; then
  echo -e "${RED}✗ ERROR: JWT secret mismatch!${NC}"
  echo -e "${RED}  Frontend: $FRONTEND_SECRET...${NC}"
  echo -e "${RED}  Backend:  $BACKEND_SECRET...${NC}"
  exit 1
fi

echo -e "${GREEN}✓ JWT secrets synchronized (${FRONTEND_SECRET}...)${NC}"
echo

echo -e "${GREEN}[PHASE 1] ✓ All verification checks passed!${NC}"
echo
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo

# ============================================================================
# PHASE 2: USER CONFIRMATION
# ============================================================================

echo -e "${YELLOW}[PHASE 2] Deprecation Plan${NC}"
echo
echo "The following services will be archived:"
echo
echo "  1. /opt/orion-chat-backend/"
echo "     → ${ARCHIVE_DIR}/orion-chat-backend-phase1-unused/"
echo "     Reason: Created during Phase 1 but never deployed to PM2"
echo
echo "  2. /opt/chat-backend-backups/"
echo "     → ${ARCHIVE_DIR}/chat-backend-backups-pre-phase1/"
echo "     Reason: Manual backups from before Phase 1"
echo
echo "  3. /opt/orion/ (if obsolete)"
echo "     → ${ARCHIVE_DIR}/orion-old-aug2025/"
echo "     Reason: Old ORION directory from August 2025"
echo
echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
echo

read -p "Do you want to proceed with archival? (yes/no): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
  echo -e "${YELLOW}Aborted by user.${NC}"
  exit 0
fi

echo

# ============================================================================
# PHASE 3: CREATE ARCHIVE DIRECTORY
# ============================================================================

echo -e "${YELLOW}[PHASE 3] Creating Archive Directory...${NC}"
echo

ssh $REMOTE_HOST "mkdir -p ${ARCHIVE_DIR}"
echo -e "${GREEN}✓ Created ${ARCHIVE_DIR}${NC}"
echo

# ============================================================================
# PHASE 4: ARCHIVE SERVICES
# ============================================================================

echo -e "${YELLOW}[PHASE 4] Archiving Obsolete Services...${NC}"
echo

# 4.1 Archive /opt/orion-chat-backend/
echo -e "${BLUE}→ Archiving /opt/orion-chat-backend/...${NC}"

if ssh $REMOTE_HOST "[ -d /opt/orion-chat-backend ]"; then
  ssh $REMOTE_HOST "
    mv /opt/orion-chat-backend ${ARCHIVE_DIR}/orion-chat-backend-phase1-unused &&
    cat > ${ARCHIVE_DIR}/orion-chat-backend-phase1-unused/DEPRECATED.txt << 'EOF'
DEPRECATED: 2025-10-15

This directory was created during Phase 1 Security Hardening implementation
but was never deployed to PM2. The active production service is located at
/opt/chat-backend/.

Reason for Deprecation:
- Created as part of Phase 1 Security implementation
- Contains correct JWT middleware in middleware/jwt-verify.js
- Had correct JWT secret in .env but was never used
- PM2 process 'chat-backend' runs from /opt/chat-backend/ instead

This directory is kept for historical reference only.

Active Service: /opt/chat-backend/
PM2 Process: chat-backend
Public URL: https://orion-chat.sidekickportal.com

Archived by: deprecate-obsolete-services.sh
EOF
  "
  echo -e "${GREEN}✓ Archived to ${ARCHIVE_DIR}/orion-chat-backend-phase1-unused/${NC}"
else
  echo -e "${YELLOW}⊘ /opt/orion-chat-backend/ not found, skipping${NC}"
fi

echo

# 4.2 Archive /opt/chat-backend-backups/
echo -e "${BLUE}→ Archiving /opt/chat-backend-backups/...${NC}"

if ssh $REMOTE_HOST "[ -d /opt/chat-backend-backups ]"; then
  ssh $REMOTE_HOST "
    mv /opt/chat-backend-backups ${ARCHIVE_DIR}/chat-backend-backups-pre-phase1 &&
    cat > ${ARCHIVE_DIR}/chat-backend-backups-pre-phase1/DEPRECATED.txt << 'EOF'
DEPRECATED: 2025-10-15

Manual backups created before Phase 1 Security Hardening implementation.

These backups are no longer needed as the codebase is now version-controlled
in Git and deployed via automated scripts.

Active Service: /opt/chat-backend/
Repository: /tank/webhosting/sites/ai-marketplace/backend/chat-service/

Archived by: deprecate-obsolete-services.sh
EOF
  "
  echo -e "${GREEN}✓ Archived to ${ARCHIVE_DIR}/chat-backend-backups-pre-phase1/${NC}"
else
  echo -e "${YELLOW}⊘ /opt/chat-backend-backups/ not found, skipping${NC}"
fi

echo

# 4.3 Check and possibly archive /opt/orion/
echo -e "${BLUE}→ Checking /opt/orion/...${NC}"

if ssh $REMOTE_HOST "[ -d /opt/orion ]"; then
  ORION_SIZE=$(ssh $REMOTE_HOST "du -sh /opt/orion | cut -f1")
  ORION_MODIFIED=$(ssh $REMOTE_HOST "stat -c %y /opt/orion | cut -d' ' -f1")
  
  echo "  Directory exists:"
  echo "  - Size: $ORION_SIZE"
  echo "  - Last modified: $ORION_MODIFIED"
  echo
  
  read -p "  Archive /opt/orion/? (yes/no): " ARCHIVE_ORION
  
  if [[ "$ARCHIVE_ORION" == "yes" ]]; then
    ssh $REMOTE_HOST "
      mv /opt/orion ${ARCHIVE_DIR}/orion-old-aug2025 &&
      cat > ${ARCHIVE_DIR}/orion-old-aug2025/DEPRECATED.txt << 'EOF'
DEPRECATED: 2025-10-15

Old ORION directory from August 2025.

Last modified: $ORION_MODIFIED
Size: $ORION_SIZE

This directory predates the current AI Marketplace implementation and is
no longer used in production.

Active Service: /opt/chat-backend/

Archived by: deprecate-obsolete-services.sh
EOF
    "
    echo -e "${GREEN}✓ Archived to ${ARCHIVE_DIR}/orion-old-aug2025/${NC}"
  else
    echo -e "${YELLOW}⊘ Skipped by user${NC}"
  fi
else
  echo -e "${YELLOW}⊘ /opt/orion/ not found, skipping${NC}"
fi

echo

# ============================================================================
# PHASE 5: CREATE DOCUMENTATION
# ============================================================================

echo -e "${YELLOW}[PHASE 5] Creating Documentation...${NC}"
echo

# 5.1 Create ACTIVE_SERVICES.md
echo -e "${BLUE}→ Creating /opt/ACTIVE_SERVICES.md...${NC}"

ssh $REMOTE_HOST "cat > /opt/ACTIVE_SERVICES.md << 'EOF'
# Active Production Services on 192.168.50.77

**Last Updated**: $(date +%Y-%m-%d)

## Chat Backend Service

- **Directory**: \`/opt/chat-backend/\`
- **PM2 Process**: \`chat-backend\`
- **Port**: 3002
- **Public URL**: \`https://orion-chat.sidekickportal.com\`
- **Source Repository**: \`/tank/webhosting/sites/ai-marketplace/backend/chat-service/\`
- **Environment File**: \`/opt/chat-backend/.env\`
- **Deployment Script**: \`/opt/chat-backend/deploy.sh\`

### Critical Configuration

- **JWT Secret**: Synchronized with frontend (Vercel env: \`ORION_SHARED_JWT_SECRET\`)
- **Database**: PostgreSQL at \`192.168.50.79:5432/orion_core\`
- **Redis**: \`192.168.50.79:6379/0\`
- **Authorized User**: \`jamesandrewklein@gmail.com\`

### Restart Command

\`\`\`bash
cd /opt/chat-backend && pm2 restart chat-backend --update-env
\`\`\`

### Health Check

\`\`\`bash
curl -s https://orion-chat.sidekickportal.com/health | jq '.'
\`\`\`

## Deprecated Services

See \`/opt/deprecated/\` for archived services.

Last archival: ${ARCHIVE_DATE}
EOF
"

echo -e "${GREEN}✓ Created /opt/ACTIVE_SERVICES.md${NC}"
echo

# 5.2 Create archive index
echo -e "${BLUE}→ Creating archive index...${NC}"

ssh $REMOTE_HOST "cat > ${ARCHIVE_DIR}/README.md << 'EOF'
# Deprecated Services Archive - ${ARCHIVE_DATE}

This directory contains services that were deprecated on ${ARCHIVE_DATE}.

## Archived Services

1. **orion-chat-backend-phase1-unused/**
   - Original location: \`/opt/orion-chat-backend/\`
   - Reason: Created during Phase 1 but never deployed to PM2
   - See \`DEPRECATED.txt\` for details

2. **chat-backend-backups-pre-phase1/**
   - Original location: \`/opt/chat-backend-backups/\`
   - Reason: Manual backups from before Phase 1
   - See \`DEPRECATED.txt\` for details

3. **orion-old-aug2025/** (if archived)
   - Original location: \`/opt/orion/\`
   - Reason: Old ORION directory from August 2025
   - See \`DEPRECATED.txt\` for details

## Active Production Service

**Location**: \`/opt/chat-backend/\`  
**PM2 Process**: \`chat-backend\`  
**Public URL**: \`https://orion-chat.sidekickportal.com\`

See \`/opt/ACTIVE_SERVICES.md\` for current production architecture.

---

Archived by: deprecate-obsolete-services.sh
Date: ${ARCHIVE_DATE}
EOF
"

echo -e "${GREEN}✓ Created ${ARCHIVE_DIR}/README.md${NC}"
echo

# ============================================================================
# PHASE 6: FINAL VERIFICATION
# ============================================================================

echo -e "${YELLOW}[PHASE 6] Final Verification...${NC}"
echo

# 6.1 Verify PM2 still running
echo -e "${BLUE}→ Verifying PM2 process...${NC}"
PM2_FINAL=$(ssh $REMOTE_HOST "pm2 list | grep chat-backend | grep online" || echo "NOT_RUNNING")

if [[ "$PM2_FINAL" == "NOT_RUNNING" ]]; then
  echo -e "${RED}✗ ERROR: PM2 process not running after archival!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ PM2 process still running${NC}"
echo

# 6.2 Verify health endpoint
echo -e "${BLUE}→ Verifying health endpoint...${NC}"
HEALTH_FINAL=$(curl -s "https://orion-chat.sidekickportal.com/health" | jq -r '.status' 2>/dev/null || echo "FAILED")

if [[ "$HEALTH_FINAL" != "healthy" ]]; then
  echo -e "${RED}✗ ERROR: Health check failed after archival!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Health endpoint still responding${NC}"
echo

# ============================================================================
# COMPLETION
# ============================================================================

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deprecation Complete!                                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo
echo "Summary:"
echo "  - Archived services to: ${ARCHIVE_DIR}/"
echo "  - Created documentation: /opt/ACTIVE_SERVICES.md"
echo "  - Production service verified and running"
echo
echo "Next steps:"
echo "  1. Review archived services in ${ARCHIVE_DIR}/"
echo "  2. Update repository documentation"
echo "  3. Commit changes to Git"
echo
echo -e "${BLUE}Documentation:${NC}"
echo "  - Current architecture: sites/ai-marketplace/CURRENT_ARCHITECTURE.md"
echo "  - Deprecation analysis: sites/ai-marketplace/DEPRECATION_ANALYSIS.md"
echo

exit 0

