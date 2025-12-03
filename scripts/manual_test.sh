#!/bin/bash
# Manual Testing Script for MachineMate GCP Deployment
# Run this after deployment to verify everything is working

set -e

# Configuration
API_URL="https://machinemate-api-buz66rae7q-uc.a.run.app"
FRONTEND_ORIGIN="http://localhost:8081"

echo "=============================================="
echo "MachineMate API Manual Testing"
echo "API URL: $API_URL"
echo "=============================================="
echo ""

# -----------------------------------------------
# 1. Health Endpoints
# -----------------------------------------------
echo "1. HEALTH ENDPOINTS"
echo "-------------------"

echo -n "   /health/live: "
LIVE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/live")
if [ "$LIVE_RESPONSE" = "200" ]; then
    echo "✅ OK ($LIVE_RESPONSE)"
else
    echo "❌ FAILED ($LIVE_RESPONSE)"
fi

echo -n "   /health/ready: "
READY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health/ready")
if [ "$READY_RESPONSE" = "200" ]; then
    echo "✅ OK ($READY_RESPONSE)"
else
    echo "❌ FAILED ($READY_RESPONSE)"
fi

echo -n "   /health (detailed): "
curl -s "$API_URL/health" | head -c 100
echo "..."
echo ""

# -----------------------------------------------
# 2. CORS Preflight
# -----------------------------------------------
echo "2. CORS PREFLIGHT"
echo "-----------------"

echo "   Testing OPTIONS request from origin: $FRONTEND_ORIGIN"
CORS_HEADERS=$(curl -s -I -X OPTIONS "$API_URL/api/v1/recognize" \
    -H "Origin: $FRONTEND_ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" 2>&1)

echo "$CORS_HEADERS" | grep -i "access-control" || echo "   ⚠️  No CORS headers found"
echo ""

# -----------------------------------------------
# 3. API Root & Docs
# -----------------------------------------------
echo "3. API ROOT & DOCS"
echo "------------------"

echo -n "   / (root): "
ROOT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/")
if [ "$ROOT_RESPONSE" = "200" ]; then
    echo "✅ OK ($ROOT_RESPONSE)"
else
    echo "❌ FAILED ($ROOT_RESPONSE)"
fi

echo -n "   /docs (Swagger): "
DOCS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs")
if [ "$DOCS_RESPONSE" = "200" ]; then
    echo "✅ OK ($DOCS_RESPONSE)"
else
    echo "❌ FAILED ($DOCS_RESPONSE)"
fi

echo -n "   /redoc: "
REDOC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/redoc")
if [ "$REDOC_RESPONSE" = "200" ]; then
    echo "✅ OK ($REDOC_RESPONSE)"
else
    echo "❌ FAILED ($REDOC_RESPONSE)"
fi
echo ""

# -----------------------------------------------
# 4. Protected Endpoints (should return 401 without auth)
# -----------------------------------------------
echo "4. AUTHENTICATION CHECK"
echo "-----------------------"

echo -n "   /api/v1/machines (public): "
MACHINES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/machines?limit=1")
if [ "$MACHINES_RESPONSE" = "200" ]; then
    echo "✅ Accessible ($MACHINES_RESPONSE)"
else
    echo "❌ FAILED ($MACHINES_RESPONSE)"
fi

echo -n "   /api/v1/favorites (auth required): "
FAV_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/favorites")
if [ "$FAV_RESPONSE" = "401" ] || [ "$FAV_RESPONSE" = "403" ]; then
    echo "✅ Protected ($FAV_RESPONSE - expected)"
else
    echo "⚠️  Unexpected ($FAV_RESPONSE)"
fi

echo -n "   /api/v1/history (auth required): "
HIST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/history")
if [ "$HIST_RESPONSE" = "401" ] || [ "$HIST_RESPONSE" = "403" ]; then
    echo "✅ Protected ($HIST_RESPONSE - expected)"
else
    echo "⚠️  Unexpected ($HIST_RESPONSE)"
fi

echo -n "   /api/v1/media/upload (auth required): "
UPLOAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/media/upload")
if [ "$UPLOAD_RESPONSE" = "401" ] || [ "$UPLOAD_RESPONSE" = "403" ]; then
    echo "✅ Protected ($UPLOAD_RESPONSE - expected)"
else
    echo "⚠️  Unexpected ($UPLOAD_RESPONSE)"
fi
echo ""

# -----------------------------------------------
# 5. Response Time
# -----------------------------------------------
echo "5. RESPONSE TIME"
echo "----------------"

echo "   Measuring latency to /health/live..."
for i in 1 2 3; do
    TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/health/live")
    echo "   Request $i: ${TIME}s"
done
echo ""

# -----------------------------------------------
# 6. Container Info (if exposed)
# -----------------------------------------------
echo "6. SERVICE INFO"
echo "---------------"
echo "   Health response:"
curl -s "$API_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/health"
echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "=============================================="
echo "TESTING COMPLETE"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Test with a valid JWT token from Supabase"
echo "  2. Run mobile app against this backend"
echo "  3. Check Cloud Monitoring dashboard for metrics"
echo ""
echo "Dashboard URL:"
echo "  https://console.cloud.google.com/monitoring/dashboards?project=machinemate-023"
