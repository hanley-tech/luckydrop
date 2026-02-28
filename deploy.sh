#!/bin/bash
# Deploy LuckyDrop to a remote server via SSH + PM2
# Configure connection details in .env.local

set -e

# Load environment from .env.local
if [ -f "$(dirname "$0")/.env.local" ]; then
  set -a
  source "$(dirname "$0")/.env.local"
  set +a
fi

SERVER_USER="${DEPLOY_SERVER_USER:?Set DEPLOY_SERVER_USER in .env.local}"
SERVER_IP="${DEPLOY_SERVER_IP:?Set DEPLOY_SERVER_IP in .env.local}"
SERVER="${SERVER_USER}@${SERVER_IP}"
KEY="${DEPLOY_SSH_KEY:?Set DEPLOY_SSH_KEY in .env.local}"
REMOTE_PATH="${DEPLOY_REMOTE_PATH:?Set DEPLOY_REMOTE_PATH in .env.local}"
DOMAIN="${DEPLOY_DOMAIN:?Set DEPLOY_DOMAIN in .env.local}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"
LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

KEY_EXPANDED="${KEY/#\~/$HOME}"
[ ! -f "$KEY_EXPANDED" ] && error "SSH key not found at $KEY"

# Step 1: Build locally
info "Building Next.js for production..."
cd "$LOCAL_PATH"
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npm run build || error "Build failed"

# Step 2: Create remote directory
info "Creating remote directory..."
ssh -i "$KEY" "$SERVER" "mkdir -p $REMOTE_PATH"

# Step 3: Sync files
info "Syncing files to $SERVER:$REMOTE_PATH..."
rsync -avz --delete \
    --exclude='.git' \
    --exclude='.claude' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.luckydrop.log' \
    --exclude='.luckydrop.pid' \
    --exclude='deploy.sh' \
    --exclude='.DS_Store' \
    -e "ssh -i $KEY" \
    "$LOCAL_PATH/" "$SERVER:$REMOTE_PATH/"

# Step 4: Install dependencies on server
info "Installing production dependencies..."
ssh -i "$KEY" "$SERVER" "cd $REMOTE_PATH && npm install --production"

# Step 5: Restart PM2 process
info "Restarting PM2 process..."
ssh -i "$KEY" "$SERVER" "cd $REMOTE_PATH && (pm2 delete luckydrop 2>/dev/null || true) && pm2 start ecosystem.config.js && pm2 save"

info "Deploy complete!"
echo ""
info "Display:  https://${DOMAIN}${BASE_PATH}/"
info "Join:     https://${DOMAIN}${BASE_PATH}/join"
info "Operator: https://${DOMAIN}${BASE_PATH}/operator"
echo ""
warn "Remember to update Nginx config if this is the first deploy!"
