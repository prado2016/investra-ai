# Updated Task 4: Email Server Setup - Detailed Implementation

## Task 4: Email Server Infrastructure Setup
**Priority**: High | **Complexity**: High | **Dependencies**: None
**Estimated Effort**: 10-15 days

### Description
Set up dedicated email infrastructure for receiving and processing Wealthsimple confirmation emails with comprehensive configuration, security, and monitoring.

## Architecture Decision

### Recommended: AWS SES + Lambda (Production)
**Why**: Scalable, reliable, managed infrastructure with built-in security

### Alternative: Self-Hosted Postfix + Dovecot (Development/Testing)
**Why**: Complete control, easier debugging, cost-effective for low volume

## Detailed Implementation Plan

### Phase 4.1: AWS SES Setup (Recommended - 3-4 days)

#### 4.1.1 Domain and DNS Configuration (1 day)
```bash
# Domain setup checklist
- Register subdomain: investra-imports.yourdomain.com
- Configure MX record: 10 inbound-smtp.us-east-1.amazonaws.com
- Add TXT record for SES verification
- Configure SPF: "v=spf1 include:amazonses.com ~all"
- Setup DKIM records (AWS provides keys)
- Configure DMARC policy
```

**Deliverables**:
- Domain verified in AWS SES
- All DNS records properly configured
- Email deliverability tests passing

#### 4.1.2 SES Configuration (1 day)
```typescript
// AWS SES configuration
const SESConfig = {
  region: 'us-east-1',
  domain: 'investra-imports.yourdomain.com',
  emailAddress: 'transactions@investra-imports.yourdomain.com',
  s3Bucket: 'investra-email-storage',
  lambdaFunction: 'process-wealthsimple-email'
};
```

**Tasks**:
- Create SES domain identity
- Configure email receiving rules
- Set up S3 bucket for email storage
- Configure SNS notifications
- Test email reception

#### 4.1.3 Lambda Function Development (1-2 days)
```typescript
// Email processing Lambda
export const handler = async (event: SESEvent) => {
  // 1. Extract email from S3
  // 2. Validate sender (Wealthsimple only)
  // 3. Send to API for processing
  // 4. Handle errors and retries
};
```

**Tasks**:
- Develop Lambda function for email processing
- Implement error handling and DLQ
- Add logging and monitoring
- Configure IAM roles and permissions
- Deploy and test function

### Phase 4.2: Infrastructure as Code (1-2 days)

#### 4.2.1 Terraform Configuration
```hcl
# Complete AWS infrastructure
resource "aws_ses_domain_identity" "investra_domain" {
  domain = var.domain_name
}

resource "aws_lambda_function" "email_processor" {
  # Lambda configuration
}

resource "aws_s3_bucket" "email_storage" {
  # S3 bucket with lifecycle policies
}
```

**Tasks**:
- Write Terraform configurations
- Set up CI/CD pipeline for infrastructure
- Configure environment variables
- Test infrastructure deployment

### Phase 4.3: Self-Hosted Option (Alternative - 5-7 days)

#### 4.3.1 Server Setup (2 days)
```yaml
Server Requirements:
  OS: Ubuntu 22.04 LTS
  RAM: 4GB minimum
  CPU: 2 cores minimum  
  Storage: 100GB SSD
  Network: Static IP required
```

**Tasks**:
- Provision server (VPS/dedicated)
- Configure firewall (UFW)
- Install base packages
- Setup automatic security updates
- Configure backup system

#### 4.3.2 Postfix Installation and Configuration (2 days)
```bash
# Postfix setup
sudo apt install postfix dovecot-imapd mysql-server
# Configure virtual domains and users
# Setup TLS certificates
# Configure spam protection
```

**Tasks**:
- Install and configure Postfix
- Set up virtual domains and mailboxes
- Configure TLS/SSL certificates
- Implement spam and security measures
- Test email reception

#### 4.3.3 Dovecot IMAP Configuration (1 day)
```bash
# Dovecot configuration
protocols = imap lmtp
mail_location = maildir:/var/mail/vhosts/%d/%n
# SSL and authentication setup
```

**Tasks**:
- Configure Dovecot for IMAP access
- Set up SSL certificates
- Configure authentication
- Test IMAP connectivity

#### 4.3.4 Database Setup (1 day)
```sql
-- Email accounts database
CREATE TABLE virtual_domains (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE virtual_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  domain_id INT NOT NULL,
  password VARCHAR(106) NOT NULL,
  email VARCHAR(120) NOT NULL
);
```

**Tasks**:
- Setup MySQL/PostgreSQL database
- Create email account tables
- Configure Postfix/Dovecot database integration
- Create email accounts for processing

### Phase 4.4: Email Processing Application (2-3 days)

#### 4.4.1 IMAP Client Development
```typescript
// Node.js IMAP client
import { ImapFlow } from 'imapflow';

export class EmailProcessor {
  async processEmails() {
    // Connect to IMAP server
    // Search for unread Wealthsimple emails
    // Process each email
    // Mark as processed
  }
}
```

**Tasks**:
- Develop IMAP client application
- Implement email fetching and processing
- Add error handling and retry logic
- Configure email filtering (Wealthsimple only)
- Test email processing workflow

#### 4.4.2 Queue System Integration
```typescript
// Redis/Bull queue for async processing
import Bull from 'bull';

const emailQueue = new Bull('email processing', {
  redis: { port: 6379, host: 'localhost' }
});

emailQueue.process(async (job) => {
  await processEmail(job.data.emailContent);
});
```

**Tasks**:
- Set up Redis for job queueing
- Implement Bull.js job processing
- Add job status tracking
- Configure retry policies
- Implement job monitoring

### Phase 4.5: Security Implementation (1-2 days)

#### 4.5.1 Email Security
```yaml
Security Measures:
  - TLS encryption for all connections
  - Email source validation (Wealthsimple only)
  - Rate limiting on email processing
  - Fail2ban for intrusion prevention
  - Regular security updates
```

**Tasks**:
- Configure TLS/SSL certificates
- Implement email source validation
- Set up rate limiting
- Configure fail2ban
- Create security monitoring

#### 4.5.2 Data Protection
```typescript
// Email content encryption
import crypto from 'crypto';

const encryptEmailContent = (content: string): string => {
  const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
  // Encrypt email content before storage
};
```

**Tasks**:
- Implement email content encryption
- Configure data retention policies
- Set up access logging
- Implement GDPR compliance measures
- Create data deletion procedures

### Phase 4.6: Monitoring and Alerting (1-2 days)

#### 4.6.1 Health Monitoring
```typescript
// Health check system
export class EmailServerMonitoring {
  static async healthCheck() {
    return {
      emailConnectivity: await this.checkIMAPConnection(),
      diskSpace: await this.checkDiskSpace(),
      queueHealth: await this.checkEmailQueue(),
      processingBacklog: await this.checkBacklog()
    };
  }
}
```

**Tasks**:
- Implement health check endpoints
- Set up monitoring dashboards
- Configure alerting (email, SMS, Slack)
- Create log aggregation
- Set up performance monitoring

#### 4.6.2 Operational Procedures
```yaml
Procedures:
  - Daily health checks
  - Weekly backup verification  
  - Monthly security updates
  - Quarterly disaster recovery tests
```

**Tasks**:
- Document operational procedures
- Create runbooks for common issues
- Set up automated backups
- Test disaster recovery procedures
- Train team on email server management

### Phase 4.7: User Documentation (1 day)

#### 4.7.1 Setup Instructions for Users
```markdown
# Email Forwarding Setup Guide
## Gmail Users
1. Settings → Forwarding and POP/IMAP
2. Add: transactions@investra-imports.yourdomain.com
3. Create filter for Wealthsimple emails
```

**Tasks**:
- Write user setup documentation
- Create video tutorials
- Design setup wizard in app
- Test instructions with real users
- Create troubleshooting guide

## Cost Analysis

### AWS SES Option
```yaml
Setup Costs:
  - Development time: 40-60 hours
  - AWS services: $15-30/month for 1,000 users
  - Domain/SSL: $15/year
  - Monitoring tools: $20-50/month

Ongoing Costs:
  - Maintenance: 2-4 hours/month
  - AWS services: Scale with usage
  - No server administration overhead
```

### Self-Hosted Option
```yaml
Setup Costs:
  - Development time: 60-80 hours
  - Server: $25-60/month
  - Domain/SSL: $15/year
  - Backup services: $10-20/month

Ongoing Costs:
  - Maintenance: 8-16 hours/month
  - Server administration
  - Security updates and monitoring
```

## Security Considerations

### Email-Specific Threats
- **Spam and phishing**: Implement sender validation
- **Email spoofing**: Configure SPF, DKIM, DMARC
- **Data interception**: Use TLS encryption
- **Unauthorized access**: Strong authentication and monitoring

### Mitigation Strategies
```yaml
Security Layers:
  1. Network: Firewall, DDoS protection
  2. Application: Input validation, rate limiting
  3. Data: Encryption at rest and in transit
  4. Access: Authentication, authorization, logging
  5. Monitoring: Real-time alerts, audit trails
```

## Testing Strategy

### Email Reception Testing
```bash
# Test email delivery
echo "Test email content" | mail -s "Test Subject" transactions@investra-imports.yourdomain.com

# Verify processing
curl -X GET https://api.investra.com/api/email/status
```

### Load Testing
```typescript
// Simulate high email volume
for (let i = 0; i < 1000; i++) {
  await sendTestEmail(generateWealthsimpleEmail());
}
```

### Security Testing
```bash
# Test for vulnerabilities
nmap -sV your-email-server.com
sqlmap -u "http://your-api/email/process"
```

## Acceptance Criteria

### Functional Requirements
- ✅ Receives emails at dedicated address
- ✅ Processes only Wealthsimple emails
- ✅ Validates email authenticity
- ✅ Queues emails for async processing
- ✅ Provides processing status API
- ✅ Handles processing failures gracefully

### Non-Functional Requirements
- ✅ 99.9% uptime availability
- ✅ <5 minute email processing time
- ✅ Handles 10,000+ emails/month
- ✅ Email content encrypted at rest
- ✅ Complete audit trail
- ✅ Automated backup and recovery

### Security Requirements
- ✅ TLS encryption for all connections
- ✅ Email source validation
- ✅ Access logging and monitoring
- ✅ Data retention compliance
- ✅ Intrusion detection and prevention

## Rollback Plan

### AWS SES Rollback
1. Disable SES rule set
2. Route emails to backup processing
3. Revert Lambda function
4. Restore from S3 backup

### Self-Hosted Rollback
1. Stop email processing service
2. Backup current email queue
3. Revert to previous configuration
4. Restart services with old config

## Next Steps After Completion

1. **Integration Testing**: Test with real Wealthsimple emails
2. **User Beta Testing**: Limited rollout to test users
3. **Performance Optimization**: Based on real usage patterns
4. **Documentation Updates**: Refine based on user feedback
5. **Monitoring Tuning**: Adjust alerts based on operational experience

This comprehensive setup will provide a robust, secure, and scalable email processing infrastructure for your Investra AI application.