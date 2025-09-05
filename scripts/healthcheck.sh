#!/bin/bash

set -e

API_HOST="localhost"
API_PORT="3000"
TIMEOUT="10"
MAX_RESPONSE_TIME="5000"
HEALTH_URL="http://${API_HOST}:${API_PORT}/health"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
SILENT=${SILENT:-false}

log() {
    if [ "$SILENT" != "true" ]; then
        echo -e "${GREEN}[HEALTH]${NC} $1"
    fi
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    if [ "$SILENT" != "true" ]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

check_port() {
    if ! ss -tlnp | grep -q ":${API_PORT} "; then
        error "Port ${API_PORT} is not listening"
        return 1
    fi
    log "Port ${API_PORT} is listening"
    return 0
}

check_api_response() {
    local start_time=$(date +%s%3N)
    
    local response=$(curl -s --max-time "$TIMEOUT" --write-out "\n%{http_code}\n%{time_total}" "$HEALTH_URL" 2>/dev/null)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        error "Failed to connect to API (curl exit code: $exit_code)"
        return 1
    fi
    local body=$(echo "$response" | head -n -2)
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local response_time=$(echo "$response" | tail -n 1)
    if [ "$http_code" != "200" ]; then
        error "API returned HTTP $http_code (expected 200)"
        return 1
    fi
    local response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)
    if [ "$response_time_ms" -gt "$MAX_RESPONSE_TIME" ]; then
        warning "API response time ${response_time_ms}ms exceeds threshold ${MAX_RESPONSE_TIME}ms"
    else
        log "API responded in ${response_time_ms}ms"
    fi
    if command -v jq >/dev/null 2>&1; then
        local status=$(echo "$body" | jq -r '.status // "unknown"')
        local uptime=$(echo "$body" | jq -r '.uptime // "unknown"')
        local db_status=$(echo "$body" | jq -r '.database.status // "unknown"')
        local redis_status=$(echo "$body" | jq -r '.cache.status // "unknown"')
        
        if [ "$status" != "ok" ]; then
            error "API status is '$status' (expected 'ok')"
            return 1
        fi
        
        if [ "$db_status" != "connected" ]; then
            warning "Database status: $db_status"
        fi
        
        if [ "$redis_status" != "connected" ]; then
            warning "Redis status: $redis_status"
        fi
        
        log "API status: $status, uptime: $uptime"
        log "Database: $db_status, Redis: $redis_status"
    else
        if echo "$body" | grep -q '"status":"ok"'; then
            log "API status: ok"
        else
            error "API status check failed"
            return 1
        fi
    fi
    
    return 0
}

check_database() {
    if [ -f ".env" ]; then
        source .env
    fi
    
    if command -v mysql >/dev/null 2>&1 && [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
        if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
            log "Database connection: OK"
        else
            warning "Direct database connection failed"
            return 1
        fi
    else
        log "Skipping direct database check (mysql client not available or env vars missing)"
    fi
    
    return 0
}

check_redis() {
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping >/dev/null 2>&1; then
            log "Redis connection: OK"
        else
            warning "Direct Redis connection failed"
            return 1
        fi
    else
        log "Skipping direct Redis check (redis-cli not available)"
    fi
    
    return 0
}

main() {
    local overall_status=0
    
    log "Starting health check for Ethnos API..."
    if ! check_port; then
        overall_status=1
    fi
    if ! check_api_response; then
        overall_status=1
    fi
    
    check_database || true
    check_redis || true
    
    if [ $overall_status -eq 0 ]; then
        log "Health check passed ✅"
    else
        error "Health check failed ❌"
    fi
    
    exit $overall_status
}

case "${1:-}" in
    --silent)
        SILENT=true
        main
        ;;
    --port-only)
        check_port
        ;;
    --api-only)
        check_api_response
        ;;
    --help)
        echo "Ethnos API Health Check Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --silent     Run in silent mode (no output unless error)"
        echo "  --port-only  Check only if port is listening"
        echo "  --api-only   Check only API response"
        echo "  --help       Show this help message"
        echo ""
        echo "Exit codes:"
        echo "  0 = healthy"
        echo "  1 = unhealthy"
        exit 0
        ;;
    *)
        main
        ;;
esac