#!/bin/bash

# One-Line Email Server Dependency Fix
# Copy and paste this entire command into your server terminal

echo "🚀 One-Line Email Server Dependency Installation" && \
mkdir -p /opt/investra-email && \
cd /opt/investra-email && \
echo "📦 Installing Node.js..." && \
(node --version 2>/dev/null || (curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt-get install -y nodejs build-essential)) && \
echo "📝 Creating package.json..." && \
cat > package.json << 'EOF'
{
  "name": "investra-email-server",
  "version": "1.0.0",
  "dependencies": {
    "imapflow": "^1.0.188",
    "mailparser": "^3.7.3",
    "axios": "^1.9.0"
  }
}
EOF
echo "📧 Installing dependencies..." && \
npm install && \
echo "🧪 Testing installation..." && \
node -e "
try {
  require('imapflow');
  require('mailparser');
  console.log('✅ SUCCESS: All email dependencies installed correctly!');
  console.log('🎉 Your email server is ready for processing');
} catch (error) {
  console.log('❌ FAILED: ' + error.message);
  console.log('💡 Try: npm install imapflow mailparser');
}
" && \
echo "📊 Installation Summary:" && \
echo "Node.js: $(node --version)" && \
echo "npm: $(npm --version)" && \
echo "Location: $(pwd)" && \
echo "✅ Setup complete!"
