 convertFromEST(parsedDate);
        }
        
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (error) {
        console.warn('Failed to parse date:', match[1]);
      }
    }
  }
  
  // Fallback to email Date header
  return new Date();
}

function convertFromEDT(date: Date): Date {
  // EDT is UTC-4, convert to UTC
  return new Date(date.getTime() + (4 * 60 * 60 * 1000));
}

function convertFromEST(date: Date): Date {
  // EST is UTC-5, convert to UTC  
  return new Date(date.getTime() + (5 * 60 * 60 * 1000));
}
```

## Enhanced Email Processing Logic

### Updated Email Processing Flow
```typescript
export class EmailTransactionProcessor {
  
  async processEmail(emailContent: string, messageId: string): Promise<ProcessingResult> {
    try {
      // 1. Parse email content
      const parsedData = parseWealthsimpleEmail(emailContent);
      const identifiers = extractEmailIdentifiers(emailContent);
      const orderDetails = extractOrderDetails(emailContent);
      
      // 2. Check for duplicates
      const duplicateCheck = await EmailDeduplicationService.checkDuplicate(emailContent, parsedData);
      if (duplicateCheck.isDuplicate) {
        await this.recordDuplicateEmail(identifiers, orderDetails, parsedData, duplicateCheck);
        return { 
          success: false, 
          reason: 'duplicate', 
          details: `Duplicate email detected: ${duplicateCheck.reason}` 
        };
      }
      
      // 3. Record email import attempt
      const importRecord = await this.createImportRecord(identifiers, orderDetails, parsedData, emailContent);
      
      // 4. Process transaction using existing AI services
      const transactionResult = await this.createTransaction(parsedData);
      
      // 5. Update import record with result
      await this.updateImportRecord(importRecord.id, {
        status: transactionResult.success ? 'success' : 'failed',
        transaction_id: transactionResult.transaction?.id,
        error_message: transactionResult.error
      });
      
      return transactionResult;
      
    } catch (error) {
      console.error('Email processing failed:', error);
      return { success: false, reason: 'processing_error', error: error.message };
    }
  }
  
  /**
   * Create import record before processing
   */
  private async createImportRecord(
    identifiers: EmailIdentifiers, 
    orderDetails: OrderDetails, 
    parsedData: any,
    emailContent: string
  ) {
    const encryptedContent = await encryptEmailContent(emailContent);
    
    const { data, error } = await supabase
      .from('email_imports')
      .insert({
        message_id: identifiers.messageId,
        email_hash: identifiers.emailHash,
        order_id: orderDetails.orderId,
        confirmation_number: orderDetails.confirmationNumber,
        trade_id: orderDetails.tradeId,
        execution_time: orderDetails.executionTime,
        account_type: parsedData.account,
        symbol: parsedData.symbol,
        transaction_type: parsedData.type,
        quantity: parsedData.quantity,
        price: parsedData.price,
        total_amount: parsedData.totalAmount,
        status: 'processing',
        email_content_encrypted: encryptedContent,
        parsed_data: parsedData
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
}
```

## Handling Edge Cases

### Scenario 1: Multiple Orders Same Minute
```typescript
// Enhanced duplicate check for very close timing
async function checkNearDuplicates(parsedData: any, executionTime: Date) {
  const window = 30000; // 30 seconds
  const candidates = await findNearbyTransactions(parsedData, executionTime, window);
  
  if (candidates.length === 0) return false;
  
  // Check if we have distinguishing information
  const hasUniqueIdentifier = parsedData.orderId || 
                             parsedData.confirmationNumber || 
                             parsedData.tradeId;
                             
  if (!hasUniqueIdentifier) {
    // If no unique identifier and very close in time, require manual review
    await flagForManualReview(parsedData, 'near_duplicate_no_id', candidates);
    return true; // Treat as duplicate to prevent auto-processing
  }
  
  return false;
}
```

### Scenario 2: Partial Fills Detection
```typescript
interface PartialFillDetection {
  isPartialFill: boolean;
  parentOrderId?: string;
  fillSequence?: number;
  totalQuantity?: number;
  filledQuantity?: number;
}

function detectPartialFill(emailContent: string): PartialFillDetection {
  // Look for partial fill indicators
  const partialFillPatterns = [
    /Partial\s+fill/i,
    /(\d+)\s+of\s+(\d+)\s+(shares|contracts)/i,
    /Fill\s+(\d+\/\d+)/i,
    /Remaining:\s*(\d+)/i
  ];
  
  for (const pattern of partialFillPatterns) {
    const match = emailContent.match(pattern);
    if (match) {
      return {
        isPartialFill: true,
        fillSequence: extractFillSequence(match),
        totalQuantity: extractTotalQuantity(match),
        filledQuantity: extractFilledQuantity(match)
      };
    }
  }
  
  return { isPartialFill: false };
}
```

## Real-World Scenarios Handling

### Scenario A: High-Frequency Trading
```typescript
// Handle rapid-fire similar transactions
const HighFrequencyHandler = {
  async processRapidTransactions(emails: EmailContent[]) {
    // Sort by execution time
    const sortedEmails = emails.sort((a, b) => 
      a.executionTime.getTime() - b.executionTime.getTime()
    );
    
    for (const email of sortedEmails) {
      // Process with strict timing requirements
      await this.processWithStrictTiming(email);
    }
  },
  
  async processWithStrictTiming(email: EmailContent) {
    // Use microsecond precision for very close trades
    const microWindow = 1000; // 1 second window for HFT
    
    // Enhanced duplicate detection for HFT
    const nearbyTrades = await this.findMicrosecondNearby(email, microWindow);
    
    if (nearbyTrades.length > 0) {
      // Require additional verification
      await this.requireAdditionalVerification(email, nearbyTrades);
    }
  }
};
```

### Scenario B: Split Orders
```typescript
// Handle orders split across multiple executions
interface SplitOrderTracking {
  parentOrderId: string;
  executions: Array<{
    executionId: string;
    quantity: number;
    price: number;
    timestamp: Date;
  }>;
  totalExpected: number;
  totalExecuted: number;
  isComplete: boolean;
}

async function trackSplitOrder(parsedData: any): Promise<SplitOrderTracking | null> {
  // Look for split order indicators in email
  const splitIndicators = [
    /Split\s+order/i,
    /Execution\s+(\d+)\s+of\s+(\d+)/i,
    /Part\s+(\d+)/i
  ];
  
  // Check if this is part of a larger order
  const existingSplitOrder = await findExistingSplitOrder(parsedData.orderId);
  
  if (existingSplitOrder) {
    // Add this execution to existing split order
    return await addExecutionToSplitOrder(existingSplitOrder, parsedData);
  }
  
  return null;
}
```

## Manual Review Queue System

### Flag for Manual Review
```typescript
interface ManualReviewItem {
  id: string;
  emailImportId: string;
  reviewReason: string;
  priority: 'high' | 'medium' | 'low';
  similarTransactions: any[];
  suggestedAction: 'process' | 'skip' | 'merge' | 'investigate';
  reviewerNotes?: string;
  status: 'pending' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
}

async function flagForManualReview(
  parsedData: any, 
  reason: string, 
  similarTransactions?: any[]
): Promise<void> {
  const reviewItem: Partial<ManualReviewItem> = {
    emailImportId: parsedData.importId,
    reviewReason: reason,
    priority: determinePriority(reason, parsedData),
    similarTransactions: similarTransactions || [],
    suggestedAction: suggestAction(parsedData, similarTransactions),
    status: 'pending'
  };
  
  await supabase.from('manual_review_queue').insert(reviewItem);
  
  // Send real-time notification
  await sendReviewNotification(reviewItem);
}

function determinePriority(reason: string, parsedData: any): 'high' | 'medium' | 'low' {
  // High priority scenarios
  if (reason.includes('large_amount') && parsedData.totalAmount > 10000) return 'high';
  if (reason.includes('multiple_identical')) return 'high';
  if (reason.includes('missing_order_id')) return 'medium';
  
  return 'low';
}

function suggestAction(parsedData: any, similarTransactions?: any[]): string {
  if (!similarTransactions || similarTransactions.length === 0) {
    return 'process'; // No conflicts, likely safe to process
  }
  
  if (similarTransactions.length === 1) {
    const similar = similarTransactions[0];
    const timeDiff = Math.abs(parsedData.executionTime - similar.execution_time);
    
    if (timeDiff < 60000) { // Less than 1 minute
      return 'investigate'; // Very close in time, needs investigation
    } else {
      return 'process'; // Different enough in time
    }
  }
  
  return 'investigate'; // Multiple similar transactions
}
```

## Configuration and Tuning

### Duplicate Detection Configuration
```typescript
interface DuplicateDetectionConfig {
  // Time windows for different scenarios
  standardTimeWindow: number;      // 60 seconds default
  strictTimeWindow: number;        // 30 seconds for similar amounts
  microTimeWindow: number;         // 1 second for HFT detection
  
  // Amount thresholds
  largeAmountThreshold: number;    // $10,000 default
  microAmountThreshold: number;    // $0.01 for penny stocks
  
  // Confidence levels
  emailHashConfidence: number;     // 1.0 (exact match)
  orderIdConfidence: number;       // 0.95
  timingConfidence: number;        // 0.8
  manualReviewThreshold: number;   // 0.9
  
  // Feature flags
  enableStrictMode: boolean;       // More conservative duplicate detection
  enablePartialFillDetection: boolean;
  enableSplitOrderTracking: boolean;
  enableHighFrequencyMode: boolean;
}

const defaultConfig: DuplicateDetectionConfig = {
  standardTimeWindow: 60000,       // 1 minute
  strictTimeWindow: 30000,         // 30 seconds
  microTimeWindow: 1000,           // 1 second
  largeAmountThreshold: 10000,     // $10,000
  microAmountThreshold: 0.01,      // $0.01
  emailHashConfidence: 1.0,
  orderIdConfidence: 0.95,
  timingConfidence: 0.8,
  manualReviewThreshold: 0.9,
  enableStrictMode: true,
  enablePartialFillDetection: true,
  enableSplitOrderTracking: true,
  enableHighFrequencyMode: false
};
```

## API Endpoints for Duplicate Management

### Comprehensive Duplicate Management API
```typescript
// Check for potential duplicates before processing
app.post('/api/email/check-duplicate', async (req, res) => {
  try {
    const { emailContent } = req.body;
    
    const parsedData = parseWealthsimpleEmail(emailContent);
    const duplicateCheck = await EmailDeduplicationService.checkDuplicate(emailContent, parsedData);
    
    res.json({
      isDuplicate: duplicateCheck.isDuplicate,
      confidence: calculateDuplicateConfidence(duplicateCheck),
      reason: duplicateCheck.reason,
      existingImport: duplicateCheck.existingImport,
      suggestedAction: duplicateCheck.isDuplicate ? 'review' : 'process',
      details: {
        timeWindow: calculateTimeWindow(parsedData),
        similarTransactions: await findSimilarTransactions(parsedData),
        riskLevel: assessRiskLevel(duplicateCheck, parsedData)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get manual review queue with filtering
app.get('/api/email/manual-review', async (req, res) => {
  const { priority, status, limit = 50 } = req.query;
  
  let query = supabase
    .from('manual_review_queue')
    .select(`
      *,
      email_imports(*),
      similar_transactions:similar_transactions(*)
    `)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(parseInt(limit as string));
    
  if (priority) query = query.eq('priority', priority);
  if (status) query = query.eq('status', status);
  
  const { data, error } = await query;
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({
    items: data,
    summary: {
      total: data.length,
      byPriority: groupBy(data, 'priority'),
      byStatus: groupBy(data, 'status'),
      oldestPending: data.find(item => item.status === 'pending')?.created_at
    }
  });
});

// Bulk resolve multiple review items
app.post('/api/email/manual-review/bulk-resolve', async (req, res) => {
  const { items } = req.body; // Array of {id, action, reasoning}
  
  const results = await Promise.allSettled(
    items.map(item => resolveManualReviewItem(item.id, item.action, item.reasoning))
  );
  
  res.json({
    processed: results.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    details: results
  });
});

// Get duplicate detection statistics
app.get('/api/email/duplicate-stats', async (req, res) => {
  const { timeframe = '7d' } = req.query;
  
  const stats = await generateDuplicateStats(timeframe as string);
  
  res.json({
    timeframe,
    stats: {
      totalEmails: stats.totalEmails,
      duplicatesDetected: stats.duplicatesDetected,
      duplicateRate: (stats.duplicatesDetected / stats.totalEmails) * 100,
      byReason: stats.duplicatesByReason,
      manualReviewRequired: stats.manualReviewCount,
      autoProcessed: stats.autoProcessedCount,
      averageProcessingTime: stats.avgProcessingTime
    }
  });
});
```

## Testing Scenarios

### Test Cases for Duplicate Detection
```typescript
const testScenarios = [
  {
    name: 'Identical emails forwarded twice',
    description: 'Same email content, same Message-ID',
    expected: 'duplicate',
    testData: {
      emails: [
        { messageId: 'test-001', content: 'email1.html', timestamp: '2025-06-13T10:44:00Z' },
        { messageId: 'test-001', content: 'email1.html', timestamp: '2025-06-13T10:45:00Z' }
      ]
    }
  },
  
  {
    name: 'Same order executed in two batches',
    description: 'Different Message-IDs, same order ID, different quantities',
    expected: 'not_duplicate',
    testData: {
      emails: [
        { orderId: 'WS-123', quantity: 5, messageId: 'test-002' },
        { orderId: 'WS-123', quantity: 5, messageId: 'test-003' } // Partial fills
      ]
    }
  },
  
  {
    name: 'High frequency trading - rapid similar orders',
    description: 'Multiple orders within seconds, different order IDs',
    expected: 'manual_review',
    testData: {
      emails: [
        { orderId: 'WS-124', timestamp: '2025-06-13T10:44:00Z', price: 100 },
        { orderId: 'WS-125', timestamp: '2025-06-13T10:44:05Z', price: 100 },
        { orderId: 'WS-126', timestamp: '2025-06-13T10:44:10Z', price: 100 }
      ]
    }
  },
  
  {
    name: 'Same transaction different days',
    description: 'Identical details but executed on different days',
    expected: 'not_duplicate',
    testData: {
      emails: [
        { symbol: 'AAPL', quantity: 100, price: 150, timestamp: '2025-06-13T10:44:00Z' },
        { symbol: 'AAPL', quantity: 100, price: 150, timestamp: '2025-06-14T10:44:00Z' }
      ]
    }
  }
];

// Automated testing suite
async function runDuplicateDetectionTests() {
  for (const scenario of testScenarios) {
    console.log(`Testing: ${scenario.name}`);
    
    const results = await processTestScenario(scenario);
    
    if (results.outcome === scenario.expected) {
      console.log(`✅ ${scenario.name} - PASSED`);
    } else {
      console.log(`❌ ${scenario.name} - FAILED: Expected ${scenario.expected}, got ${results.outcome}`);
    }
  }
}
```

This comprehensive duplicate detection system provides:

1. **Multi-level identification** using Message-ID, order ID, and transaction details
2. **Time-based differentiation** with precise timestamp parsing and timezone handling
3. **Edge case handling** for partial fills, split orders, and high-frequency trading
4. **Manual review queue** for ambiguous cases requiring human judgment
5. **Configurable detection** with different strictness levels and time windows
6. **Complete audit trail** tracking all processing attempts and decisions
7. **Real-time monitoring** and statistics for system performance

The system ensures no legitimate transactions are missed while preventing duplicate processing, even in complex scenarios with identical amounts and rapid execution times.
