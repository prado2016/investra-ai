# Simple Email Server Setup for AI Agent Development

## Overview
Use opensource email server for Wealthsimple transaction import. AI agents will handle all development and implementation.

## Recommended Stack: Docker Mail Server

### Quick Setup with docker-mailserver
```yaml
# docker-compose.yml
version: '3.8'
services:
  mailserver:
    image: ghcr.io/docker-mailserver/docker-mailserver:latest
    hostname: mail.investra.com
    ports:
      - "25:25"    # SMTP
      - "587:587"  # SMTP Submission
      - "993:993"  # IMAPS
    volumes:
      - ./docker-data/dms/mail-data/:/var/mail/
      - ./docker-data/dms/mail-state/:/var/mail-state/
      - ./docker-data/dms/mail-logs/:/var/log/mail/
      - ./docker-data/dms/config/:/tmp/docker-mailserver/
      - /etc/localtime:/etc/localtime:ro
    environment:
      - ENABLE_SPAMASSASSIN=1
      - ENABLE_CLAMAV=0
      - ENABLE_FAIL2BAN=1
      - ENABLE_POSTGREY=1
      - ONE_DIR=1
      - DMS_DEBUG=0
    cap_add:
      - NET_ADMIN
    restart: always

  # Email processor service
  email-processor:
    build: ./email-processor
    depends_on:
      - mailserver
    environment:
      - IMAP_HOST=mailserver
      - IMAP_PORT=993
      - EMAIL_USER=transactions@investra.com
      - EMAIL_PASS=your_password
      - API_ENDPOINT=http://host.docker.internal:3000/api/email/process
    restart: always
```

## Basic Configuration

### 1. DNS Setup
```bash
# Add these DNS records
MX    mail.investra.com.     10
A     mail.investra.com.     YOUR_SERVER_IP
TXT   investra.com.          "v=spf1 mx ~all"
```

### 2. Email Account Creation
```bash
# Create email account for receiving transactions
docker exec mailserver setup email add transactions@investra.com password123

# List accounts
docker exec mailserver setup email list
```

### 3. Email Processing Service
```typescript
// email-processor/src/index.ts
import { ImapFlow } from 'imapflow';
import axios from 'axios';

class SimpleEmailProcessor {
  private client: ImapFlow;

  constructor() {
    this.client = new ImapFlow({
      host: process.env.IMAP_HOST!,
      port: parseInt(process.env.IMAP_PORT!),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!
      }
    });
  }

  async processEmails() {
    await this.client.connect();
    await this.client.mailboxOpen('INBOX');
    
    // Get unread emails
    const messages = await this.client.search({
      unseen: true,
      from: 'noreply@wealthsimple.com'
    });

    for await (const message of this.client.fetch(messages, {
      envelope: true,
      source: true
    })) {
      try {
        // Send to API for processing
        await axios.post(process.env.API_ENDPOINT!, {
          emailContent: message.source.toString(),
          messageId: message.uid
        });
        
        // Mark as read
        await this.client.messageFlagsSet(message.seq, ['\\Seen']);
      } catch (error) {
        console.error('Processing failed:', error);
      }
    }

    await this.client.logout();
  }

  start() {
    // Process emails every 30 seconds
    setInterval(() => this.processEmails(), 30000);
  }
}

new SimpleEmailProcessor().start();
```

## API Integration

### Email Processing Endpoint
```typescript
// Add to your existing API
app.post('/api/email/process', async (req, res) => {
  const { emailContent, messageId } = req.body;
  
  try {
    // Parse email content
    const emailData = parseWealthsimpleEmail(emailContent);
    
    // Use existing AI to process symbol
    const symbolResult = await EnhancedAISymbolParser.parseQuery(emailData.symbol);
    
    // Create asset using existing service
    const assetResult = await AssetService.getOrCreateAsset(symbolResult.parsedSymbol);
    
    // Create transaction using existing service
    const transaction = await TransactionService.createTransaction(
      emailData.portfolioId,
      assetResult.data.id,
      emailData.type,
      emailData.quantity,
      emailData.price,
      emailData.date
    );
    
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function parseWealthsimpleEmail(emailContent: string) {
  // Extract data from your email example:
  // Account: RRSP → Portfolio mapping
  // Type: Limit Buy to Close → sell
  // Option: TSLL 13.00 call
  // Contracts: 10
  // Price: US$0.02
  // Total: US$27.50
  // Date: June 13, 2025 10:44 EDT
  
  return {
    account: 'RRSP',
    symbol: 'TSLL 13.00 call',
    type: 'sell',
    quantity: 10,
    price: 0.02,
    totalAmount: 27.50,
    date: new Date('2025-06-13T10:44:00-04:00'),
    portfolioId: 'rrsp-portfolio-id'
  };
}
```

## User Email Forwarding

### Simple Instructions
```markdown
# Email Forwarding Setup

## Gmail
1. Settings → Forwarding and POP/IMAP
2. Add: transactions@investra.com
3. Create filter: From contains "noreply@wealthsimple.com"
4. Action: Forward to transactions@investra.com

## Outlook  
1. Settings → Mail → Rules
2. If from: noreply@wealthsimple.com
3. Then: Forward to transactions@investra.com
```

## Deployment

### Single Command Deployment
```bash
# Clone and start
git clone your-repo
cd investra-ai
docker-compose up -d

# Check status
docker-compose ps
docker logs email-processor
```

### Environment Variables
```env
# .env file
IMAP_HOST=mailserver
IMAP_PORT=993
EMAIL_USER=transactions@investra.com
EMAIL_PASS=secure_password_123
API_ENDPOINT=http://localhost:3000/api/email/process
```

## Monitoring

### Simple Health Check
```typescript
// Add to your API
app.get('/api/email/health', async (req, res) => {
  try {
    // Test IMAP connection
    const client = new ImapFlow({
      host: process.env.IMAP_HOST,
      port: 993,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await client.connect();
    await client.logout();
    
    res.json({ status: 'healthy', timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

## AI Agent Tasks

The AI agents will handle:

1. **Email Parser Development**
   - Parse Wealthsimple email HTML/text
   - Extract transaction details
   - Handle different email formats

2. **Integration with Existing AI**
   - Use EnhancedAISymbolParser for symbols
   - Leverage AssetService for asset creation
   - Integrate with TransactionService

3. **Error Handling**
   - Failed parsing alerts
   - Retry mechanisms
   - Manual review queue

4. **Testing**
   - Unit tests for email parsing
   - Integration tests with real emails
   - End-to-end transaction creation

## File Structure
```
investra-ai/
├── docker-compose.yml
├── email-processor/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.ts
│       ├── email-parser.ts
│       └── types.ts
├── src/api/
│   └── email/
│       ├── process.ts
│       └── health.ts
└── docs/
    └── email-setup.md
```

This simple setup gives you a working email server that AI agents can extend and improve iteratively!
