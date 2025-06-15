# Task 4: Simple Email Server Setup (AI Agent Implementation)

## Task 4: Email Server Setup - AI Agent Approach
**Priority**: High | **Complexity**: Medium | **Dependencies**: None

### Description
Set up opensource email server using docker-mailserver for receiving Wealthsimple emails. AI agents will handle all development and configuration.

## Implementation: docker-mailserver

### Core Components
- **docker-mailserver**: Opensource email server in Docker
- **IMAP processor**: Node.js service to fetch emails
- **API integration**: Connect to existing Investra AI services

### AI Agent Responsibilities

#### Agent 1: Email Infrastructure Setup
```yaml
Tasks:
  - Configure docker-compose.yml with mailserver
  - Set up DNS records (MX, A, SPF)
  - Create email account: transactions@investra.com
  - Configure basic security (fail2ban, spam protection)
  - Test email reception and IMAP access
```

#### Agent 2: Email Processing Service
```yaml
Tasks:
  - Build IMAP client using imapflow library
  - Implement email fetching (unread Wealthsimple emails only)
  - Add error handling and retry logic
  - Create Docker container for processor
  - Integrate with existing API endpoint
```

#### Agent 3: API Integration
```yaml
Tasks:
  - Create /api/email/process endpoint
  - Integrate parseWealthsimpleEmail() function
  - Connect to existing EnhancedAISymbolParser
  - Use existing AssetService and TransactionService
  - Add /api/email/health endpoint
```

#### Agent 4: Email Parser Logic
```yaml
Tasks:
  - Parse Wealthsimple email HTML/text structure
  - Extract: account, symbol, type, quantity, price, date
  - Handle different email formats (stocks, options, dividends)
  - Map account types (RRSP, TFSA) to portfolios
  - Validate extracted data before processing
```

## Quick Setup Commands

### 1. Docker Deployment
```bash
# docker-compose.yml already provided
docker-compose up -d mailserver

# Create email account
docker exec mailserver setup email add transactions@investra.com secure123

# Start email processor
docker-compose up -d email-processor
```

### 2. DNS Configuration
```bash
# Add these DNS records
MX    mail.investra.com.     10
A     mail.investra.com.     YOUR_SERVER_IP  
TXT   investra.com.          "v=spf1 mx ~all"
```

### 3. API Integration
```typescript
// Add to existing Express app
app.post('/api/email/process', async (req, res) => {
  const { emailContent } = req.body;
  
  // Parse email (AI agent will implement)
  const emailData = parseWealthsimpleEmail(emailContent);
  
  // Use existing AI services
  const symbolResult = await EnhancedAISymbolParser.parseQuery(emailData.symbol);
  const assetResult = await AssetService.getOrCreateAsset(symbolResult.parsedSymbol);
  
  // Create transaction
  const transaction = await TransactionService.createTransaction(
    emailData.portfolioId,
    assetResult.data.id,
    emailData.type,
    emailData.quantity,
    emailData.price,
    emailData.date
  );
  
  res.json({ success: true, transaction });
});
```

## Email Processing Flow

### Input: Wealthsimple Email
```
From: noreply@wealthsimple.com
Subject: Your order has been filled

Account: RRSP
Type: Limit Buy to Close  
Option: TSLL 13.00 call
Contracts: 10
Average price: US$0.02
Total cost: US$27.50
Time: June 13, 2025 10:44 EDT
```

### Output: Transaction Data
```typescript
{
  account: 'RRSP',
  symbol: 'TSLL 13.00 call',
  type: 'sell', // "Buy to Close" = sell
  quantity: 10,
  price: 0.02,
  totalAmount: 27.50,
  date: new Date('2025-06-13T10:44:00-04:00'),
  portfolioId: 'rrsp-portfolio-id'
}
```

### AI Processing Chain
```
Email → parseWealthsimpleEmail() → EnhancedAISymbolParser → AssetService → TransactionService
```

## File Structure for AI Agents

```
investra-ai/
├── docker-compose.yml                    # Agent 1
├── email-processor/                      # Agent 2
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.ts
├── src/api/email/                        # Agent 3
│   ├── process.ts
│   └── health.ts
└── src/services/                         # Agent 4
    └── emailParser.ts
```

## Testing Strategy for AI Agents

### Agent Testing Tasks
```yaml
Agent 1 Testing:
  - Email server receives emails successfully
  - IMAP connection works
  - DNS records configured correctly

Agent 2 Testing:
  - IMAP client fetches unread emails
  - Only processes Wealthsimple emails
  - Marks emails as read after processing

Agent 3 Testing:
  - API endpoint receives email content
  - Integration with existing services works
  - Health check endpoint functional

Agent 4 Testing:
  - Parse your example email correctly
  - Extract all transaction details
  - Handle malformed emails gracefully
```

## User Setup Documentation

### Simple Email Forwarding
```markdown
# Forward Wealthsimple emails to: transactions@investra.com

Gmail: Settings → Forwarding → Add transactions@investra.com
Outlook: Rules → Forward from noreply@wealthsimple.com
Apple Mail: Rules → Forward Wealthsimple emails
```

## Success Criteria

### Functional Requirements
- ✅ Email server receives Wealthsimple emails
- ✅ IMAP processor fetches emails every 30 seconds
- ✅ API correctly parses email content
- ✅ Transactions created using existing AI services
- ✅ Failed processing triggers alerts

### Integration Requirements  
- ✅ Uses existing EnhancedAISymbolParser
- ✅ Uses existing AssetService.getOrCreateAsset()
- ✅ Uses existing TransactionService
- ✅ Maintains same transaction format as manual entry
- ✅ Works with existing portfolio system

## AI Agent Coordination

### Development Sequence
1. **Agent 1**: Set up email infrastructure first
2. **Agent 4**: Develop email parsing logic in parallel  
3. **Agent 3**: Create API endpoints after parsing ready
4. **Agent 2**: Build email processor last to integrate all pieces

### Shared Resources
- All agents use existing AI services (no duplication)
- Shared types and interfaces for consistency
- Common error handling patterns
- Unified logging and monitoring

This simplified approach lets AI agents focus on the core functionality without overengineering the infrastructure!
