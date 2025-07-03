# Investra AI - Comprehensive Troubleshooting Guide

## Table of Contents

1. [Email Processing Issues](#email-processing-issues)
2. [UI/Frontend Issues](#uifrontend-issues)
3. [Database Issues](#database-issues)
4. [Production Issues](#production-issues)
5. [Quick Fixes](#quick-fixes)
6. [Log Analysis](#log-analysis)
7. [Emergency Recovery](#emergency-recovery)
8. [Prevention Strategies](#prevention-strategies)

---

## Email Processing Issues

### Service Startup Problems

#### TypeScript Build Errors
**Symptoms:**
- `tsc` command fails with TypeScript errors
- Email puller won't build or start

**Common Errors & Solutions:**

1. **Database Client Access Error** (`clean-slate.ts:57`)
   ```typescript
   // BROKEN
   const { data: inboxEmails, error } = await (database as any).client
   
   // FIXED
   const { data: inboxEmails, error } = await database['client']
   ```

2. **ImapFlow Method Access Issues** (`imap-client.ts`)
   ```typescript
   // BROKEN
   await this.client.mailboxCreate(folderName);
   await this.client.messageMove(uidSet, folderName, { uid: true });
   
   // FIXED
   await (this.client as any).mailboxCreate(folderName);
   await (this.client as any).messageMove(uidSet, folderName, { uid: true });
   ```

3. **Attachment Type Compatibility** (`imap-client.ts:328`)
   ```typescript
   // BROKEN - returns type with optional properties
   attachments_info: email.attachments.map(att => ({
     filename: att.filename || 'unknown',
     contentType: att.contentType || 'application/octet-stream', 
     size: att.size || 0
   }))
   
   // FIXED - cast to required type
   attachments_info: email.attachments.map(att => ({
     filename: att.filename || 'unknown',
     contentType: att.contentType || 'application/octet-stream',
     size: att.size || 0
   })) as { filename: string; contentType: string; size: number; }[]
   ```

#### Service Not Starting
**Symptoms:**
- Email puller showing as "idle" for extended periods
- PM2 process showing as "stopped"
- Frontend showing `syncStatus: undefined`

**Diagnostic Steps:**
1. Check PM2 process status:
   ```bash
   pm2 status
   pm2 logs investra-email-puller-staging
   ```

2. Verify environment variables:
   ```bash
   cat /opt/investra/email-puller-staging/.env
   ```

3. Manual test run:
   ```bash
   cd email-puller
   RUN_ONCE=true npm start
   ```

### Sync Failures

#### Rate Limiting Issues
**Problem:** AI API rate limiting causing 429 errors
**Symptoms:**
```
429 (Too Many Requests)
AI parsing failed with confidence: 0
Using fallback regex parsing
```

**Solution:** Increase delays between AI requests
```typescript
// Before
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds

// After  
await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds
```

**Configuration:**
```env
AI_REQUEST_DELAY_MS=60000  # 1 minute between requests
MAX_EMAILS_PER_HOUR=50
```

#### Duplicate Detection Bug
**Problem:** Email-puller only checks `imap_inbox` for duplicates, not `imap_processed`

**Critical Code Issue:**
```typescript
// WRONG - Only checked inbox
async emailExists(messageId: string, userId: string): Promise<boolean> {
  const { data } = await this.client
    .from('imap_inbox')  // ← Only checked inbox!
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId);
  return (data?.length || 0) > 0;
}
```

**Solution:** Check both tables
```typescript
// CORRECT - Check both tables
async emailExists(messageId: string, userId: string): Promise<boolean> {
  // Check inbox
  const { data: inboxData } = await this.client
    .from('imap_inbox')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if ((inboxData?.length || 0) > 0) return true;

  // Check processed table  
  const { data: processedData } = await this.client
    .from('imap_processed')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId);

  return (processedData?.length || 0) > 0;
}
```

#### Email Archiving Bug (CRITICAL)
**Problem:** Email-puller deletes emails from `imap_inbox` instead of moving to `imap_processed`

**Wrong Approach:**
```typescript
// BUG: This just DELETES emails from database!
const removedCount = await database.removeProcessedEmails(emailMessageIds, imapConfig.user_id);
```

**Correct Solution:**
```typescript
// NEW - Proper move to processed table
async moveEmailsToProcessed(messageIds: string[], userId: string): Promise<number> {
  // 1. Fetch emails from inbox
  const { data: emailsToMove } = await this.client
    .from('imap_inbox')
    .select('*')
    .in('message_id', messageIds)
    .eq('user_id', userId);

  // 2. Transform for processed table
  const processedEmails = emailsToMove.map(email => ({
    user_id: email.user_id,
    original_inbox_id: email.id,
    message_id: email.message_id,
    // ... all other fields
    processing_result: 'auto_archived',
    processed_at: new Date().toISOString(),
    processing_notes: 'Automatically archived by email-puller after Gmail sync'
  }));

  // 3. Insert into processed table
  await this.client
    .from('imap_processed')
    .insert(processedEmails);

  // 4. Delete from inbox
  const { count } = await this.client
    .from('imap_inbox')
    .delete({ count: 'exact' })
    .in('message_id', messageIds)
    .eq('user_id', userId);

  return count || 0;
}
```

### Configuration Issues

#### Missing Environment Variables
**Symptoms:**
```
Error: supabaseUrl is required.
```

**Required Environment Variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SYNC_INTERVAL_MINUTES=30
MAX_EMAILS_PER_SYNC=50
ENABLE_SCHEDULER=true
ARCHIVE_AFTER_SYNC=true
PROCESSED_FOLDER_NAME=Investra/Processed
ENABLE_LOGGING=true
LOG_LEVEL=info
```

#### Gmail Authentication
**Common Issues:**
- Invalid app password
- Incorrect encryption/decryption
- Missing Gmail permissions

**Debug Steps:**
1. Test IMAP connection:
   ```bash
   curl -X POST localhost:3001/api/email/test-connection \
     -H "Content-Type: application/json" \
     -d '{"host":"imap.gmail.com","port":993,"user":"email@gmail.com","password":"app-password"}'
   ```

2. Verify Gmail app password is encrypted correctly
3. Check Gmail IMAP is enabled

---

## UI/Frontend Issues

### Modal Problems

#### Daily Details Modal Showing Empty Data
**Problem:** Modal shows 0 transactions despite having data for the selected date

**Root Cause:** Date filtering logic with timezone issues
```typescript
// PROBLEMATIC - timezone conversion issues
const dayTransactions = transactions.filter(transaction => {
  const transactionDate = new Date(transaction.transaction_date);
  return transactionDate.toDateString() === date.toDateString();
});
```

**Solution:** String-based date comparison
```typescript
// FIXED - robust string comparison
const dayTransactions = transactions.filter(transaction => {
  let transactionDateString: string;
  
  if (typeof transaction.transaction_date === 'string') {
    transactionDateString = transaction.transaction_date.includes('T') 
      ? transaction.transaction_date.split('T')[0]
      : transaction.transaction_date;
  } else {
    const transactionDate = new Date(transaction.transaction_date);
    transactionDateString = transactionDate.toISOString().split('T')[0];
  }
  
  return transactionDateString === dateString;
});
```

#### Manual Sync Button Disappearing
**Problem:** Button hidden behind complex conditional logic

**Wrong Approach:**
```typescript
// Before - Conditional
{(() => {
  const timeSinceSync = /* complex logic */;
  const isIdle30Min = timeSinceSync > 30 * 60 * 1000;
  return isIdle30Min && pullerStatus.syncStatus === 'idle';
})() && (
  <Button>Manual Sync</Button>
)}
```

**Solution:** Always visible for debugging
```typescript
// After - Always visible
<Button 
  variant="primary" 
  onClick={handleManualSync}
  disabled={manualSyncing}
>
  Manual Sync
</Button>
```

### State Management Issues

#### Portfolio State Not Persisting Across Routes
**Symptoms:**
- Portfolio shows in Dashboard but disappears in Transactions
- `Multiple GoTrueClient instances` warning

**Root Cause:** Multiple Supabase client instances or local state management

**Solution 1: Supabase Client Singleton**
```typescript
// In your supabase client file
let client: SupabaseClient | undefined

export const supabase = (() => {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
})()
```

**Solution 2: Portfolio Context Provider**
```typescript
export const PortfolioProvider = ({ children }) => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  
  useEffect(() => {
    if (user) {
      fetchPortfolio(user.id)
    }
  }, [user])
  
  const fetchPortfolio = async (userId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .single()
        
      if (error) throw error
      setPortfolio(data)
    } catch (error) {
      console.error('Portfolio fetch error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <PortfolioContext.Provider value={{ portfolio, loading, refetch: fetchPortfolio }}>
      {children}
    </PortfolioContext.Provider>
  )
}
```

#### Component Data Flow Issues
**Debugging Steps:**
1. Add debug logging at key points:
   ```typescript
   // In portfolio fetch function
   console.log('🏦 Starting portfolio fetch for user:', userId)
   console.log('🏦 Portfolio fetch result:', { data, error })
   
   // In Transactions component
   console.log('💰 Transactions: Current portfolio state:', portfolio)
   ```

2. Verify authentication state:
   ```typescript
   const { data: { user }, error } = await supabase.auth.getUser()
   console.log('Current user:', user?.id, 'Error:', error)
   ```

### Browser/Performance Issues

#### Application Not Loading
1. **Clear Browser Storage**
   - Clear localStorage and sessionStorage
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

2. **Check Console Errors**
   - Open DevTools → Console
   - Look for red errors
   - Check Network tab for failed requests

3. **Verify Environment Variables**
   - Check NEXT_PUBLIC_SUPABASE_URL
   - Verify NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## Database Issues

### Connection Problems

#### Supabase Authentication Issues
**Symptoms:**
- 401/403 errors in Network tab
- Unable to fetch data despite correct queries

**Debug Steps:**
1. Test connection:
   ```typescript
   const { data, error } = await supabase.from('portfolios').select('*')
   console.log('Portfolio test:', { data, error })
   ```

2. Check user authentication:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)
   ```

#### Row Level Security (RLS) Issues
**Common Problem:** RLS policies blocking legitimate access

**Check Policies:**
```sql
-- Verify portfolio policies
SELECT * FROM portfolios; -- Should show your portfolio

-- Check if RLS is properly configured
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Data Inconsistencies

#### Transaction Creation Failures
**Debug Checklist:**
1. Verify portfolio_id is present:
   ```typescript
   if (!transaction.portfolio_id) {
     console.error('❌ No portfolio_id provided')
     return
   }
   ```

2. Test transaction creation:
   ```typescript
   const testTransaction = {
     portfolio_id: 'your-portfolio-id',
     symbol: 'AAPL',
     quantity: 10,
     price: 150.00,
     type: 'buy'
   }
   
   const { data, error } = await supabase
     .from('transactions')
     .insert(testTransaction)
     .select()
   
   console.log('Transaction test:', { data, error })
   ```

#### Missing Data in UI
**Problem:** Database has data but UI shows empty

**Debug Flow:**
1. Check database directly:
   ```sql
   SELECT count(*) FROM imap_inbox WHERE user_id = 'your-user-id';
   SELECT count(*) FROM imap_processed WHERE user_id = 'your-user-id';
   ```

2. Verify API responses:
   ```typescript
   // Enable query logging
   const { data, error } = await supabase
     .from('portfolios')
     .select('*')
     .eq('user_id', userId)
   console.log('API Response:', { data, error })
   ```

3. Check component state:
   ```typescript
   // In React component
   useEffect(() => {
     console.log('Component state updated:', { portfolio, transactions })
   }, [portfolio, transactions])
   ```

### Migration Issues

#### Schema Updates
**Best Practices:**
1. Always backup before migrations
2. Test migrations on staging first
3. Use transactions for complex updates
4. Verify data integrity after migration

**Common Migration Pattern:**
```sql
BEGIN;
-- Your migration here
UPDATE table_name SET column = value WHERE condition;
-- Verify results
SELECT count(*) FROM table_name WHERE column = value;
COMMIT; -- or ROLLBACK if issues
```

---

## Production Issues

### Deployment Failures

#### Email Puller Deployment Issues
**Common Problem:** Over-engineering working deployments

**Wrong Approach:**
```yaml
# Complex deployment that breaks things
sudo cp -r dist/* /opt/investra/email-puller-staging/
sudo npm ci --only=production  # Can conflict with bundled deps
```

**Correct Simple Approach:**
```yaml
# Simple deployment that works
sudo mkdir -p /opt/investra/email-puller-staging
sudo cp dist/imap-puller.js /opt/investra/email-puller-staging/
sudo cp package.json /opt/investra/email-puller-staging/

# Create environment file
sudo bash -c "echo 'SUPABASE_URL=${{ secrets.SUPABASE_URL }}' > .env"
sudo bash -c "echo 'SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}' >> .env"
# ... other env vars

# Start with environment file
sudo pm2 start imap-puller.js --name investra-email-puller-staging --env-file .env
```

#### Missing Dependencies
**Symptoms:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/opt/investra/email-puller-staging/config.js'
```

**Solution:** The built file should be self-contained. If missing dependencies:
1. Check build process includes all required modules
2. Avoid installing additional npm packages on production
3. Ensure TypeScript build creates proper bundle

### Environment Variables

#### Production Configuration
**Required Environment Variables:**
```bash
# Core Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=your-key

# Email Puller Settings
SYNC_INTERVAL_MINUTES=30
MAX_EMAILS_PER_SYNC=50
ARCHIVE_AFTER_SYNC=true
PROCESSED_FOLDER_NAME=Investra/Processed

# AI Processing
AI_REQUEST_DELAY_MS=60000  # Conservative for rate limiting
MAX_EMAILS_PER_HOUR=50

# Logging
ENABLE_LOGGING=true
LOG_LEVEL=info
```

#### Secrets Management
**Best Practices:**
1. Use GitHub Secrets for sensitive data
2. Never commit `.env` files
3. Rotate keys periodically
4. Use different keys for staging/production

### Service Management

#### PM2 Process Issues
**Common Commands:**
```bash
# Check status
pm2 status
pm2 logs investra-email-puller-staging

# Restart service
pm2 restart investra-email-puller-staging

# Stop service
pm2 stop investra-email-puller-staging

# Start with env file
pm2 start imap-puller.js --name service-name --env-file .env

# Save PM2 config
pm2 save
pm2 startup
```

**Debug Service Issues:**
1. Check if process is running: `pm2 status`
2. Check logs: `pm2 logs service-name`
3. Test manual run: `node imap-puller.js`
4. Verify environment: `pm2 env service-name`

---

## Quick Fixes

### Emergency Portfolio State Fix
**When portfolio disappears in Transactions component:**

```typescript
const TransactionsPage = () => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  
  useEffect(() => {
    // Emergency: Fetch portfolio directly in Transactions
    const fetchPortfolio = async () => {
      if (!user) return
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (data) setPortfolio(data)
      setLoading(false)
    }
    
    fetchPortfolio()
  }, [user])
  
  if (loading) return <div>Loading...</div>
  if (!portfolio) return <div>No portfolio found</div>
  
  // Rest of component
}
```

### Emergency Email Sync Fix
**When emails stop syncing:**

1. **Disable archiving temporarily:**
   ```bash
   ARCHIVE_AFTER_SYNC=false RUN_ONCE=true npm start
   ```

2. **Manual sync without processing:**
   ```bash
   cd email-puller
   RUN_ONCE=true npm start
   ```

3. **Clear stuck sync status:**
   ```sql
   UPDATE imap_configurations 
   SET sync_status = 'idle', last_error = NULL 
   WHERE user_id = 'your-user-id';
   ```

### Emergency Database Reset
**When data gets corrupted:**

```sql
-- Backup first!
BEGIN;

-- Clear processed emails back to inbox
INSERT INTO imap_inbox (
  SELECT user_id, message_id, subject, sender, body_text, 
         transaction_date, created_at, attachments_info
  FROM imap_processed 
  WHERE user_id = 'your-user-id'
);

-- Clear processed table
DELETE FROM imap_processed WHERE user_id = 'your-user-id';

COMMIT;
```

### Emergency UI Reset
**When UI shows wrong state:**

```typescript
// Clear all React state
localStorage.clear()
sessionStorage.clear()

// Force re-authentication
await supabase.auth.signOut()
await supabase.auth.signInWithPassword({ email, password })

// Hard refresh
window.location.reload(true)
```

---

## Log Analysis

### Email Puller Logs

#### Expected Log Patterns
**Successful Sync:**
```
INFO: Email puller started, syncing every 30 minutes
INFO: Starting sync for user: user-id
INFO: Fetched 15 emails from IMAP
INFO: Inserted 10 new emails into inbox
INFO: Moved 10 emails to processed folder
INFO: Sync completed successfully
```

**Rate Limiting Issue:**
```
ERROR: 429 (Too Many Requests)
WARN: AI parsing failed with confidence: 0
WARN: Using fallback regex parsing
```

**Database Issues:**
```
ERROR: supabaseUrl is required
ERROR: Unable to connect to database
ERROR: RLS policy violation
```

#### Debug Log Analysis Commands
```bash
# Filter email puller logs
npm start 2>&1 | grep -i "error\|fail\|insert\|removed"

# Check specific patterns
tail -f logs/email-puller.log | grep "SYNC"
tail -f logs/email-puller.log | grep "ERROR"

# Monitor database operations
tail -f logs/email-puller.log | grep -E "(INSERT|UPDATE|DELETE)"
```

### Frontend Debug Logs

#### Daily P/L Service Debugging
**Expected Console Patterns:**
```javascript
🔍 DAILY_PL_DEBUG: getMonthlyPLData called: {year: 2025, month: 3, portfolioId: "uuid"}
🔍 DAILY_PL_DEBUG: Fetched data analysis: {totalTransactions: 150, april28Transactions: 3}
🔍 DAILY_PL_DEBUG: April 28, 2025 filtering results: {filteredTransactions: 3, hasTransactions: true}
🔍 CALENDAR_DEBUG: Day clicked: {date: "2025-04-28", transactionCount: 3}
```

**Common Issue Patterns:**
```javascript
// No data found
{april28Transactions: 0, filteredTransactions: 0}

// Date mismatch
{originalDate: "2025-04-28T00:00:00+00:00", extractedDate: "2025-04-27", matches: false}

// Service not called
// No "Daily P/L service called" logs appear
```

#### Component State Debugging
**Add these logs to track data flow:**
```typescript
// In portfolio provider
console.log('🏦 Portfolio Provider: State updated', { portfolio, loading })

// In transactions component  
console.log('💰 Transactions: Mounted with portfolio', portfolio)

// In daily modal
console.log('📅 Daily Modal: Opened with data', dailyData)
```

### Database Query Logs

#### Enable Supabase Logging
```typescript
// Add to supabase client config
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'X-Client-Info': 'investra-ai' },
  },
})

// Log all queries in development
if (process.env.NODE_ENV === 'development') {
  const originalFrom = supabase.from
  supabase.from = function(table) {
    console.log('🗄️ Supabase query:', table)
    return originalFrom.call(this, table)
  }
}
```

### System Monitoring

#### Database Health Check
```sql
-- Monitor email flow
SELECT 
  'inbox' as table_name, 
  count(*) as email_count,
  max(created_at) as latest_email
FROM imap_inbox
UNION ALL
SELECT 
  'processed' as table_name,
  count(*) as email_count, 
  max(processed_at) as latest_email
FROM imap_processed;

-- Check sync status
SELECT 
  user_id,
  sync_status,
  last_sync,
  last_error
FROM imap_configurations;
```

#### Performance Monitoring
```typescript
// Add performance logging
const startTime = performance.now()
const result = await expensiveOperation()
const endTime = performance.now()
console.log(`Operation took ${endTime - startTime} milliseconds`)

// Monitor API response times
const monitorAPI = async (operation) => {
  const start = Date.now()
  try {
    const result = await operation()
    console.log(`✅ API call succeeded in ${Date.now() - start}ms`)
    return result
  } catch (error) {
    console.error(`❌ API call failed after ${Date.now() - start}ms:`, error)
    throw error
  }
}
```

---

## Emergency Recovery

### Email Processing Recovery

#### When Emails Go Missing
1. **Check database state**:
   ```sql
   SELECT count(*) FROM imap_inbox WHERE user_id = 'user-id';
   SELECT count(*) FROM imap_processed WHERE user_id = 'user-id';
   ```

2. **Disable archiving**:
   ```bash
   ARCHIVE_AFTER_SYNC=false RUN_ONCE=true npm start
   ```

3. **Run direct import**:
   ```bash
   cd email-puller
   RUN_ONCE=true npm start
   ```

4. **Verify UI refresh**:
   - Clear browser cache
   - Hard refresh
   - Check if emails appear

5. **Re-enable archiving**:
   ```bash
   ARCHIVE_AFTER_SYNC=true
   ```

#### Service Recovery Steps
```bash
# 1. Stop current process
pm2 stop investra-email-puller-staging

# 2. Check for stuck processes
ps aux | grep imap-puller
kill -9 <pid> # if needed

# 3. Clear PM2 logs
pm2 flush

# 4. Start fresh
cd /opt/investra/email-puller-staging
pm2 start imap-puller.js --name investra-email-puller-staging --env-file .env

# 5. Monitor startup
pm2 logs investra-email-puller-staging --lines 100
```

### Database Recovery

#### Transaction Recovery
```sql
-- Backup current state
CREATE TABLE transactions_backup AS SELECT * FROM transactions;

-- Restore from backup if needed
INSERT INTO transactions SELECT * FROM transactions_backup 
WHERE id NOT IN (SELECT id FROM transactions);
```

#### Email Data Recovery
```sql
-- Move emails back from processed to inbox
BEGIN;

INSERT INTO imap_inbox (
  user_id, message_id, subject, sender, body_text, 
  transaction_date, created_at, attachments_info
)
SELECT 
  user_id, message_id, subject, sender, body_text,
  transaction_date, created_at, attachments_info
FROM imap_processed
WHERE user_id = 'user-id' 
  AND processed_at > '2025-06-27'  -- Recent only
  AND id NOT IN (SELECT original_inbox_id FROM imap_inbox WHERE original_inbox_id IS NOT NULL);

-- Clean up processed table
DELETE FROM imap_processed 
WHERE user_id = 'user-id' 
  AND processed_at > '2025-06-27';

COMMIT;
```

### Application Recovery

#### Frontend Recovery
```typescript
// Complete application reset
const emergencyReset = async () => {
  // 1. Clear all storage
  localStorage.clear()
  sessionStorage.clear()
  
  // 2. Clear service worker cache
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
  }
  
  // 3. Sign out and back in
  await supabase.auth.signOut()
  
  // 4. Force reload
  window.location.reload(true)
}
```

#### State Recovery
```typescript
// Portfolio state recovery
const recoverPortfolioState = async (userId) => {
  try {
    // Force fresh fetch
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    
    // Update all contexts/stores
    setPortfolio(data)
    localStorage.setItem('portfolio', JSON.stringify(data))
    
    console.log('✅ Portfolio state recovered:', data)
    return data
  } catch (error) {
    console.error('❌ Portfolio recovery failed:', error)
    return null
  }
}
```

---

## Prevention Strategies

### Code Quality

#### Integration Tests
```typescript
// Test full email flow
describe('Email Processing Integration', () => {
  it('should import email and make it available in UI', async () => {
    await emailPuller.syncOnce()
    const uiEmails = await emailService.getEmails()
    expect(uiEmails.length).toBeGreaterThan(0)
  })
  
  it('should move processed emails to processed table', async () => {
    const beforeInbox = await countEmailsInInbox()
    const beforeProcessed = await countEmailsInProcessed()
    
    await processEmails()
    
    const afterInbox = await countEmailsInInbox()
    const afterProcessed = await countEmailsInProcessed()
    
    expect(afterInbox).toBe(beforeInbox - processedCount)
    expect(afterProcessed).toBe(beforeProcessed + processedCount)
  })
})
```

#### Database State Validation
```typescript
// Add to critical operations
const validateDatabaseState = async () => {
  const inboxCount = await supabase.from('imap_inbox').select('*', { count: 'exact' })
  const processedCount = await supabase.from('imap_processed').select('*', { count: 'exact' })
  
  console.log('📊 Database State:', {
    inbox: inboxCount.count,
    processed: processedCount.count,
    total: inboxCount.count + processedCount.count
  })
  
  return { inbox: inboxCount.count, processed: processedCount.count }
}
```

### Monitoring

#### Health Checks
```typescript
// Application health endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database
    const dbHealth = await supabase.from('portfolios').select('id').limit(1)
    
    // Check email service
    const emailHealth = await checkEmailPullerStatus()
    
    // Check AI service
    const aiHealth = await testAIConnection()
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.error ? 'unhealthy' : 'healthy',
        emailPuller: emailHealth.status,
        ai: aiHealth.status
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    })
  }
})
```

#### Alerting
```typescript
// Monitor sync status
const monitorSyncStatus = async () => {
  const { data: configs } = await supabase
    .from('imap_configurations')
    .select('*')
    .eq('is_active', true)
  
  for (const config of configs) {
    const timeSinceSync = Date.now() - new Date(config.last_sync).getTime()
    const maxInterval = (config.sync_interval_minutes || 30) * 60 * 1000 * 2 // 2x expected
    
    if (timeSinceSync > maxInterval) {
      await sendAlert({
        type: 'sync_delayed',
        user: config.user_id,
        lastSync: config.last_sync,
        expectedInterval: config.sync_interval_minutes
      })
    }
  }
}
```

### Deployment

#### Staging Tests
```yaml
# Add to deployment workflow
- name: Run Integration Tests
  run: |
    npm run test:integration
    npm run test:e2e
    
- name: Validate Deployment
  run: |
    curl -f http://localhost:3001/health
    sleep 10  # Wait for services to start
    curl -f http://localhost:3001/api/status
```

#### Rollback Strategy
```yaml
# Keep last working version
- name: Backup Current Version
  run: |
    sudo cp -r /opt/investra/email-puller-staging /opt/investra/email-puller-backup-$(date +%Y%m%d_%H%M%S)
    
- name: Deploy New Version
  run: |
    # Deploy new version
    
- name: Validate Deployment
  run: |
    # Test new version
    if ! curl -f http://localhost:3001/health; then
      echo "Deployment failed, rolling back"
      sudo rm -rf /opt/investra/email-puller-staging
      sudo mv /opt/investra/email-puller-backup-* /opt/investra/email-puller-staging
      pm2 restart investra-email-puller-staging
      exit 1
    fi
```

#### Configuration Management
```typescript
// Environment validation
const validateEnvironment = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SYNC_INTERVAL_MINUTES',
    'MAX_EMAILS_PER_SYNC'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  // Validate values
  const syncInterval = parseInt(process.env.SYNC_INTERVAL_MINUTES)
  if (isNaN(syncInterval) || syncInterval < 1) {
    throw new Error('SYNC_INTERVAL_MINUTES must be a positive integer')
  }
  
  console.log('✅ Environment validation passed')
}

// Call during startup
validateEnvironment()
```

---

This comprehensive troubleshooting guide consolidates all the critical debugging information from your 8 source files into a structured, searchable format. Use the table of contents to quickly navigate to specific issues, and follow the step-by-step instructions for diagnosis and resolution.

**Key Files Referenced:**
- `/Users/eduardo/investra-ai/docs/EMAIL_PULLER_DEBUGGING_GUIDE.md`
- `/Users/eduardo/investra-ai/docs/debug/APRIL_28_DEBUG_GUIDE.md`
- `/Users/eduardo/investra-ai/docs/debug/DEBUG_LOG_ANALYSIS.md`
- `/Users/eduardo/investra-ai/docs/debug/PORTFOLIO_ISSUES_DEBUG.md`
- `/Users/eduardo/investra-ai/docs/debug/PORTFOLIO_QUICK_FIX.md`
- `/Users/eduardo/investra-ai/docs/TECHNICAL_NOTES.md`
- `/Users/eduardo/investra-ai/docs/UAT_EXECUTION_REPORT.md`
- `/Users/eduardo/investra-ai/docs/reports/DAILY_MODAL_FIX_REPORT.md`

For urgent issues, start with the [Quick Fixes](#quick-fixes) section. For systematic debugging, follow the relevant section based on your symptoms.