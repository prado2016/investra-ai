# Database Schema Issue - 400 Error Fix

## Problem
The application is getting 400 errors with message: `Could not find the 'asset_type' column of 'transactions' in the schema cache`

## Root Cause
The `createTradingTransaction` method in `src/services/simpleEmailService.ts` (line 879) is trying to insert `asset_type` directly into the `transactions` table, but according to the database schema in `src/lib/database/types.ts`:

- `Transaction` interface has `asset_id: string` (references Asset table)
- `Asset` interface has `asset_type: AssetType` 

## Correct Database Design
1. **Assets Table**: Stores asset information including `asset_type`, `symbol`, `name`, etc.
2. **Transactions Table**: References assets via `asset_id`, not direct `asset_type`

## Fix Required
The `createTradingTransaction` method should:
1. First look up or create an `Asset` record with the provided symbol and assetType
2. Then create the `Transaction` record using the asset's ID instead of asset_type

## Files to Modify
- `src/services/simpleEmailService.ts` - Fix the createTradingTransaction method
- May need to add asset lookup/creation logic