# Portfolio Issues - Quick Action Plan

## Immediate Actions (Do These First)

### 1. Fix Supabase Client Singleton (5 mins)
Look for your Supabase client initialization file (usually `lib/supabase.ts` or similar) and ensure you're using a singleton pattern to prevent multiple instances.

### 2. Add Debug Logging (10 mins)
Add these console logs to track the issue:

```typescript
// In your portfolio fetch function
console.log('🔍 DEBUG: Fetching portfolio for user:', userId)
console.log('🔍 DEBUG: Using supabase instance:', supabase)

// In your Transactions component
console.log('🔍 DEBUG: Transactions mounted, portfolio state:', portfolio)

// In your transaction creation function
console.log('🔍 DEBUG: Creating transaction with portfolio_id:', portfolioId)
```

### 3. Check Browser Console (2 mins)
1. Open Chrome DevTools
2. Go to Application tab → Storage → Clear site data
3. Refresh the page
4. Navigate Dashboard → Transactions
5. Check for any red errors in console

### 4. Verify Portfolio State Management (15 mins)
Check if you're using:
- React Context for portfolio state
- Or a state management library (Redux, Zustand, etc.)
- Ensure the state is shared between Dashboard and Transactions

### 5. Database Quick Check (5 mins)
Run these queries in Supabase SQL editor:

```sql
-- Check if user has a portfolio
SELECT * FROM portfolios WHERE user_id = 'YOUR_USER_ID';

-- Check RLS is not blocking
SELECT * FROM portfolios; -- Should show your portfolio

-- Test transaction insert
INSERT INTO transactions (portfolio_id, symbol, quantity, price, type)
VALUES ('YOUR_PORTFOLIO_ID', 'TEST', 1, 100, 'buy');
```

## Most Likely Culprits

Based on the symptoms, the issue is likely one of these:

### 1. **State Not Persisting Across Routes** (Most Likely)
- Portfolio state is local to Dashboard component
- When navigating to Transactions, state is lost
- **Fix**: Use a global state solution (Context, Zustand, etc.)

### 2. **Multiple Supabase Clients** (Very Likely)
- The warning about multiple GoTrueClient instances
- Different components creating their own clients
- **Fix**: Ensure single Supabase instance across app

### 3. **Race Condition** (Possible)
- Portfolio fetch not completing before navigation
- Transactions component mounting before data is ready
- **Fix**: Add proper loading states and await data

## Emergency Fix (If You Need It Working NOW)

Add this to your Transactions component as a temporary fix:

```typescript
const TransactionsPage = () => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  
  useEffect(() => {
    // Fetch portfolio directly in Transactions
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
  
  // Rest of your component
}
```

This is not ideal (duplicates fetching logic) but will get you working while you implement a proper fix.

## Report Back

After trying these steps, let me know:
1. Which warning/errors appear in console
2. If portfolio appears in Dashboard but not Transactions
3. Any errors when trying to add a transaction
4. Whether the emergency fix works

This will help narrow down the exact issue.
