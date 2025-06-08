# Manual Validation Test Results

## Test Cases for Symbol Validation

### Primary Test Case: "SOXL Jun 6 $17 Call"

**Expected Behavior:**
1. Input: "SOXL Jun 6 $17 Call"
2. AI Parser should convert to: "SOXL250606C00017000"
3. Yahoo Finance Validator should accept this format (options pattern: `/^[A-Z]{1,5}\d{6}[CP]\d{8}$/`)
4. Result: Should be valid

**Test Steps:**
1. Open http://localhost:5182/ai-test
2. Enter "SOXL Jun 6 $17 Call" in the input field
3. Click "Test Validation" or use the quick test button
4. Verify results

### Additional Test Cases:

1. **Basic Stock Symbol:**
   - Input: "AAPL"
   - Expected: Valid (passes through as-is)

2. **Stock with Extra Text:**
   - Input: "Apple stock AAPL"
   - Expected: Parsed to "AAPL" and validated

3. **Put Option:**
   - Input: "TSLA Jun 6 $200 Put"
   - Expected: Parsed to options format and validated

4. **Invalid Symbol:**
   - Input: "INVALIDSTOCK123"
   - Expected: Should fail validation gracefully

### Results:

[ ] Test 1: SOXL Jun 6 $17 Call - ___________
[ ] Test 2: AAPL - ___________
[ ] Test 3: Apple stock AAPL - ___________
[ ] Test 4: TSLA Jun 6 $200 Put - ___________
[ ] Test 5: INVALIDSTOCK123 - ___________

### Notes:
- Record any unexpected behavior
- Check error messages for clarity
- Verify loading states work correctly
- Test suggestion functionality if applicable

---

## Development Server Status
- Server running on: http://localhost:5182/
- Test page accessible at: http://localhost:5182/ai-test
- All compilation errors resolved: ✅
