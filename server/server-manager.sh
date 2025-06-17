#!/bin/bash

# Investra AI Email Processing Server Manager
# Manages both JavaScript (mock) and TypeScript implementations

echo "🚀 Investra AI Email Processing Server Manager"
echo "=============================================="

# Check current server status
SERVER_PID=$(lsof -ti:3001 2>/dev/null)

if [ -n "$SERVER_PID" ]; then
    echo "✅ Server is running on port 3001 (PID: $SERVER_PID)"
    
    # Test which server is running
    RESPONSE=$(curl -s http://localhost:3001/api 2>/dev/null | jq -r '.data.implementation // "JavaScript"' 2>/dev/null)
    echo "📡 Current implementation: $RESPONSE"
else
    echo "❌ No server running on port 3001"
fi

echo ""
echo "Available commands:"
echo "  ./server-manager.sh start-js     - Start JavaScript (mock) server"
echo "  ./server-manager.sh start-ts     - Start TypeScript server"
echo "  ./server-manager.sh stop         - Stop current server"
echo "  ./server-manager.sh restart-js   - Restart with JavaScript server"
echo "  ./server-manager.sh restart-ts   - Restart with TypeScript server"
echo "  ./server-manager.sh status       - Show current status"
echo "  ./server-manager.sh test         - Test API endpoints"
echo ""

case "$1" in
    "start-js")
        if [ -n "$SERVER_PID" ]; then
            echo "🛑 Stopping current server (PID: $SERVER_PID)..."
            kill $SERVER_PID
            sleep 2
        fi
        echo "🚀 Starting JavaScript server..."
        cd /Users/eduardo/investra-ai/server
        node server.js &
        echo "✅ JavaScript server started"
        ;;
    
    "start-ts")
        if [ -n "$SERVER_PID" ]; then
            echo "🛑 Stopping current server (PID: $SERVER_PID)..."
            kill $SERVER_PID
            sleep 2
        fi
        echo "🚀 Starting TypeScript server..."
        cd /Users/eduardo/investra-ai/server
        node dist/server-ts.js &
        echo "✅ TypeScript server started"
        ;;
    
    "stop")
        if [ -n "$SERVER_PID" ]; then
            echo "🛑 Stopping server (PID: $SERVER_PID)..."
            kill $SERVER_PID
            echo "✅ Server stopped"
        else
            echo "❌ No server to stop"
        fi
        ;;
    
    "restart-js")
        $0 stop
        sleep 2
        $0 start-js
        ;;
    
    "restart-ts")
        $0 stop
        sleep 2
        $0 start-ts
        ;;
    
    "test")
        echo "🧪 Testing API endpoints..."
        echo ""
        
        echo "Health Check:"
        curl -s http://localhost:3001/health | jq '.data.status // "No response"'
        echo ""
        
        echo "Email Stats:"
        curl -s http://localhost:3001/api/email/stats | jq '.data.totalEmails // "No response"'
        echo ""
        
        echo "API Documentation:"
        curl -s http://localhost:3001/api | jq '.data.service // "No response"'
        echo ""
        
        echo "IMAP Status:"
        curl -s http://localhost:3001/api/imap/status | jq '.data.status // "No response"'
        echo ""
        ;;
    
    "status"|"")
        # Default behavior - just show status
        echo "Current Status Summary:"
        echo "Frontend: http://localhost:5173"
        echo "API Server: http://localhost:3001"
        echo "API Docs: http://localhost:3001/api"
        echo ""
        if [ -n "$SERVER_PID" ]; then
            echo "🔗 Test connection: curl http://localhost:3001/health"
        fi
        ;;
    
    *)
        echo "❌ Unknown command: $1"
        echo "Use one of the commands listed above"
        exit 1
        ;;
esac
