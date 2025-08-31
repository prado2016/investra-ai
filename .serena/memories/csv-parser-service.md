# CSV Parser Service Implementation

The CSV parser service has been designed to convert broker CSV files to the application's transaction format. Here are the key details:

## File Structure
- New file: `src/services/csvParserService.ts`
- Handles broker CSV format conversion to JSON

## Key Features
1. **Transaction Type Mapping**: Maps CSV types (BUYTOOPEN, SELLTOOPEN, etc.) to app types (buy_to_open, sell_to_open, etc.)
2. **Symbol Extraction**: Parses transaction descriptions to extract stock/option symbols
3. **Portfolio Mapping**: Maps CSV filenames to portfolio names (RRSP→RSP, etc.)
4. **Asset Type Detection**: Identifies stocks vs options from descriptions
5. **Fee Extraction**: Pulls fees from transaction descriptions

## Transaction Types Supported
- Stock trades: BUY/SELL → buy/sell  
- Options: BUYTOOPEN/SELLTOOPEN/BUYTOCLOSE/SELLTOCLOSE → buy_to_open/sell_to_open/buy_to_close/sell_to_close
- Currently skips: transfers, fees, dividends, lending (can be added later)

## Usage
```typescript
const transactions = CSVParserService.parseCSV(csvContent, filename);
```

## Next Steps Needed
1. Create the actual csvParserService.ts file
2. Integrate with import functionality  
3. Add CSV upload handling to Settings page
4. Test with actual broker CSV files