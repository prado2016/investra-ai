# Email Import API - AI Integration Strategy

## Overview
Yes, the email import API will absolutely leverage your existing AI features! Your app already has sophisticated AI infrastructure that we can extend for email processing.

## Current AI Features Available

### 1. **EnhancedAISymbolParser** 
Your existing `EnhancedAISymbolParser` service provides:
- Natural language query parsing
- Stock/ETF/Option detection
- Yahoo Finance symbol conversion
- Confidence scoring
- Options metadata extraction (strike, expiry, type)

### 2. **AssetService.getOrCreateAsset()**
Your current service already:
- Auto-detects asset types (stock, ETF, option)
- Creates assets if they don't exist
- Updates asset types when patterns change
- Handles option symbol parsing and naming

### 3. **Asset Type Detection**
Your `assetCategorization` utility provides:
- Pattern-based asset type detection
- Option symbol parsing
- Strike/expiry extraction

## Enhanced Email Processing Pipeline

Here's how the email import will leverage your existing AI:

```typescript
// Email Processing Flow with AI Integration
async function processWealthsimpleEmail(emailContent: string) {
  // 1. Parse email to extract transaction details
  const parsedEmail = await parseEmailContent(emailContent);
  // Result: { symbol: "TSLL 13.00 call", account: "RRSP", ... }
  
  // 2. Use YOUR EXISTING AI to process the symbol
  const aiResult = await EnhancedAISymbolParser.parseQuery(parsedEmail.symbol);
  // Result: { parsedSymbol: "TSLL250613C00013000", confidence: 0.95, type: "option" }
  
  // 3. Use YOUR EXISTING AssetService to create/get asset
  const assetResult = await AssetService.getOrCreateAsset(aiResult.parsedSymbol);
  // Result: Creates option asset with proper naming and categorization
  
  // 4. Create transaction with validated data
  const transaction = await TransactionService.createTransaction(
    portfolioId,
    assetResult.data.id,
    parsedEmail.type,
    parsedEmail.quantity,
    parsedEmail.price,
    parsedEmail.date
  );
  
  return transaction;
}
```

## AI Integration Points

### 1. **Symbol Processing** 
Email contains: `"TSLL 13.00 call"`
- **Current AI**: Already handles this exact pattern
- **Enhancement**: Extend with email-specific patterns
- **Result**: Converts to Yahoo Finance format `TSLL250613C00013000`

### 2. **Asset Type Detection**
Email contains various instruments:
- **Stocks**: "AAPL", "TSLA"
- **Options**: "TSLL 13.00 call", "SPY Jun 21 $400 put"
- **ETFs**: "VTI", "QQQ"
- **Current AI**: Already detects all these types
- **Result**: Proper categorization and handling

### 3. **Validation & Confidence**
- **Current AI**: Provides confidence scores
- **Enhancement**: Use confidence to trigger manual review for low-confidence parses
- **Result**: High accuracy with fallback to manual verification

## Enhanced Email Parser Implementation

```typescript
export class EmailTransactionParser {
  /**
   * Parse Wealthsimple email and create transaction
   */
  static async parseAndCreateTransaction(
    emailContent: string,
    portfolioId: string
  ): Promise<ServiceResponse<Transaction>> {
    try {
      // 1. Extract basic transaction data from email
      const emailData = this.extractEmailData(emailContent);
      
      // 2. Use existing AI to process symbol
      const symbolResult = await EnhancedAISymbolParser.parseQuery(emailData.symbol);
      
      // 3. Validate confidence level
      if (symbolResult.confidence < 0.8) {
        // Queue for manual review
        await this.queueForManualReview(emailData, symbolResult);
        return { data: null, error: 'Low confidence - queued for review', success: false };
      }
      
      // 4. Use existing AssetService
      const assetResult = await AssetService.getOrCreateAsset(symbolResult.parsedSymbol);
      if (!assetResult.success) {
        throw new Error(assetResult.error || 'Failed to create asset');
      }
      
      // 5. Create transaction using existing service
      const transactionResult = await TransactionService.createTransaction(
        portfolioId,
        assetResult.data!.id,
        emailData.transactionType,
        emailData.quantity,
        emailData.price,
        emailData.date
      );
      
      return transactionResult;
      
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }
  
  /**
   * Extract transaction data from Wealthsimple email
   */
  private static extractEmailData(emailContent: string) {
    // Parse email HTML/text to extract:
    // - Account: RRSP → Portfolio mapping
    // - Type: "Limit Buy to Close" → TransactionType
    // - Option: "TSLL 13.00 call" → Symbol for AI processing
    // - Contracts: "10" → Quantity
    // - Average price: "US$0.02" → Price
    // - Total cost: "US$27.50" → Total amount
    // - Time: "June 13, 2025 10:44 EDT" → Date
    
    return {
      account: 'RRSP',
      symbol: 'TSLL 13.00 call',
      transactionType: 'sell' as TransactionType, // "Buy to Close" maps to sell
      quantity: 10,
      price: 0.02,
      totalAmount: 27.50,
      date: new Date('2025-06-13T10:44:00-04:00')
    };
  }
}
```

## Benefits of AI Integration

### 1. **Consistency**
- Same AI logic for manual entry and email import
- Consistent symbol formatting and asset creation
- Unified validation rules

### 2. **Accuracy**
- Leverage proven AI parsing accuracy
- Confidence scoring prevents bad imports
- Existing validation rules apply

### 3. **Maintainability**
- Single AI codebase to maintain
- Improvements benefit both manual and automated entry
- Consistent error handling

### 4. **User Experience**
- Familiar symbol formats and asset names
- Same AI suggestions and corrections
- Seamless integration with existing workflows

## Email-Specific Enhancements

### 1. **Email Pattern Training**
Extend `EnhancedAISymbolParser` with email-specific patterns:
```typescript
// Add to existing patterns
const emailPatterns = [
  /(\w+)\s+(\d+\.\d+)\s+(call|put)/i,  // "TSLL 13.00 call"
  /(\w+)\s+(Jun|Jul|Aug)\s+(\d+)\s+\$(\d+)\s+(call|put)/i,  // "AAPL Jun 21 $200 call"
];
```

### 2. **Transaction Type Mapping**
Map Wealthsimple language to your transaction types:
```typescript
const transactionTypeMap = {
  'Limit Buy to Close': 'sell',     // Closing long position
  'Limit Sell to Open': 'sell',     // Opening short position
  'Market Buy': 'buy',              // Standard buy
  'Market Sell': 'sell',            // Standard sell
  'Dividend': 'dividend'            // Dividend payment
};
```

### 3. **Confidence Tuning**
Adjust confidence thresholds for email context:
- Email parsing typically has cleaner, more structured data
- Can use higher confidence thresholds
- Better pattern matching due to consistent formatting

## Updated Task Integration

I'll update the task breakdown to show this AI integration:

**Task 5: Email Parsing Engine** now includes:
- ✅ Extend existing `EnhancedAISymbolParser` for email patterns
- ✅ Integrate with existing `AssetService.getOrCreateAsset()`
- ✅ Use existing asset type detection and validation
- ✅ Leverage confidence scoring for manual review triggers

This approach maximizes code reuse, maintains consistency, and builds on your proven AI infrastructure!
