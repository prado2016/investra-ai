#!/bin/bash

# 📧 Email Processing System - Quick Test Suite
# For testing with email server at root@10.0.0.83

echo "🚀 Investra AI Email Processing - Quick Test Suite"
echo "📧 Testing server: root@10.0.0.83"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL: $test_name${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to test with timeout
test_with_timeout() {
    local test_name="$1"
    local test_command="$2"
    local timeout_seconds="${3:-5}"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    
    if timeout "$timeout_seconds" bash -c "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: $test_name${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL: $test_name (timeout after ${timeout_seconds}s)${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "\n${YELLOW}📡 PHASE 1: Network Connectivity Tests${NC}"
echo "=========================================="

# Test basic connectivity
run_test "Basic ping to server" "ping -c 3 10.0.0.83"

# Test IMAP ports
test_with_timeout "IMAPS port 993" "nc -z 10.0.0.83 993" 10
test_with_timeout "IMAP port 143" "nc -z 10.0.0.83 143" 10

# Test SMTP ports  
test_with_timeout "SMTP port 25" "nc -z 10.0.0.83 25" 10
test_with_timeout "SMTP submission port 587" "nc -z 10.0.0.83 587" 10

echo -e "\n${YELLOW}🔧 PHASE 2: Application Dependencies${NC}"
echo "========================================"

# Check if Node.js dependencies are installed
run_test "Node.js installed" "node --version"
run_test "NPM installed" "npm --version"

# Check for required packages
if [ -f "package.json" ]; then
    echo -e "\n${BLUE}📦 Checking NPM dependencies...${NC}"
    
    # Check if imapflow is installed
    if npm list imapflow > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: imapflow package installed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL: imapflow package missing${NC}"
        echo -e "${YELLOW}💡 Run: npm install imapflow${NC}"
        ((TESTS_FAILED++))
    fi
    
    # Check if mailparser is installed
    if npm list mailparser > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: mailparser package installed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL: mailparser package missing${NC}"
        echo -e "${YELLOW}💡 Run: npm install mailparser${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${RED}❌ FAIL: package.json not found${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n${YELLOW}📁 PHASE 3: File Structure Check${NC}"
echo "==================================="

# Check for important files
run_test "Email processing service exists" "[ -f 'src/services/email/imapEmailProcessor.ts' ]"
run_test "Email parser exists" "[ -f 'src/services/email/wealthsimpleEmailParser.ts' ]"
run_test "IMAP service config exists" "[ -f 'src/services/email/imapProcessorService.ts' ]"

# Check for UI components
run_test "Email management page exists" "[ -f 'src/pages/EmailManagement.tsx' ]"
run_test "Email status display exists" "[ -f 'src/components/EmailProcessingStatusDisplay.tsx' ]"

echo -e "\n${YELLOW}🧪 PHASE 4: Email Connection Test${NC}"
echo "=================================="

# Run the comprehensive connection test if available
if [ -f "test-email-connection.js" ]; then
    echo -e "\n${BLUE}🔍 Running comprehensive email connection test...${NC}"
    echo -e "${YELLOW}⚠️  Note: This may fail if credentials aren't configured${NC}"
    
    # Run the connection test with a timeout
    if timeout 30 node test-email-connection.js; then
        echo -e "${GREEN}✅ Email connection test completed${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ Email connection test failed${NC}"
        echo -e "${YELLOW}💡 Check credentials and server configuration${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Email connection test script not found${NC}"
    echo -e "${YELLOW}💡 Run this first: create test-email-connection.js${NC}"
fi

echo -e "\n${YELLOW}🌐 PHASE 5: Development Server Check${NC}"
echo "====================================="

# Check if development server can start
if [ -f "package.json" ] && grep -q "\"dev\":" package.json; then
    echo -e "${BLUE}🖥️  Development server configuration found${NC}"
    echo -e "${GREEN}✅ PASS: Dev server script available${NC}"
    ((TESTS_PASSED++))
    
    echo -e "${YELLOW}💡 To test the UI, run: npm run dev${NC}"
    echo -e "${YELLOW}💡 Then navigate to: http://localhost:5173/dashboard${NC}"
else
    echo -e "${RED}❌ FAIL: Dev server script not found${NC}"
    ((TESTS_FAILED++))
fi

# Final summary
echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}📊 TEST SUMMARY${NC}"
echo -e "${BLUE}=================================================${NC}"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Ready to proceed with email processing setup.${NC}"
    
    echo -e "\n${YELLOW}📋 NEXT STEPS:${NC}"
    echo "1. Configure email credentials in the application"
    echo "2. Start development server: npm run dev"
    echo "3. Navigate to Email Import dashboard"
    echo "4. Test with sample Wealthsimple emails"
    echo "5. Monitor processing status and results"
    
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please fix the issues before proceeding.${NC}"
    
    echo -e "\n${YELLOW}📋 COMMON FIXES:${NC}"
    echo "• Install missing packages: npm install"
    echo "• Check network connectivity to 10.0.0.83"
    echo "• Verify email server is running"
    echo "• Configure firewall to allow email ports"
    echo "• Set up email account credentials"
    
    exit 1
fi
