#!/bin/bash

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
AUDIT_LOG="logs/api-audit-$(date +%Y%m%d-%H%M%S).log"
TEMP_DIR="/tmp/api-audit"

# Create temp directory and log
mkdir -p logs "$TEMP_DIR"
touch "$AUDIT_LOG"

log() {
    local level=$1
    local message=$2
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$AUDIT_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
    log "SUCCESS" "$1"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING" "$1"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR" "$1"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO" "$1"
}

# Check if server is running
check_server() {
    info "Checking if server is running..."
    if curl -f "$BASE_URL/health" > /dev/null 2>&1; then
        success "Server is running at $BASE_URL"
        return 0
    else
        error "Server is not running at $BASE_URL"
        return 1
    fi
}

# Test endpoint format compliance
test_endpoint() {
    local method=$1
    local path=$2
    local expected_keys=$3
    local description=$4
    
    info "Testing: $method $path - $description"
    
    local start_time=$(date +%s%3N)
    local response_file="$TEMP_DIR/response_$(echo $path | tr '/' '_').json"
    local headers_file="$TEMP_DIR/headers_$(echo $path | tr '/' '_').txt"
    
    # Make request
    local status_code=$(curl -s -o "$response_file" -D "$headers_file" -w "%{http_code}" -X "$method" "$BASE_URL$path")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    # Check HTTP status
    if [[ $status_code -eq 200 ]]; then
        success "  Status: $status_code (OK)"
    else
        error "  Status: $status_code (Expected 200)"
        return 1
    fi
    
    # Check response time
    if [[ $response_time -lt 300 ]]; then
        success "  Response time: ${response_time}ms"
    elif [[ $response_time -lt 500 ]]; then
        warning "  Response time: ${response_time}ms (acceptable but slow)"
    else
        error "  Response time: ${response_time}ms (too slow)"
    fi
    
    # Parse JSON response
    if ! jq . "$response_file" > /dev/null 2>&1; then
        error "  Invalid JSON response"
        return 1
    fi
    
    # Check required keys
    local has_status=$(jq -r '.status // "missing"' "$response_file")
    local has_data=$(jq -r 'has("data")' "$response_file")
    
    if [[ "$has_status" == "success" ]]; then
        success "  Format: Has 'status: success'"
    elif [[ "$has_status" == "missing" ]]; then
        error "  Format: Missing 'status' field"
    else
        error "  Format: Invalid status value: $has_status"
    fi
    
    if [[ "$has_data" == "true" ]]; then
        success "  Format: Has 'data' field"
    else
        error "  Format: Missing 'data' field"
    fi
    
    # Check pagination for list endpoints
    if [[ $expected_keys == *"pagination"* ]]; then
        local has_pagination=$(jq -r 'has("pagination")' "$response_file")
        if [[ "$has_pagination" == "true" ]]; then
            success "  Format: Has 'pagination' field"
            
            # Check pagination structure
            local pagination_keys=$(jq -r '.pagination | keys[]' "$response_file" 2>/dev/null | sort | tr '\n' ' ')
            local expected_pagination_keys="hasNext hasPrev limit offset pages total"
            if [[ "$pagination_keys" == *"total"* ]] && [[ "$pagination_keys" == *"limit"* ]]; then
                success "  Pagination: Has required fields"
            else
                warning "  Pagination: Missing some standard fields"
                info "    Found: $pagination_keys"
                info "    Expected: $expected_pagination_keys"
            fi
        else
            error "  Format: Missing 'pagination' field for list endpoint"
        fi
    fi
    
    # Check data structure
    local data_type=$(jq -r '.data | type' "$response_file" 2>/dev/null)
    if [[ $expected_keys == *"array"* ]]; then
        if [[ "$data_type" == "array" ]]; then
            success "  Data: Correct array format"
            local count=$(jq -r '.data | length' "$response_file")
            info "    Records returned: $count"
        else
            error "  Data: Expected array, got $data_type"
        fi
    else
        if [[ "$data_type" == "object" ]] || [[ "$data_type" == "array" ]]; then
            success "  Data: Valid data structure ($data_type)"
        else
            warning "  Data: Unexpected data type: $data_type"
        fi
    fi
    
    # Check content-type - extract only the main content type
    local content_type=$(grep -i "^content-type:" "$headers_file" | cut -d: -f2 | sed 's/^ *//' | cut -d';' -f1 | tr -d '\r')
    if [[ "$content_type" == "application/json" ]]; then
        success "  Headers: Correct Content-Type"
    else
        warning "  Headers: Unexpected Content-Type: '$content_type'"
    fi
    
    echo ""
    return 0
}

# Test error endpoint
test_error_endpoint() {
    local path=$1
    local description=$2
    
    info "Testing Error: $path - $description"
    
    local response_file="$TEMP_DIR/error_response.json"
    local status_code=$(curl -s -o "$response_file" -w "%{http_code}" "$BASE_URL$path")
    
    if [[ $status_code -eq 404 ]] || [[ $status_code -eq 400 ]]; then
        success "  Status: $status_code (Expected error)"
        
        # Check error format
        local has_status=$(jq -r '.status // "missing"' "$response_file" 2>/dev/null)
        local has_message=$(jq -r 'has("message")' "$response_file" 2>/dev/null)
        
        if [[ "$has_status" == "error" ]]; then
            success "  Error Format: Has 'status: error'"
        else
            error "  Error Format: Missing or invalid status field"
        fi
        
        if [[ "$has_message" == "true" ]]; then
            success "  Error Format: Has 'message' field"
        else
            error "  Error Format: Missing 'message' field"
        fi
    else
        warning "  Status: $status_code (Expected 4xx error)"
    fi
    
    echo ""
}

# Main audit function
run_audit() {
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    echo -e "${PURPLE}🔍 API ENDPOINTS AUDIT STARTING${NC}"
    echo -e "${PURPLE}===============================${NC}"
    echo ""
    
    # Check server first
    if ! check_server; then
        error "Cannot proceed with audit - server not running"
        exit 1
    fi
    echo ""
    
    # WORKS SERVICE
    echo -e "${PURPLE}📚 WORKS SERVICE${NC}"
    echo "=================="
    
    test_endpoint "GET" "/works?limit=5" "status,data,pagination,array" "List works"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/works/1" "status,data" "Get work by ID"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # PERSONS SERVICE
    echo -e "${PURPLE}👥 PERSONS SERVICE${NC}"
    echo "==================="
    
    test_endpoint "GET" "/persons?limit=5" "status,data,pagination,array" "List persons"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/persons/1" "status,data" "Get person by ID"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # ORGANIZATIONS SERVICE
    echo -e "${PURPLE}🏛️  ORGANIZATIONS SERVICE${NC}"
    echo "=========================="
    
    test_endpoint "GET" "/organizations?limit=5" "status,data,pagination,array" "List organizations"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/organizations/245" "status,data" "Get organization by ID"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # VENUES SERVICE (Recently Fixed)
    echo -e "${PURPLE}🏢 VENUES SERVICE${NC}"
    echo "=================="
    
    test_endpoint "GET" "/venues?limit=5" "status,data,pagination,array" "List venues"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/venues/1" "status,data" "Get venue by ID"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/venues/statistics" "status,data" "Venue statistics"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # SIGNATURES SERVICE
    echo -e "${PURPLE}✍️  SIGNATURES SERVICE${NC}"
    echo "======================"
    
    test_endpoint "GET" "/signatures?limit=5" "status,data,pagination,array" "List signatures"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/signatures/1" "status,data" "Get signature by ID"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    test_endpoint "GET" "/signatures/statistics" "status,data" "Signature statistics"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # SEARCH SERVICE
    echo -e "${PURPLE}🔍 SEARCH SERVICE${NC}"
    echo "=================="
    
    test_endpoint "GET" "/search/works?q=test&limit=5" "status,data,pagination,array" "Search works"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # HEALTH SERVICE
    echo -e "${PURPLE}❤️  HEALTH SERVICE${NC}"
    echo "==================="
    
    test_endpoint "GET" "/health" "status,data" "Health check"
    total_tests=$((total_tests + 1))
    [[ $? -eq 0 ]] && passed_tests=$((passed_tests + 1)) || failed_tests=$((failed_tests + 1))
    
    # ERROR TESTING
    echo -e "${PURPLE}🚨 ERROR HANDLING${NC}"
    echo "=================="
    
    test_error_endpoint "/works/999999999" "Non-existent work"
    test_error_endpoint "/venues/invalid" "Invalid venue ID"
    
    # SUMMARY
    echo -e "${PURPLE}📊 AUDIT SUMMARY${NC}"
    echo "=================="
    echo ""
    
    local compliance_rate=$((passed_tests * 100 / total_tests))
    
    info "Total Endpoints Tested: $total_tests"
    success "Compliant Endpoints: $passed_tests"
    [[ $failed_tests -gt 0 ]] && error "Non-Compliant Endpoints: $failed_tests" || success "Non-Compliant Endpoints: 0"
    
    if [[ $compliance_rate -ge 90 ]]; then
        success "Compliance Rate: ${compliance_rate}% (EXCELLENT)"
    elif [[ $compliance_rate -ge 75 ]]; then
        warning "Compliance Rate: ${compliance_rate}% (GOOD)"
    else
        error "Compliance Rate: ${compliance_rate}% (NEEDS IMPROVEMENT)"
    fi
    
    echo ""
    info "Detailed log saved to: $AUDIT_LOG"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    return $failed_tests
}

# Run the audit
run_audit
exit_code=$?

echo ""
if [[ $exit_code -eq 0 ]]; then
    success "🎉 API AUDIT COMPLETED - ALL ENDPOINTS COMPLIANT!"
else
    error "⚠️  API AUDIT COMPLETED - $exit_code ENDPOINTS NEED STANDARDIZATION"
fi

exit $exit_code