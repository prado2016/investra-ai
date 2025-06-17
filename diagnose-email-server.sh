#!/bin/bash

# 📧 Email Server Diagnostic Tool
# Test connection to root@10.0.0.83 and diagnose email server issues

echo "🔍 Email Server Diagnostic for 10.0.0.83"
echo "=========================================="

SERVER="10.0.0.83"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}📡 Testing Basic Connectivity${NC}"
echo "=============================="

# Test ping
if ping -c 3 $SERVER > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is reachable via ping${NC}"
else
    echo -e "${RED}❌ Server is not reachable${NC}"
    exit 1
fi

echo -e "\n${BLUE}🔌 Testing Email Ports${NC}"
echo "======================="

# Test email ports with different timeouts
PORTS=(25 143 587 993 995 110 465)
PORT_NAMES=("SMTP" "IMAP" "SMTP-Sub" "IMAPS" "POP3S" "POP3" "SMTPS")

for i in "${!PORTS[@]}"; do
    port=${PORTS[$i]}
    name=${PORT_NAMES[$i]}
    
    echo -n "Testing $name (port $port): "
    
    # Use different methods to test ports
    if command -v nc > /dev/null; then
        if timeout 5 nc -z $SERVER $port 2>/dev/null; then
            echo -e "${GREEN}✅ Open${NC}"
        else
            echo -e "${RED}❌ Closed/Filtered${NC}"
        fi
    elif command -v telnet > /dev/null; then
        if timeout 5 bash -c "echo '' | telnet $SERVER $port" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Open${NC}"
        else
            echo -e "${RED}❌ Closed/Filtered${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ No testing tools available${NC}"
    fi
done

echo -e "\n${BLUE}🔍 Advanced Network Diagnostics${NC}"
echo "================================"

# Test if server has any open ports
echo "Scanning for any open ports on common ranges..."

# Common email and web ports
COMMON_PORTS=(22 80 443 8080 8443 3000 5000)
echo "Testing common service ports:"
for port in "${COMMON_PORTS[@]}"; do
    if timeout 2 nc -z $SERVER $port 2>/dev/null; then
        echo -e "${GREEN}✅ Port $port is open${NC}"
    fi
done

echo -e "\n${BLUE}📧 Possible Email Server Issues${NC}"
echo "================================"

echo -e "${YELLOW}Potential causes for email port issues:${NC}"
echo "1. Email server is not running on 10.0.0.83"
echo "2. Firewall is blocking email ports"
echo "3. Email services are bound to localhost only"
echo "4. Different ports are being used"
echo "5. Server is using non-standard configuration"

echo -e "\n${BLUE}🛠️ Recommended Next Steps${NC}"
echo "=========================="

echo "1. SSH into your server to check email services:"
echo -e "   ${YELLOW}ssh root@10.0.0.83${NC}"

echo -e "\n2. Check if email server is running:"
echo -e "   ${YELLOW}systemctl status postfix dovecot${NC}"
echo -e "   ${YELLOW}docker ps | grep mail${NC}"
echo -e "   ${YELLOW}netstat -tlnp | grep ':993\\|:143\\|:25\\|:587'${NC}"

echo -e "\n3. Check firewall settings:"
echo -e "   ${YELLOW}iptables -L${NC}"
echo -e "   ${YELLOW}ufw status${NC}"
echo -e "   ${YELLOW}firewall-cmd --list-all${NC}"

echo -e "\n4. Test local email services:"
echo -e "   ${YELLOW}telnet localhost 993${NC}"
echo -e "   ${YELLOW}ss -tlnp | grep -E ':(25|143|587|993)'${NC}"

echo -e "\n5. Check email server logs:"
echo -e "   ${YELLOW}journalctl -u postfix -f${NC}"
echo -e "   ${YELLOW}tail -f /var/log/mail.log${NC}"

echo -e "\n${GREEN}💡 Quick Test Command for Server:${NC}"
echo -e "${YELLOW}# Run this on 10.0.0.83 to check what's listening:${NC}"
echo -e "${YELLOW}netstat -tlnp | grep -E ':(25|143|587|993|995)' || ss -tlnp | grep -E ':(25|143|587|993|995)'${NC}"
