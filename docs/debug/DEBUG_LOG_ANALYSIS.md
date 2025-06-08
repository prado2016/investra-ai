# Debug Log Analysis Guide for April 28, 2025 Issue

## Expected Debug Log Patterns

Based on the enhanced logging we implemented, here are the key patterns to look for in your debug logs:

### 1. Service Call Initiation
```json
{
  "level": "info",
  "message": "Daily P/L service called for monthly data",
  "data": {
    "year": 2025,
    "month": 3,
    "portfolioId": "uuid-here"
  },
  "source": "DailyPL"
}
```

### 2. Data Fetching Results
```json
{
  "level": "info", 
  "message": "Fetched portfolio data for analysis",
  "data": {
    "totalTransactions": 150,
    "totalPositions": 45,
    "april28Transactions": 3,
    "sampleTransactions": [...]
  },
  "source": "DailyPL"
}
```

### 3. Date Filtering Process
```json
{
  "level": "debug",
  "message": "Transaction date filtering for April 28, 2025",
  "data": {
    "transactionId": "uuid",
    "originalDate": "2025-04-28T10:30:00.000Z",
    "extractedDate": "2025-04-28",
    "targetDate": "2025-04-28", 
    "matches": true,
    "symbol": "AAPL"
  },
  "source": "DailyPL"
}
```

### 4. Final Filtering Results
```json
{
  "level": "info",
  "message": "Transaction filtering results for April 28, 2025",
  "data": {
    "totalTransactions": 150,
    "filteredTransactions": 3,
    "filteredTransactionIds": ["uuid1", "uuid2", "uuid3"],
    "hasTransactions": true
  },
  "source": "DailyPL"
}
```

### 5. Component-Level Interaction
```json
{
  "level": "info",
  "message": "Day clicked",
  "data": {
    "date": "2025-04-28",
    "transactionCount": 3,
    "totalPL": 125.50,
    "hasTransactions": true
  }
}
```

## Common Issue Patterns to Identify

### Issue #1: No Transactions Found
If you see:
```json
{
  "april28Transactions": 0,
  "filteredTransactions": 0
}
```
**Root Cause**: Transactions don't exist in database for that date
**Solution**: Verify data exists or check date format in database

### Issue #2: Date Format Mismatch  
If you see mismatched dates:
```json
{
  "originalDate": "2025-04-28T00:00:00+00:00",
  "extractedDate": "2025-04-27",  // Off by one day
  "matches": false
}
```
**Root Cause**: Timezone conversion issue
**Solution**: Fix date parsing to handle timezone correctly

### Issue #3: Correct Data But Empty Modal
If filtering shows transactions but modal is empty:
```json
{
  "filteredTransactions": 3,
  "hasTransactions": true
}
```
But modal shows 0 transactions
**Root Cause**: Component state or prop passing issue
**Solution**: Check React state management

### Issue #4: Service Never Called
If no "Daily P/L service called" logs appear:
**Root Cause**: Calendar not triggering service properly
**Solution**: Check calendar navigation and portfolio selection

## Quick Diagnostic Questions

1. **Are transactions being fetched?**
   - Look for "totalTransactions" > 0 in logs

2. **Are April 28 transactions found?**
   - Look for "april28Transactions" > 0

3. **Is date filtering working?**
   - Look for "matches": true in filtering logs

4. **Is component receiving data?**
   - Look for calendar and summary debug logs

5. **Is modal getting correct data?**
   - Check final component interaction logs

## Next Steps Based on Analysis

### If No Service Calls Found:
- Check portfolio selection
- Verify calendar navigation works
- Check network connectivity

### If Service Calls But No Data:
- Verify database has April 28, 2025 transactions
- Check transaction date formats
- Verify portfolio ID is correct

### If Data Found But Filtering Fails:
- Check date parsing logic
- Verify timezone handling
- Fix filtering conditions

### If Filtering Works But Modal Empty:
- Check React state updates
- Verify prop passing between components
- Check modal rendering logic

## Example Debug Session Commands

To help analyze your specific logs, please share:

1. **The "april28Transactions" count** from the fetching logs
2. **Any "matches": false** entries in filtering logs  
3. **The final result** for April 28, 2025
4. **Any error messages** in the logs

This will help pinpoint exactly where the data flow breaks down.
