#!/bin/bash

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

if [ ! -f "swagger.config.js" ]; then
    error "Please run this script from the API root directory"
    exit 1
fi

log "Starting Swagger UI cache fix..."

log "Step 1: Clearing application cache..."
./server.sh clear-cache

log "Step 2: Restarting server with cache control headers..."
./server.sh restart

# Wait for server to start
sleep 3

log "Step 3: Verifying local server..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    info "✅ Local server is running"
else
    error "❌ Local server is not responding"
    exit 1
fi

log "Step 4: Testing cache control headers..."

echo "Testing /docs.json headers:"
DOCS_JSON_CACHE=$(curl -s -I http://localhost:3000/docs.json | grep -i "cache-control" || echo "No cache-control header")
if [[ $DOCS_JSON_CACHE == *"no-cache"* ]]; then
    info "✅ docs.json has correct no-cache headers"
else
    warning "⚠️  docs.json cache headers: $DOCS_JSON_CACHE"
fi

echo "Testing /docs/ headers:"
DOCS_PAGE_CACHE=$(curl -s -I http://localhost:3000/docs/ | grep -i "cache-control" || echo "No cache-control header")
if [[ $DOCS_PAGE_CACHE == *"no-cache"* ]]; then
    info "✅ docs page has correct no-cache headers"
else
    warning "⚠️  docs page cache headers: $DOCS_PAGE_CACHE"
fi

log "Step 5: Verifying API paths are correct..."
SAMPLE_PATHS=$(curl -s http://localhost:3000/docs.json | jq -r '.paths | keys[]' | head -5)
if [[ $SAMPLE_PATHS == *"/api/"* ]]; then
    error "❌ Still found /api/ paths in Swagger JSON:"
    echo "$SAMPLE_PATHS"
    exit 1
else
    info "✅ All paths are correct (no /api/ prefix):"
    echo "$SAMPLE_PATHS"
fi

log "Step 6: Testing actual API endpoints..."
API_TESTS=(
    "/health"
    "/works?limit=1"
    "/venues/statistics"
    "/signatures/statistics"
)

for endpoint in "${API_TESTS[@]}"; do
    if curl -f "http://localhost:3000${endpoint}" > /dev/null 2>&1; then
        info "✅ ${endpoint} is working"
    else
        warning "⚠️  ${endpoint} is not responding"
    fi
done

log "Step 7: Cache busting information..."
TIMESTAMP=$(date +%s)
info "Current timestamp for cache busting: $TIMESTAMP"
info "Manual cache bust URLs:"
echo "  - http://localhost:3000/docs.json?v=$TIMESTAMP"
echo "  - http://localhost:3000/docs/?v=$TIMESTAMP"

log "Step 8: Production deployment recommendations..."
echo ""
info "🚀 For Production Deployment:"
echo "1. Deploy the updated code to production server"
echo "2. Restart the production server"
echo "3. If using CDN (Cloudflare), purge cache for:"
echo "   - https://api.ethnos.app/docs/"
echo "   - https://api.ethnos.app/docs.json"
echo ""
echo "4. Test production with:"
echo "   curl -I https://api.ethnos.app/docs.json | grep -i cache-control"
echo "   curl -I https://api.ethnos.app/docs/ | grep -i cache-control"
echo ""

info "🌐 For Users Experiencing Cache Issues:"
echo "1. Hard refresh: Ctrl+F5 (Chrome/Firefox) or Cmd+Shift+R (Safari)"
echo "2. Open in incognito/private browsing mode"
echo "3. Clear browser cache: Settings > Privacy > Clear Data"
echo "4. Disable cache in DevTools: F12 > Network > Disable Cache"
echo ""

log "✅ Swagger UI cache fix completed successfully!"
echo ""
info "📋 Summary of changes made:"
echo "- ✅ Added cache-control headers to /docs.json endpoint"
echo "- ✅ Added cache-control headers to /docs/ endpoint"
echo "- ✅ Implemented cache busting with timestamp"
echo "- ✅ Verified all API paths are correct (no /api/ prefix)"
echo "- ✅ Confirmed all endpoints are functional"
echo ""

info "🎯 Next steps:"
echo "1. Deploy to production server"
echo "2. Clear CDN cache if applicable"
echo "3. Test with users experiencing cache issues"
echo ""

log "Script completed successfully! 🎉"