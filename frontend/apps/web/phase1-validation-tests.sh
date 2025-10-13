#!/bin/bash
# Phase 1 Frontend Connectivity Validation Tests
# Tests authentication, authorization, and session API flows

set -e

BACKEND_URL="https://orion-chat.sidekickportal.com"
FRONTEND_URL="http://localhost:3000"
TEST_RESULTS_FILE="/tmp/phase1-validation-results.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Initialize results file
echo "{" > "$TEST_RESULTS_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$TEST_RESULTS_FILE"
echo "  \"backend_url\": \"$BACKEND_URL\"," >> "$TEST_RESULTS_FILE"
echo "  \"tests\": [" >> "$TEST_RESULTS_FILE"

function log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local http_code="$4"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "  ${YELLOW}Details:${NC} $details"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Append to JSON results
    if [ $TESTS_TOTAL -gt 1 ]; then
        echo "    ," >> "$TEST_RESULTS_FILE"
    fi
    echo "    {" >> "$TEST_RESULTS_FILE"
    echo "      \"name\": \"$test_name\"," >> "$TEST_RESULTS_FILE"
    echo "      \"status\": \"$status\"," >> "$TEST_RESULTS_FILE"
    echo "      \"http_code\": \"$http_code\"," >> "$TEST_RESULTS_FILE"
    echo "      \"details\": \"$details\"" >> "$TEST_RESULTS_FILE"
    echo "    }" >> "$TEST_RESULTS_FILE"
}

echo "========================================="
echo "Phase 1 Frontend Connectivity Validation"
echo "========================================="
echo ""
echo "Backend: $BACKEND_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# TEST 1: Backend Health Check
echo "TEST 1: Backend Health Check"
HTTP_CODE=$(curl -s -o /tmp/health.json -w "%{http_code}" "$BACKEND_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
    SERVICE_NAME=$(cat /tmp/health.json | jq -r '.service // "unknown"')
    log_test "Backend Health Check" "PASS" "Service: $SERVICE_NAME" "$HTTP_CODE"
else
    log_test "Backend Health Check" "FAIL" "Expected 200, got $HTTP_CODE" "$HTTP_CODE"
fi
echo ""

# TEST 2: Unauthorized Access (No Auth Header)
echo "TEST 2: Unauthorized Access - No Authorization Header"
HTTP_CODE=$(curl -s -o /tmp/unauth.json -w "%{http_code}" "$BACKEND_URL/api/sessions/list")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
    ERROR_MSG=$(cat /tmp/unauth.json | jq -r '.error // "unknown"')
    log_test "Unauthorized Access (No Auth)" "PASS" "Correctly rejected: $ERROR_MSG" "$HTTP_CODE"
else
    log_test "Unauthorized Access (No Auth)" "FAIL" "Expected 400/401, got $HTTP_CODE" "$HTTP_CODE"
fi
echo ""

# TEST 3: Invalid JWT Signature
echo "TEST 3: Invalid JWT - Bad Signature"
INVALID_JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjE2MjM5MDIyfQ.invalid_signature"
HTTP_CODE=$(curl -s -o /tmp/invalid-jwt.json -w "%{http_code}" \
    -H "Authorization: Bearer $INVALID_JWT" \
    "$BACKEND_URL/api/sessions/list")
if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    ERROR_MSG=$(cat /tmp/invalid-jwt.json | jq -r '.error // "unknown"')
    log_test "Invalid JWT Signature" "PASS" "Correctly rejected: $ERROR_MSG" "$HTTP_CODE"
else
    log_test "Invalid JWT Signature" "FAIL" "Expected 403/401, got $HTTP_CODE" "$HTTP_CODE"
fi
echo ""

# TEST 4: CORS Validation
echo "TEST 4: CORS - Unauthorized Origin"
HTTP_CODE=$(curl -s -o /tmp/cors.txt -w "%{http_code}" \
    -H "Origin: https://evil.com" \
    -H "Authorization: Bearer test-token" \
    -I "$BACKEND_URL/api/sessions/list" 2>&1 | grep "HTTP" | tail -1 | awk '{print $2}')
CORS_HEADER=$(curl -s -I \
    -H "Origin: https://evil.com" \
    "$BACKEND_URL/health" 2>&1 | grep -i "access-control-allow-origin" || echo "")
if [ -z "$CORS_HEADER" ]; then
    log_test "CORS Unauthorized Origin" "PASS" "No CORS header for evil.com" "$HTTP_CODE"
else
    log_test "CORS Unauthorized Origin" "FAIL" "CORS header present: $CORS_HEADER" "$HTTP_CODE"
fi
echo ""

# TEST 5: Rate Limiting Check
echo "TEST 5: Rate Limiting (sending 10 rapid requests)"
RATE_LIMIT_TRIGGERED=false
for i in {1..10}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMIT_TRIGGERED=true
        break
    fi
done
if [ "$RATE_LIMIT_TRIGGERED" = true ]; then
    log_test "Rate Limiting" "PASS" "Rate limit triggered at request $i" "429"
else
    log_test "Rate Limiting" "INFO" "Rate limit not triggered in 10 requests (limit may be higher)" "200"
fi
echo ""

# TEST 6: Environment Configuration Check
echo "TEST 6: Environment Configuration"
if [ -f ".env.local" ]; then
    if grep -q "CHAT_SERVICE_URL=https://orion-chat.sidekickportal.com" .env.local; then
        log_test "CHAT_SERVICE_URL Configuration" "PASS" "Correctly set to public endpoint" "N/A"
    else
        CURRENT_URL=$(grep "CHAT_SERVICE_URL" .env.local || echo "NOT SET")
        log_test "CHAT_SERVICE_URL Configuration" "FAIL" "Current: $CURRENT_URL" "N/A"
    fi
    
    if grep -q "ORION_SHARED_JWT_SECRET" .env.local; then
        log_test "JWT Secret Configuration" "PASS" "JWT secret is configured" "N/A"
    else
        log_test "JWT Secret Configuration" "FAIL" "JWT secret not found in .env.local" "N/A"
    fi
    
    if grep -q "AUTHORIZED_USER_EMAIL=jamesandrewklein@gmail.com" .env.local; then
        log_test "Authorized User Configuration" "PASS" "Authorized user correctly set" "N/A"
    else
        log_test "Authorized User Configuration" "FAIL" "Authorized user not set correctly" "N/A"
    fi
else
    log_test "Environment File Check" "FAIL" ".env.local not found" "N/A"
fi
echo ""

# TEST 7: No Legacy Backend URLs
echo "TEST 7: Legacy Backend URL Check"
LEGACY_URLS=$(grep -r "192.168.50.79" src/ 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$LEGACY_URLS" -eq 0 ]; then
    log_test "No Legacy Backend URLs" "PASS" "No hardcoded 192.168.50.79 URLs found" "N/A"
else
    log_test "No Legacy Backend URLs" "FAIL" "Found $LEGACY_URLS references to 192.168.50.79" "N/A"
fi
echo ""

# Finalize JSON results
echo "  ]," >> "$TEST_RESULTS_FILE"
echo "  \"summary\": {" >> "$TEST_RESULTS_FILE"
echo "    \"total\": $TESTS_TOTAL," >> "$TEST_RESULTS_FILE"
echo "    \"passed\": $TESTS_PASSED," >> "$TEST_RESULTS_FILE"
echo "    \"failed\": $TESTS_FAILED" >> "$TEST_RESULTS_FILE"
echo "  }" >> "$TEST_RESULTS_FILE"
echo "}" >> "$TEST_RESULTS_FILE"

# Print summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""
echo "Results saved to: $TEST_RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Some tests failed. Please review the results above.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi

