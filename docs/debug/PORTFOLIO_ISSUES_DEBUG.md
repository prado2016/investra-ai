# Portfolio Issues Debug Guide

## Problem Summary
- Portfolio data is inconsistent across different views
- Dashboard shows portfolio correctly but Transactions view shows "no portfolio" message
- Transactions cannot be added successfully
- Multiple GoTrueClient instances warning

## Symptoms Observed
1. **Navigation Issue**: When switching from Dashboard to Transactions, portfolio disappears
2. **Transaction Creation**: New transactions fail to save
3. **Console Warning**: Multiple GoTrueClient instances detected
4. **Data Fetching**: Portfolio fetch appears to start but may not complete properly

## Root Cause Analysis

### 1. Multiple GoTrueClient Instances
The warning about multiple GoTrueClient instances suggests duplicate Supabase client initialization:
```
Multiple GoTrueClient instances detected in the same browser context.
```

**Potential Causes:**
- Multiple imports of Supabase client configuration
- Hot module reloading creating duplicate instances
- Component re-rendering causing re-initialization
- Different parts of the app creating their own clients

### 2. State Management Issues
The portfolio state might not be properly synchronized across components:
- Dashboard component has its own portfolio fetch
- Transactions component might be fetching independently
- State updates not propagating correctly

### 3. Race Conditions
The logs show rapid succession of events that might cause race conditions:
- Auth state changes
- Realtime disconnection/reconnection
- Portfolio fetching

## Debugging Steps

### Step 1: Verify Supabase Client Singleton
Check that you have a single Supabase client instance:

```typescript
// Look for these patterns in your codebase:
// ❌ Bad: Multiple createClient calls
const supabase1 = createClient(url, key)
const supabase2 = createClient(url, key)

// ✅ Good: Single instance pattern
let supabaseClient: SupabaseClient | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(url, key)
  }
  return supabaseClient
}
```

### Step 2: Check Portfolio Context/Store
Verify portfolio state management:

```typescript
// Check if portfolio state is properly shared
// Look for these patterns:

// Context Provider wrapping
<PortfolioProvider>
  <Dashboard />
  <Transactions />
</PortfolioProvider>

// Or Redux/Zustand store
const usePortfolioStore = create((set) => ({
  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),
  // Ensure single source of truth
}))
```

### Step 3: Debug Data Flow
Add console logs at key points:

```typescript
// In portfolio fetch function
console.log('🏦 Starting portfolio fetch for user:', userId)
const { data, error } = await supabase
  .from('portfolios')
  .select('*')
  .eq('user_id', userId)
  .single()

console.log('🏦 Portfolio fetch result:', { data, error })

// In Transactions component
console.log('💰 Transactions: Current portfolio state:', portfolio)
```

### Step 4: Check Database Queries
Verify the actual database queries:

```typescript
// Enable Supabase query logging
const { data, error } = await supabase
  .from('portfolios')
  .select('*')
  .eq('user_id', userId)
  .single()
  
// Check for RLS policies
// Ensure user has access to their own portfolio
```

### Step 5: Transaction Creation Debug
Debug why transactions aren't being added:

```typescript
// Check transaction creation
const createTransaction = async (transaction) => {
  console.log('📝 Creating transaction:', transaction)
  
  // Verify portfolio_id is present
  if (!transaction.portfolio_id) {
    console.error('❌ No portfolio_id provided')
    return
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    
  console.log('📝 Transaction result:', { data, error })
}
```

## Quick Fixes to Try

### 1. Force Single Supabase Instance
```typescript
// In your supabase client file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern
let client: SupabaseClient | undefined

export const supabase = (() => {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
})()
```

### 2. Ensure Portfolio Context Persistence
```typescript
// In your PortfolioProvider
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

### 3. Fix Transaction Component
```typescript
// In Transactions component
const Transactions = () => {
  const { portfolio, loading } = usePortfolio()
  
  if (loading) return <div>Loading portfolio...</div>
  
  if (!portfolio) {
    return <div>No portfolio found. Please create one first.</div>
  }
  
  // Rest of component
}
```

## Database Schema Verification

Ensure your database schema and RLS policies are correct:

```sql
-- Check portfolios table
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policy for portfolios
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Check transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policy for transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolios
      WHERE portfolios.id = transactions.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );
```

## Testing Checklist

1. **Test Supabase Connection**
   ```typescript
   // In browser console
   const { data, error } = await supabase.from('portfolios').select('*')
   console.log('Portfolio test:', { data, error })
   ```

2. **Test Auth State**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)
   ```

3. **Test Transaction Creation**
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

## Common Solutions

1. **Clear Browser Storage**
   - Clear localStorage and sessionStorage
   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

2. **Check Network Tab**
   - Look for failed Supabase requests
   - Check for 401/403 authorization errors

3. **Verify Environment Variables**
   - Ensure NEXT_PUBLIC_SUPABASE_URL is correct
   - Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is correct

## Next Steps

If the issue persists after trying these solutions:
1. Check the Supabase dashboard for any database errors
2. Review the RLS policies in detail
3. Add more detailed logging to track the data flow
4. Consider implementing a state management library (Zustand/Redux) if not already using one
5. Check for any race conditions in the component lifecycle

Last updated: June 2025
