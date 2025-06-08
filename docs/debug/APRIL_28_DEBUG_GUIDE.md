# April 28, 2025 Daily Modal Debug Guide

## Current Issue
The daily details modal shows empty data (0 transactions, $0.00 for all metrics) when clicking on April 28, 2025, despite having 3 transactions on that date.

## Debug Setup Complete ✅
Enhanced logging has been added throughout the application to trace the data flow:

### 1. Daily P/L Service Logging
- `dailyPLService.ts` now includes both debug panel logs and browser console logs
- Tagged with 'DailyPL' for easy filtering in debug panel
- Tracks transaction filtering, date parsing, and final results

### 2. Component Level Logging  
- `MonthlyCalendar.tsx` - logs day click events and data received
- `Summary.tsx` - logs modal opening and data passing

### 3. Debug Panel Integration
- Real-time debug logs available in bottom-right debug panel
- Browser console logs as backup debugging method

## Live Debugging Instructions

### Step 1: Start Application
The development server is already running on http://localhost:5183/

### Step 2: Open Debug Tools
1. **Browser Console**: Open Chrome DevTools (F12) → Console tab
2. **Debug Panel**: Look for orange bug icon in bottom-right corner, click to open

### Step 3: Navigate to Calendar
1. Go to Summary page (should be accessible from navigation)
2. Ensure a portfolio is selected in the dropdown

### Step 4: Test April 28, 2025
1. Navigate to April 2025 using calendar navigation arrows
2. Click on day 28 (should show some transactions based on previous data)
3. Monitor debug logs in real-time

### Step 5: Analyze Debug Output
Look for these key debug patterns:

#### Expected Console Logs:
```
🔍 DAILY_PL_DEBUG: getMonthlyPLData called: {...}
🔍 DAILY_PL_DEBUG: Fetched data analysis: {...}
🔍 DAILY_PL_DEBUG: April 28, 2025 filtering results: {...}
🔍 DAILY_PL_DEBUG: Final result for April 28, 2025: {...}
🔍 CALENDAR_DEBUG: Day clicked: {...}
🔍 SUMMARY_DEBUG: Day click received in Summary page: {...}
```

#### Debug Panel Logs:
- Look for 'DailyPL' tagged entries
- Check transaction counts and filtering results

## What to Look For

### 1. Data Fetching
- How many total transactions are fetched?
- Do any transactions have dates matching '2025-04-28'?

### 2. Date Filtering
- Are transaction dates being parsed correctly?
- Is the filtering logic working for April 28, 2025?

### 3. Final Results
- What does the final DailyPLData object look like for April 28?
- Does it have the correct transaction count and hasTransactions flag?

### 4. Component Data Flow
- Does the calendar receive the correct day data?
- Is the modal getting the right data when opened?

## Potential Issues to Check

1. **Date Format Mismatch**: PostgreSQL DATE vs JavaScript Date parsing
2. **Timezone Issues**: UTC vs local timezone differences  
3. **Data Type Issues**: String vs Date object handling
4. **Filtering Logic**: The transaction filtering conditions
5. **State Management**: React state updates and data passing

## Next Steps Based on Findings

Based on the debug output, we can identify:
- If the issue is in data fetching (no April 28 transactions found)
- If the issue is in date filtering (transactions exist but not filtered correctly)
- If the issue is in component data flow (data filtered correctly but not passed to modal)

This comprehensive logging will help us pinpoint exactly where the data flow breaks down for April 28, 2025.
