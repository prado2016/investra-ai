# Email Server Installation and Configuration Guide

## Overview
This document details the email server infrastructure needed to receive and process Wealthsimple transaction confirmation emails for automated import into Investra AI.

## Architecture Options

### Option 1: Cloud Email Service (Recommended)
**Best for**: Production deployment, reliability, scalability

#### AWS SES + Lambda + S3
```
Wealthsimple Email → AWS SES → Lambda Function → S3 Storage → API Processing
```

**Advantages**:
- Highly reliable and scalable
- Built-in spam protection
- Automatic email parsing triggers
- Cost-effective for volume
- No server maintenance

**Configuration**:
```yaml
# AWS SES Configuration
Domain: investra-imports.yourdomain.com
Email: transactions@investra-imports.yourdomain.com
Region: us-east-1 (or your preferred region)
Storage: S3 bucket for email content
Processing: Lambda function triggered by SES
```

#### Google Workspace + Cloud Functions
```
Wealthsimple Email → Gmail API → Cloud Function → Cloud Storage → API Processing
```

**Advantages**:
- Familiar Gmail interface for monitoring
- Easy integration with existing Google services
- Built-in filtering and organization

### Option 2: Self-Hosted Email Server
**Best for**: Complete control, privacy requirements, cost optimization

#### Postfix + Dovecot Setup
```
Wealthsimple Email → Postfix (SMTP) → Dovecot (IMAP) → Node.js IMAP Client → API Processing
```

**Server Requirements**:
- Linux server (Ubuntu 22.04 LTS recommended)
- 2+ GB RAM, 2+ CPU cores
- 50+ GB storage for email retention
- Static IP address
- Domain name with MX record

### Option 3: Third-Party Email Service
**Best for**: Quick setup, managed infrastructure

#### Mailgun/SendGrid/Postmark
```
Wealthsimple Email → Email Service → Webhook → Your API → Processing
```

## Recommended Solution: AWS SES + Lambda

### Step 1: Domain Setup
```bash
# 1. Configure DNS records for your domain
# MX Record: 10 inbound-smtp.us-east-1.amazonaws.com
# TXT Record for verification: "amazonses:YOUR_VERIFICATION_TOKEN"

# 2. Verify domain in AWS SES
aws ses verify-domain-identity --domain investra-imports.yourdomain.com
```

### Step 2: SES Configuration
```typescript
// ses-config.ts
export const SESConfig = {
  region: 'us-east-1',
  domain: 'investra-imports.yourdomain.com',
  emailAddress: 'transactions@investra-imports.yourdomain.com',
  s3Bucket: 'investra-email-storage',
  lambdaFunction: 'process-wealthsimple-email'
};

// SES Rule Set Configuration
const ruleSet = {
  Name: 'InvestraEmailProcessing',
  Rules: [
    {
      Name: 'WealthsimpleImports',
      Recipients: ['transactions@investra-imports.yourdomain.com'],
      Actions: [
        {
          S3Action: {
            BucketName: 'investra-email-storage',
            ObjectKeyPrefix: 'emails/',
            TopicArn: 'arn:aws:sns:us-east-1:ACCOUNT:email-received'
          }
        },
        {
          LambdaAction: {
            FunctionArn: 'arn:aws:lambda:us-east-1:ACCOUNT:function:process-wealthsimple-email'
          }
        }
      ]
    }
  ]
};
```

### Step 3: Lambda Function for Email Processing
```typescript
// lambda/email-processor.ts
import { SESEvent, Context } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import axios from 'axios';

const s3 = new S3();

export const handler = async (event: SESEvent, context: Context) => {
  console.log('Processing SES event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventSource === 'aws:ses') {
      try {
        // Get email content from S3
        const s3Object = await s3.getObject({
          Bucket: process.env.S3_BUCKET!,
          Key: `emails/${record.ses.mail.messageId}`
        }).promise();

        const emailContent = s3Object.Body?.toString('utf-8');
        
        if (emailContent) {
          // Send to your API for processing
          await axios.post(`${process.env.API_BASE_URL}/api/email/process`, {
            emailContent,
            messageId: record.ses.mail.messageId,
            timestamp: record.ses.mail.timestamp,
            source: record.ses.mail.source
          }, {
            headers: {
              'Authorization': `Bearer ${process.env.API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        console.error('Failed to process email:', error);
        // Send to DLQ or retry queue
      }
    }
  }
};
```

### Step 4: Infrastructure as Code (Terraform)
```hcl
# infrastructure/email-processing.tf
resource "aws_ses_domain_identity" "investra_domain" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "investra_dkim" {
  domain = aws_ses_domain_identity.investra_domain.domain
}

resource "aws_s3_bucket" "email_storage" {
  bucket = "investra-email-storage"
  
  lifecycle_configuration {
    rule {
      id     = "email_retention"
      status = "Enabled"
      
      expiration {
        days = 90  # Retain emails for 90 days
      }
    }
  }
}

resource "aws_lambda_function" "email_processor" {
  filename         = "email-processor.zip"
  function_name    = "process-wealthsimple-email"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.email_storage.bucket
      API_BASE_URL = var.api_base_url
      API_TOKEN = var.api_token
    }
  }
}

resource "aws_ses_receipt_rule_set" "email_rules" {
  rule_set_name = "InvestraEmailProcessing"
}

resource "aws_ses_receipt_rule" "wealthsimple_rule" {
  name          = "WealthsimpleImports"
  rule_set_name = aws_ses_receipt_rule_set.email_rules.rule_set_name
  recipients    = ["transactions@${var.domain_name}"]
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name       = aws_s3_bucket.email_storage.bucket
    object_key_prefix = "emails/"
    position          = 1
  }

  lambda_action {
    function_arn = aws_lambda_function.email_processor.arn
    position     = 2
  }
}
```

## Self-Hosted Option: Detailed Setup

### Server Requirements
```yaml
# Server Specifications
OS: Ubuntu 22.04 LTS
RAM: 4GB minimum, 8GB recommended
CPU: 2 cores minimum, 4 cores recommended
Storage: 100GB SSD minimum
Network: Static IP address required
Domain: Subdomain for email processing (e.g., mail.investra.com)
```

### Installation Script
```bash
#!/bin/bash
# install-email-server.sh

set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y postfix dovecot-imapd dovecot-pop3d \
  dovecot-lmtpd dovecot-mysql mysql-server \
  certbot python3-certbot-nginx nginx \
  fail2ban ufw

# Configure firewall
sudo ufw allow 25    # SMTP
sudo ufw allow 587   # SMTP Submission
sudo ufw allow 993   # IMAPS
sudo ufw allow 995   # POP3S
sudo ufw allow 80    # HTTP (for certbot)
sudo ufw allow 443   # HTTPS
sudo ufw allow 22    # SSH
sudo ufw --force enable

# Configure Postfix
sudo debconf-set-selections <<< "postfix postfix/mailname string $DOMAIN"
sudo debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
sudo dpkg-reconfigure -f noninteractive postfix

# Setup database for email accounts
sudo mysql -e "CREATE DATABASE mailserver;"
sudo mysql -e "CREATE USER 'mailuser'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
sudo mysql -e "GRANT SELECT ON mailserver.* TO 'mailuser'@'localhost';"

# Create email tables
sudo mysql mailserver << 'EOF'
CREATE TABLE virtual_domains (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE virtual_users (
  id INT NOT NULL AUTO_INCREMENT,
  domain_id INT NOT NULL,
  password VARCHAR(106) NOT NULL,
  email VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE
);

CREATE TABLE virtual_aliases (
  id INT NOT NULL AUTO_INCREMENT,
  domain_id INT NOT NULL,
  source VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (domain_id) REFERENCES virtual_domains(id) ON DELETE CASCADE
);
EOF

# Insert domain and user
sudo mysql mailserver -e "INSERT INTO virtual_domains (name) VALUES ('$DOMAIN');"
sudo mysql mailserver -e "INSERT INTO virtual_users (domain_id, password, email) VALUES (1, ENCRYPT('$EMAIL_PASSWORD', CONCAT('\$6\$', SUBSTRING(SHA(RAND()), -16))), 'transactions@$DOMAIN');"

echo "Email server installation completed!"
echo "Domain: $DOMAIN"
echo "Email: transactions@$DOMAIN"
echo "Next steps:"
echo "1. Configure DNS MX record"
echo "2. Setup SSL certificates"
echo "3. Configure Postfix and Dovecot"
echo "4. Test email delivery"
```

### Postfix Configuration
```bash
# /etc/postfix/main.cf
myhostname = mail.investra.com
mydomain = investra.com
myorigin = $mydomain
inet_interfaces = all
mydestination = localhost
relayhost = 
mynetworks = 127.0.0.0/8
home_mailbox = Maildir/
mailbox_command = 

# Virtual domain configuration
virtual_transport = lmtp:unix:private/dovecot-lmtp
virtual_mailbox_domains = mysql:/etc/postfix/mysql-virtual-mailbox-domains.cf
virtual_mailbox_maps = mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-alias-maps.cf

# TLS configuration
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.investra.com/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.investra.com/privkey.pem
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
```

### Dovecot Configuration
```bash
# /etc/dovecot/dovecot.conf
protocols = imap pop3 lmtp
mail_location = maildir:/var/mail/vhosts/%d/%n
mail_privileged_group = mail

# Authentication
auth_mechanisms = plain login
passdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}
userdb {
  driver = static
  args = uid=vmail gid=vmail home=/var/mail/vhosts/%d/%n
}

# SSL configuration
ssl = required
ssl_cert = </etc/letsencrypt/live/mail.investra.com/fullchain.pem
ssl_key = </etc/letsencrypt/live/mail.investra.com/privkey.pem
```

## Email Processing Application

### Node.js IMAP Client
```typescript
// email-client.ts
import { ImapFlow } from 'imapflow';
import { EmailTransactionParser } from './email-parser';

export class EmailProcessor {
  private client: ImapFlow;

  constructor(private config: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }) {
    this.client = new ImapFlow(config);
  }

  async processEmails() {
    await this.client.connect();
    
    // Lock to INBOX
    await this.client.mailboxOpen('INBOX');
    
    // Search for unread emails from Wealthsimple
    const messages = await this.client.search({
      unseen: true,
      from: 'noreply@wealthsimple.com'
    });

    for await (const message of this.client.fetch(messages, {
      envelope: true,
      bodyStructure: true,
      source: true
    })) {
      try {
        // Process the email
        await this.processEmail(message);
        
        // Mark as read
        await this.client.messageFlagsSet(message.seq, ['\\Seen']);
      } catch (error) {
        console.error('Failed to process email:', error);
        // Mark with custom flag for failed processing
        await this.client.messageFlagsSet(message.seq, ['\\Flagged']);
      }
    }

    await this.client.logout();
  }

  private async processEmail(message: any) {
    const emailContent = message.source.toString();
    
    // Send to your API for processing
    const result = await EmailTransactionParser.parseAndCreateTransaction(
      emailContent,
      this.determinePortfolioId(emailContent)
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }
  }
}
```

### Monitoring and Health Checks
```typescript
// monitoring.ts
export class EmailServerMonitoring {
  static async healthCheck() {
    const checks = await Promise.allSettled([
      this.checkEmailConnectivity(),
      this.checkDiskSpace(),
      this.checkEmailQueue(),
      this.checkProcessingBacklog()
    ]);

    return {
      status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: checks.map((check, index) => ({
        name: ['connectivity', 'disk', 'queue', 'backlog'][index],
        status: check.status,
        details: check.status === 'fulfilled' ? check.value : check.reason
      }))
    };
  }

  private static async checkEmailConnectivity() {
    // Test IMAP connection
    const client = new ImapFlow(CONFIG.email);
    try {
      await client.connect();
      await client.logout();
      return { status: 'ok' };
    } catch (error) {
      throw new Error(`Email connectivity failed: ${error.message}`);
    }
  }
}
```

## User Setup Instructions

### Email Forwarding Setup (For Users)
```markdown
# Setting Up Email Forwarding for Investra AI

## Gmail Users
1. Go to Gmail Settings → Forwarding and POP/IMAP
2. Add forwarding address: transactions@investra-imports.yourdomain.com
3. Create filter for emails from: noreply@wealthsimple.com
4. Set action: Forward to transactions@investra-imports.yourdomain.com

## Outlook Users
1. Go to Settings → Mail → Forwarding
2. Enable forwarding to: transactions@investra-imports.yourdomain.com
3. Create rule for Wealthsimple emails
4. Set action: Forward to specified address

## iPhone Mail
1. Settings → Mail → Rules
2. Create rule for sender: noreply@wealthsimple.com
3. Action: Forward to transactions@investra-imports.yourdomain.com
```

## Security Considerations

### Email Security
```yaml
Security Measures:
  - TLS encryption for all email transmission
  - SPF, DKIM, DMARC records configured
  - Fail2ban for brute force protection
  - Regular security updates
  - Email content encryption at rest
  - Access logging and monitoring
  - Rate limiting on processing
  - Email source validation (Wealthsimple only)
```

### Data Privacy
```yaml
Privacy Protections:
  - Email retention policy (90 days max)
  - Automatic PII redaction in logs
  - Encrypted storage of email content
  - User consent for email processing
  - Data deletion on user request
  - GDPR/CCPA compliance measures
```

## Cost Analysis

### AWS SES Option
```yaml
Monthly Costs (estimated):
  - SES: $0.10 per 1,000 emails received
  - Lambda: $0.20 per 1M requests
  - S3 Storage: $0.023 per GB
  - Data Transfer: $0.09 per GB
  
Estimated monthly cost for 1,000 users: $15-30
```

### Self-Hosted Option
```yaml
Monthly Costs:
  - VPS Server: $20-50/month
  - Domain: $10-15/year
  - SSL Certificate: Free (Let's Encrypt)
  - Maintenance: 4-8 hours/month
  
Total monthly cost: $25-60 + maintenance time
```

## Recommendation

**For Production**: Use AWS SES + Lambda approach
- More reliable and scalable
- Better security and monitoring
- Lower maintenance overhead
- Built-in redundancy and backup

**For Development/Testing**: Self-hosted option
- Complete control over configuration
- Easier debugging and testing
- No external dependencies
- Cost-effective for low volume

This infrastructure will provide a robust foundation for your email-based transaction import feature!