#!/bin/bash
# E2E Test Script for MachineMate API
# Tests authenticated endpoints against the deployed Cloud Run service

set -e

# Configuration
API_URL="https://machinemate-api-buz66rae7q-uc.a.run.app"
SUPABASE_URL="https://gemxkgkpkaombqkycegc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbXhrZ2twa2FvbWJxa3ljZWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjUwNDIsImV4cCI6MjA3ODI0MTA0Mn0._0TZ2G8VwOeod2xOy_qxESAa-F79D_Dkslzlpiew71Q"

# Test user credentials (created via Supabase Admin API)
TEST_EMAIL="${TEST_EMAIL:-e2e-test@machinemate.app}"
TEST_PASSWORD="${TEST_PASSWORD:-E2ETestPassword123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "MachineMate E2E Test Suite"
echo "API URL: $API_URL"
echo "=============================================="
echo ""

# -----------------------------------------------
# Step 1: Sign up or Sign in to get JWT
# -----------------------------------------------
echo "1. AUTHENTICATION"
echo "-----------------"

# Try to sign up first (will fail if user exists, that's OK)
echo "   Attempting to create test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

# Sign in to get JWT
echo "   Signing in to get JWT..."
SIGNIN_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

# Extract access token
ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "   ${RED}❌ Failed to get JWT token${NC}"
    echo "   Response: $SIGNIN_RESPONSE"
    echo ""
    echo "   To fix, either:"
    echo "   1. Create a test user in Supabase dashboard"
    echo "   2. Or set TEST_EMAIL and TEST_PASSWORD environment variables"
    echo ""
    echo "   Example: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword ./e2e_test.sh"
    exit 1
fi

echo -e "   ${GREEN}✅ Got JWT token${NC}"
echo "   Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."

# Extract user ID
USER_ID=$(echo "$SIGNIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('user', {}).get('id', ''))" 2>/dev/null || echo "")
echo "   User ID: $USER_ID"
echo ""

# -----------------------------------------------
# Step 2: Test authenticated endpoints
# -----------------------------------------------
echo "2. AUTHENTICATED ENDPOINTS"
echo "--------------------------"

# Test /api/v1/favorites
echo -n "   GET /api/v1/favorites: "
FAV_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/favorites" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
FAV_STATUS=$(echo "$FAV_RESPONSE" | tail -1)
FAV_BODY=$(echo "$FAV_RESPONSE" | sed '$d')

if [ "$FAV_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK ($FAV_STATUS)${NC}"
else
    echo -e "${RED}❌ FAILED ($FAV_STATUS)${NC}"
    echo "   Body: $FAV_BODY"
fi

# Test /api/v1/history
echo -n "   GET /api/v1/history: "
HIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/history" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
HIST_STATUS=$(echo "$HIST_RESPONSE" | tail -1)
HIST_BODY=$(echo "$HIST_RESPONSE" | sed '$d')

if [ "$HIST_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK ($HIST_STATUS)${NC}"
else
    echo -e "${RED}❌ FAILED ($HIST_STATUS)${NC}"
    echo "   Body: $HIST_BODY"
fi

# Test /api/v1/metrics/stats
echo -n "   GET /api/v1/metrics/stats: "
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/metrics/stats" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
METRICS_STATUS=$(echo "$METRICS_RESPONSE" | tail -1)
METRICS_BODY=$(echo "$METRICS_RESPONSE" | sed '$d')

if [ "$METRICS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK ($METRICS_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  ($METRICS_STATUS)${NC}"
fi
echo ""

# -----------------------------------------------
# Step 3: Test image upload (if test image available)
# -----------------------------------------------
echo "3. IMAGE UPLOAD TEST"
echo "--------------------"

# Create a small test image (1x1 red pixel PNG)
TEST_IMAGE="/tmp/machinemate_test.png"
echo -n "   Creating test image... "
python3 -c "
import base64
# Minimal 1x1 red PNG
png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==')
with open('$TEST_IMAGE', 'wb') as f:
    f.write(png_data)
print('done')
"

echo -n "   POST /api/v1/media/upload: "
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/media/upload" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -F "file=@$TEST_IMAGE;type=image/png")
UPLOAD_STATUS=$(echo "$UPLOAD_RESPONSE" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$UPLOAD_STATUS" = "201" ]; then
    echo -e "${GREEN}✅ OK ($UPLOAD_STATUS)${NC}"
    echo "   Response: $(echo "$UPLOAD_BODY" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2)[:200])' 2>/dev/null || echo "$UPLOAD_BODY" | head -c 200)..."
elif [ "$UPLOAD_STATUS" = "422" ]; then
    echo -e "${YELLOW}⚠️  Validation error ($UPLOAD_STATUS)${NC}"
    echo "   (This may be expected if mock mode is enabled or VLM not configured)"
else
    echo -e "${RED}❌ FAILED ($UPLOAD_STATUS)${NC}"
    echo "   Body: $UPLOAD_BODY"
fi

# Cleanup test image
rm -f "$TEST_IMAGE"
echo ""

# -----------------------------------------------
# Step 4: Test favorites CRUD
# -----------------------------------------------
echo "4. FAVORITES CRUD TEST"
echo "----------------------"

# Get a machine ID from the catalog
MACHINE_ID=$(curl -s "$API_URL/api/v1/machines?limit=1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('machines', [{}])[0].get('id', ''))" 2>/dev/null || echo "chest_press")

echo "   Using machine_id: $MACHINE_ID"

# Add to favorites
echo -n "   POST /api/v1/favorites (add): "
ADD_FAV_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/favorites" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"machine_id\": \"$MACHINE_ID\"}")
ADD_FAV_STATUS=$(echo "$ADD_FAV_RESPONSE" | tail -1)

if [ "$ADD_FAV_STATUS" = "201" ] || [ "$ADD_FAV_STATUS" = "200" ] || [ "$ADD_FAV_STATUS" = "409" ]; then
    echo -e "${GREEN}✅ OK ($ADD_FAV_STATUS)${NC}"
else
    echo -e "${RED}❌ FAILED ($ADD_FAV_STATUS)${NC}"
fi

# Get favorites list
echo -n "   GET /api/v1/favorites (list): "
LIST_FAV_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/favorites" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
LIST_FAV_STATUS=$(echo "$LIST_FAV_RESPONSE" | tail -1)
LIST_FAV_BODY=$(echo "$LIST_FAV_RESPONSE" | sed '$d')

if [ "$LIST_FAV_STATUS" = "200" ]; then
    FAV_COUNT=$(echo "$LIST_FAV_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('favorites', [])))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✅ OK ($LIST_FAV_STATUS) - $FAV_COUNT favorites${NC}"
else
    echo -e "${RED}❌ FAILED ($LIST_FAV_STATUS)${NC}"
fi

# Remove from favorites
echo -n "   DELETE /api/v1/favorites/$MACHINE_ID: "
DEL_FAV_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_URL/api/v1/favorites/$MACHINE_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
DEL_FAV_STATUS=$(echo "$DEL_FAV_RESPONSE" | tail -1)

if [ "$DEL_FAV_STATUS" = "204" ] || [ "$DEL_FAV_STATUS" = "200" ] || [ "$DEL_FAV_STATUS" = "404" ]; then
    echo -e "${GREEN}✅ OK ($DEL_FAV_STATUS)${NC}"
else
    echo -e "${RED}❌ FAILED ($DEL_FAV_STATUS)${NC}"
fi
echo ""

# -----------------------------------------------
# Step 5: Test history endpoints
# -----------------------------------------------
echo "5. HISTORY TEST"
echo "---------------"

# Get history list
echo -n "   GET /api/v1/history (list): "
LIST_HIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/history" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
LIST_HIST_STATUS=$(echo "$LIST_HIST_RESPONSE" | tail -1)
LIST_HIST_BODY=$(echo "$LIST_HIST_RESPONSE" | sed '$d')

if [ "$LIST_HIST_STATUS" = "200" ]; then
    HIST_COUNT=$(echo "$LIST_HIST_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('items', [])))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✅ OK ($LIST_HIST_STATUS) - $HIST_COUNT items${NC}"
else
    echo -e "${RED}❌ FAILED ($LIST_HIST_STATUS)${NC}"
fi
echo ""

# -----------------------------------------------
# Step 6: Response times for authenticated endpoints
# -----------------------------------------------
echo "6. RESPONSE TIMES (authenticated)"
echo "----------------------------------"

for endpoint in "/api/v1/favorites" "/api/v1/history" "/api/v1/machines?limit=5"; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    printf "   %-30s %ss\n" "$endpoint:" "$TIME"
done
echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "=============================================="
echo "E2E TESTING COMPLETE"
echo "=============================================="
echo ""
echo "Test user: $TEST_EMAIL"
echo "User ID: $USER_ID"
echo ""
echo "Next steps:"
echo "  1. Check Cloud Monitoring dashboard for the API calls"
echo "  2. Run the mobile app and sign in with the test user"
echo "  3. Verify metrics are flowing through"
echo ""
echo "Dashboard: https://console.cloud.google.com/monitoring/dashboards?project=machinemate-023"
echo "Logs: https://console.cloud.google.com/logs?project=machinemate-023"
