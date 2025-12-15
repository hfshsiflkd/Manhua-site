#!/bin/bash

# Simple test script for login endpoint
# Usage: ./test-login.sh [base-url]
# Example: ./test-login.sh http://localhost:9000/api

BASE_URL=${1:-"http://localhost:9000/api"}
DEVICE_ID="test-device-$(date +%s)"

echo "Testing login endpoint: $BASE_URL/auth/login"
echo "Device ID: $DEVICE_ID"
echo ""

# Test 1: Missing identifier
echo "Test 1: Missing identifier (should return 400)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-device-id: $DEVICE_ID" \
  -d '{"password": "test123"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

# Test 2: Missing password
echo "Test 2: Missing password (should return 400)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-device-id: $DEVICE_ID" \
  -d '{"emailOrUsername": "test@example.com"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

# Test 3: Missing deviceId
echo "Test 3: Missing deviceId (should return 400)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername": "test@example.com", "password": "test123"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

# Test 4: Invalid credentials (should return 400)
echo "Test 4: Invalid credentials (should return 400)"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-device-id: $DEVICE_ID" \
  -d "{\"emailOrUsername\": \"nonexistent@example.com\", \"password\": \"wrongpass\", \"deviceId\": \"$DEVICE_ID\"}" \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || echo "Response received"
echo ""

echo "All tests completed!"
echo ""
echo "To test with real credentials, run:"
echo "curl -X POST \"$BASE_URL/auth/login\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"x-device-id: $DEVICE_ID\" \\"
echo "  -d '{\"emailOrUsername\": \"your-email@example.com\", \"password\": \"your-password\", \"deviceId\": \"$DEVICE_ID\"}'"

