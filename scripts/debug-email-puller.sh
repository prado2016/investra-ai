#!/bin/bash

echo "🔍 Email-Puller Diagnostic Script"
echo "=================================="
echo "Timestamp: $(date)"
echo ""

echo "📊 1. PM2 Service Status"
echo "----------------------"
pm2 list
echo ""

echo "📋 2. Email-Puller Process Details"
echo "---------------------------------"
pm2 describe investra-email-puller 2>/dev/null || echo "❌ Service not found or not running"
echo ""

echo "📝 3. Recent Email-Puller Logs (Last 50 lines)"
echo "----------------------------------------------"
pm2 logs investra-email-puller --lines=50 --nostream 2>/dev/null || echo "❌ No logs available"
echo ""

echo "📁 4. Email-Puller Directory Structure"
echo "-------------------------------------"
echo "Directory: /opt/investra/email-puller"
ls -la /opt/investra/email-puller/
echo ""
echo "Dist directory:"
ls -la /opt/investra/email-puller/dist/ 2>/dev/null || echo "❌ No dist directory"
echo ""

echo "🔐 5. Environment Configuration"
echo "------------------------------"
echo "Checking for .env files..."
if [ -f "/opt/investra/email-puller/.env" ]; then
    echo "✅ Found .env in email-puller directory"
    echo "Environment variables (without sensitive values):"
    grep -E "^[A-Z_]+" /opt/investra/email-puller/.env | sed 's/=.*/=***/' 2>/dev/null || echo "❌ Cannot read .env"
else
    echo "❌ No .env file in /opt/investra/email-puller/"
fi

# Check other possible locations
if [ -f "/home/lab/.env" ]; then
    echo "✅ Found .env in /home/lab/"
    grep -E "^[A-Z_]+" /home/lab/.env | sed 's/=.*/=***/' 2>/dev/null
elif [ -f "/home/investra/.env" ]; then
    echo "✅ Found .env in /home/investra/"
    sudo grep -E "^[A-Z_]+" /home/investra/.env | sed 's/=.*/=***/' 2>/dev/null
else
    echo "❌ No .env files found in user directories"
fi
echo ""

echo "🗄️ 6. Database Connection Test"
echo "-----------------------------"
echo "Checking if we can connect to Supabase..."
# Simple test using curl if possible
if command -v curl &> /dev/null; then
    echo "Testing basic connectivity..."
    curl -s --connect-timeout 5 https://supabase.com > /dev/null && echo "✅ Internet connectivity OK" || echo "❌ Internet connectivity issues"
else
    echo "❌ curl not available for connectivity test"
fi
echo ""

echo "🔧 7. System Resources"
echo "---------------------"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /opt/investra/
echo ""

echo "🌐 8. Network Connectivity"
echo "-------------------------"
echo "Gmail IMAP connectivity test:"
if command -v nc &> /dev/null; then
    timeout 5 nc -zv imap.gmail.com 993 2>&1 || echo "❌ Cannot connect to Gmail IMAP"
else
    echo "❌ netcat not available for IMAP test"
fi
echo ""

echo "📈 9. Process Information"
echo "-----------------------"
echo "All Node.js processes:"
ps aux | grep -E "(node|npm)" | grep -v grep
echo ""

echo "🔍 10. Recent System Logs"
echo "------------------------"
echo "Checking for email-puller related system logs..."
sudo journalctl --since "1 hour ago" | grep -i email | tail -10 2>/dev/null || echo "❌ No recent email-puller system logs"
echo ""

echo "✅ Diagnostic complete!"
echo "======================"
echo ""
echo "📋 Summary:"
echo "- Check PM2 status above"
echo "- Review logs for errors"
echo "- Verify .env configuration exists"
echo "- Ensure Gmail connectivity is working"
echo ""
echo "💡 Next steps:"
echo "1. If PM2 shows 'errored': Check logs for specific error"
echo "2. If no .env found: Need to configure Gmail credentials"
echo "3. If connectivity issues: Check firewall/network"
echo "4. If service is running but not fetching: Check Gmail app password"