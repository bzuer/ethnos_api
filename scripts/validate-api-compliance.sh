#!/bin/bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    PASSED=$((PASSED + 1))
}

error() {
    echo -e "${RED}❌ $1${NC}"
    FAILED=$((FAILED + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

validate_endpoint() {
    local endpoint=$1
    local description=$2
    
    log "Testing: $endpoint - $description"
    
    local response=$(curl -s "$BASE_URL$endpoint" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        local has_status=$(echo "$response" | jq -r '.status // "missing"' 2>/dev/null)
        local has_data=$(echo "$response" | jq -r 'has("data")' 2>/dev/null)
        
        if [[ "$has_status" == "success" ]] && [[ "$has_data" == "true" ]]; then
            success "$endpoint - Format compliant"
        else
            error "$endpoint - Format non-compliant (status: $has_status, data: $has_data)"
        fi
    else
        error "$endpoint - Request failed"
    fi
}

echo "🔍 API Compliance Validation"
echo "============================="
echo ""

# Test key endpoints
validate_endpoint "/health" "Health check"
validate_endpoint "/works?limit=1" "Works list"
validate_endpoint "/persons?limit=1" "Persons list"
validate_endpoint "/venues?limit=1" "Venues list"
validate_endpoint "/signatures?limit=1" "Signatures list"
validate_endpoint "/search/works?q=test&limit=1" "Search works"

echo ""
echo "📊 Summary"
echo "=========="
log "Passed: $PASSED"
log "Failed: $FAILED"

if [[ $FAILED -eq 0 ]]; then
    success "All endpoints are compliant! 🎉"
    exit 0
else
    error "$FAILED endpoints failed validation"
    exit 1
fi