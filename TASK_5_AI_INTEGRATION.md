# Updated Task 5: Email Parsing Engine with AI Integration

## Task 5: AI-Enhanced Email Parsing Engine
**Priority**: High | **Complexity**: Medium | **Dependencies**: Task 4, Existing AI Services

### Description
Develop robust email parsing system that leverages your existing AI infrastructure (`EnhancedAISymbolParser`, `AssetService`) to extract and validate transaction data from Wealthsimple emails.

### AI Integration Points
This task will **extend and reuse** your existing AI features rather than building from scratch:

#### Existing AI Assets to Leverage:
- ✅ `EnhancedAISymbolParser.parseQuery()` - Already handles "TSLL 13.00 call" patterns
- ✅ `AssetService.getOrCreateAsset()` - Auto-creates assets with proper typing
- ✅ Asset type detection - Stock/ETF/Option categorization
- ✅ Yahoo Finance symbol conversion
- ✅ Confidence scoring and validation

### Detailed Subtasks

#### 5.1 Email Content Extraction
**Effort**: 1-2 days
- Parse Wealthsimple email HTML/text structure
- Extract structured data fields:
  - Account type: "RRSP" → Portfolio mapping
  - Transaction type: "Limit Buy to Close" → TransactionType
  - Symbol: "TSLL 13.00 call" → AI processing input
  - Quantity: "10 contracts" → Number conversion
  - Pricing: "US$0.02" average, "US$27.50" total
  - Timestamp: "June 13, 2025 10:44 EDT" → Date parsing
- Handle multiple email formats (stocks vs options vs dividends)

#### 5.2 AI Symbol Processing Integration
**Effort**: 1 day
- **Reuse existing**: `EnhancedAISymbolParser.parseQuery(emailData.symbol)`
- Input: `"TSLL 13.00 call"` from email
- Output: `{parsedSymbol: "TSLL250613C00013000", confidence: 0.95, type: "option"}`
- Add email-specific confidence thresholds
- Handle low-confidence cases with manual review queue

#### 5.3 Asset Creation Integration  
**Effort**: 0.5 days
- **Reuse existing**: `AssetService.getOrCreateAsset(symbolResult.parsedSymbol)`
- Leverage existing asset type detection
- Use existing option naming: "TSLL Jun 13 $13.00 CALL"
- No new asset creation logic needed

#### 5.4 Transaction Type Mapping
**Effort**: 1 day
- Map Wealthsimple email language to app transaction types:
  ```typescript
  const emailToTransactionType = {
    'Limit Buy to Close': 'sell',    // Closing long option position
    'Limit Sell to Open': 'sell',    // Opening short position  
    'Market Buy': 'buy',             // Standard stock purchase
    'Market Sell': 'sell',           // Standard stock sale
    'Dividend': 'dividend',          // Dividend payment
    'Interest': 'dividend'           // Interest as dividend
  };
  ```

#### 5.5 Enhanced AI Pattern Recognition
**Effort**: 2 days
- Extend existing `EnhancedAISymbolParser` with email-specific patterns:
  ```typescript
  // Add to existing parseQuery logic
  const emailSpecificPatterns = [
    /(\w+)\s+(\d+\.\d+)\s+(call|put)/i,  // "TSLL 13.00 call"
    /(\w+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\s+\$(\d+)\s+(call|put)/i
  ];
  ```
- Fine-tune confidence scoring for email context
- Add email validation patterns

#### 5.6 Portfolio Account Mapping
**Effort**: 1 day
- Create mapping service for Wealthsimple accounts to app portfolios:
  ```typescript
  const accountToPortfolio = {
    'RRSP': 'rrsp_portfolio_id',
    'TFSA': 'tfsa_portfolio_id', 
    'RESP': 'resp_portfolio_id',
    'Margin': 'margin_portfolio_id'
  };
  ```
- Handle unknown account types gracefully
- Add configuration interface for custom mappings

#### 5.7 Validation and Error Handling
**Effort**: 2 days
- **Reuse existing**: Asset validation, symbol validation
- Add email-specific validation:
  - Date/time parsing and timezone handling
  - Currency conversion (CAD/USD)
  - Quantity validation (contracts vs shares)
  - Price validation against market data
- Create comprehensive error messages for debugging

#### 5.8 Integration Testing
**Effort**: 2 days
- Test with real Wealthsimple email samples
- Verify AI symbol processing accuracy
- Test asset creation and type detection
- Validate portfolio mapping
- Performance testing with batch emails

### Implementation Code Structure

```typescript
export class EmailTransactionParser {
  /**
   * Main parsing method - integrates with existing AI
   */
  static async parseAndCreateTransaction(
    emailContent: string, 
    portfolioId: string
  ): Promise<ServiceResponse<Transaction>> {
    
    // 1. Extract raw data from email (NEW)
    const emailData = await this.extractEmailData(emailContent);
    
    // 2. Use EXISTING AI for symbol processing
    const symbolResult = await EnhancedAISymbolParser.parseQuery(emailData.symbol);
    
    // 3. Use EXISTING asset service
    const assetResult = await AssetService.getOrCreateAsset(symbolResult.parsedSymbol);
    
    // 4. Use EXISTING transaction service
    return await TransactionService.createTransaction(
      portfolioId,
      assetResult.data!.id,
      emailData.transactionType,
      emailData.quantity,
      emailData.price,
      emailData.date
    );
  }
}
```

### Acceptance Criteria
- ✅ Successfully parses your example email: RRSP, TSLL 13.00 call, 10 contracts, $0.02, etc.
- ✅ Integrates seamlessly with existing `EnhancedAISymbolParser`
- ✅ Reuses existing `AssetService.getOrCreateAsset()` without modification
- ✅ Maintains >95% parsing accuracy using existing AI confidence scoring
- ✅ Handles all major Wealthsimple transaction types (buy, sell, options, dividends)
- ✅ Proper error handling and logging for failed AI parsing
- ✅ Creates transactions identical to manual entry using same services

### Benefits of AI Integration Approach
1. **Code Reuse**: 70% of symbol processing logic already exists
2. **Consistency**: Same AI logic for manual and automated entry
3. **Reliability**: Proven AI system with confidence scoring
4. **Maintainability**: Single AI codebase, improvements benefit both pathways
5. **Speed**: Reduced development time by leveraging existing infrastructure

### Estimated Effort
**Total**: 8-10 days (reduced from 15+ days without AI integration)
- Email parsing: 3-4 days  
- AI integration: 1-2 days (vs 5+ days building from scratch)
- Testing: 2-3 days
- Documentation: 1 day

This approach maximizes your existing AI investment while building robust email processing capabilities!