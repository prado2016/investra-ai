#!/bin/bash

# Email Server Setup Script for Investra AI
# This script sets up docker-mailserver for receiving Wealthsimple emails

set -e

echo "🚀 Setting up Investra AI Email Server..."

# Create required directories
echo "📁 Creating directory structure..."
mkdir -p docker-data/dms/{mail-data,mail-state,mail-logs,config,certs}

# Create empty files required by docker-mailserver
echo "📄 Creating configuration files..."
touch docker-data/dms/config/postfix-accounts.cf
touch docker-data/dms/config/postfix-virtual.cf
touch docker-data/dms/config/postfix-main.cf
touch docker-data/dms/config/dovecot.cf

# Create main email account for transactions
echo "📧 Setting up transactions@investra.com email account..."
if [ -z "$EMAIL_PASSWORD" ]; then
  echo "❌ Error: EMAIL_PASSWORD environment variable not set"
  echo "   Please set EMAIL_PASSWORD before running this script"
  exit 1
fi
echo "transactions@investra.com|{PLAIN}${EMAIL_PASSWORD}" > docker-data/dms/config/postfix-accounts.cf

# Configure virtual aliases
echo "📮 Setting up email aliases..."
cat > docker-data/dms/config/postfix-virtual.cf << 'EOF'
# Virtual aliases for Investra AI
transactions@investra.com transactions@investra.com
wealthsimple@investra.com transactions@investra.com
imports@investra.com transactions@investra.com
noreply@investra.com transactions@investra.com
EOF

# Custom Postfix configuration
echo "⚙️ Configuring Postfix..."
cat > docker-data/dms/config/postfix-main.cf << 'EOF'
# Custom Postfix configuration for Investra AI
# Increase message size limit for attachments
message_size_limit = 100000000

# Configure virtual domains
virtual_mailbox_domains = investra.com
virtual_mailbox_base = /var/mail

# Security settings
smtpd_helo_required = yes
smtpd_helo_restrictions = 
    permit_mynetworks,
    reject_invalid_helo_hostname,
    reject_non_fqdn_helo_hostname

# Relay restrictions
smtpd_recipient_restrictions = 
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    reject_rbl_client zen.spamhaus.org

# Rate limiting
anvil_rate_time_unit = 60s
anvil_status_update_time = 600s
smtpd_client_connection_count_limit = 50
smtpd_client_connection_rate_limit = 100
EOF

# Custom Dovecot configuration
echo "📥 Configuring Dovecot IMAP..."
cat > docker-data/dms/config/dovecot.cf << 'EOF'
# Custom Dovecot configuration for Investra AI
# Enable IMAP and IMAPS
protocols = imap

# Mailbox configuration
mail_location = maildir:/var/mail/%d/%n/Maildir
namespace inbox {
  inbox = yes
  location = 
  mailbox Drafts {
    special_use = \Drafts
  }
  mailbox Junk {
    special_use = \Junk
  }
  mailbox Sent {
    special_use = \Sent
  }
  mailbox "Sent Messages" {
    special_use = \Sent
  }
  mailbox Trash {
    special_use = \Trash
  }
  prefix = 
}

# Authentication
auth_mechanisms = plain login
userdb {
  driver = passwd-file
  args = username_format=%u /tmp/docker-mailserver/postfix-accounts.cf
}
passdb {
  driver = passwd-file
  args = username_format=%u /tmp/docker-mailserver/postfix-accounts.cf
}

# SSL Configuration
ssl = required
ssl_cert = </etc/ssl/certs/ssl-cert-snakeoil.pem
ssl_key = </etc/ssl/private/ssl-cert-snakeoil.key
ssl_protocols = !SSLv3 !TLSv1 !TLSv1.1
ssl_cipher_list = ECDHE+AESGCM:ECDHE+AES256:ECDHE+AES128:RSA+AES:!aNULL:!MD5:!DSS
ssl_prefer_server_ciphers = yes
EOF

# Create environment file
echo "🔧 Creating environment configuration..."
cat > .env << 'EOF'
# Investra AI Email Server Configuration
HOSTNAME=mail.investra.com
DOMAINNAME=investra.com

# Email Credentials
MAILSERVER_USER=transactions@investra.com
MAILSERVER_PASS=InvestraSecure2025!

# IMAP Connection Details
IMAP_HOST=localhost
IMAP_PORT=993
IMAP_TLS=true

# SMTP Configuration  
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_TLS=true

# Development settings
DMS_DEBUG=0
LOG_LEVEL=info
EOF

# Create startup script
echo "🔄 Creating startup script..."
cat > start-mailserver.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Investra AI Email Server..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start the email server
echo "📧 Starting docker-mailserver..."
docker-compose up -d

# Wait for server to be ready
echo "⏳ Waiting for email server to be ready..."
sleep 30

# Check server status
echo "🔍 Checking server status..."
docker-compose ps

# Display connection information
echo ""
echo "✅ Email Server Setup Complete!"
echo ""
echo "📧 Email Account: transactions@investra.com"
echo "🔑 Password: InvestraSecure2025!"
echo ""
echo "🔌 IMAP Connection:"
echo "   Host: localhost (or your server IP)"
echo "   Port: 993 (IMAPS)"
echo "   Security: SSL/TLS"
echo ""
echo "📤 SMTP Connection:"
echo "   Host: localhost (or your server IP)" 
echo "   Port: 587 (Submission)"
echo "   Security: STARTTLS"
echo ""
echo "🌐 Webmail: http://localhost:8080"
echo ""
echo "📋 Next Steps:"
echo "1. Configure DNS records for your domain"
echo "2. Set up SSL certificates"
echo "3. Test email reception"
echo "4. Configure email processing service"
EOF

chmod +x start-mailserver.sh

# Create stop script
cat > stop-mailserver.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Investra AI Email Server..."
docker-compose down
echo "✅ Email server stopped"
EOF

chmod +x stop-mailserver.sh

# Create test script
cat > test-email.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Email Server Configuration..."

# Test IMAP connection
echo "📥 Testing IMAP connection..."
if command -v nc > /dev/null; then
    echo "quit" | nc localhost 993 && echo "✅ IMAP port accessible" || echo "❌ IMAP port not accessible"
else
    echo "⚠️ netcat (nc) not installed, skipping port test"
fi

# Test SMTP connection
echo "📤 Testing SMTP connection..."
if command -v nc > /dev/null; then
    echo "quit" | nc localhost 587 && echo "✅ SMTP port accessible" || echo "❌ SMTP port not accessible"
else
    echo "⚠️ netcat (nc) not installed, skipping port test"
fi

# Check docker containers
echo "🐳 Checking Docker containers..."
docker-compose ps

echo ""
echo "📧 To test email reception, send a test email to:"
echo "   transactions@investra.com"
echo ""
echo "🔍 To check logs:"
echo "   docker-compose logs mailserver"
EOF

chmod +x test-email.sh

echo ""
echo "✅ Email Server Setup Complete!"
echo ""
echo "📁 Created files:"
echo "   - docker-compose.yml"
echo "   - .env"
echo "   - start-mailserver.sh"
echo "   - stop-mailserver.sh"
echo "   - test-email.sh"
echo "   - docker-data/ directory structure"
echo ""
echo "🚀 Next steps:"
echo "1. Run: ./start-mailserver.sh"
echo "2. Configure DNS records"
echo "3. Test email reception"
echo ""
echo "📖 For DNS configuration, see DNS_SETUP.md"
