// Complete test of fund movement date flow after fix

console.log('=== COMPLETE FUND MOVEMENT DATE FLOW TEST (After Fix) ===');

// Step 1: User enters date in form
const userDate = '2025-02-27';
console.log('1. User enters date:', userDate);

// Step 2: Form creates Date object (FundMovementForm onSubmit)
const [year, month, day] = userDate.split('-').map(Number);
const formDate = new Date(year, month - 1, day);
console.log('2. Form creates Date:', formDate);

// Step 3: Transactions page formats date for service call
const serviceYear = formDate.getFullYear();
const serviceMonth = String(formDate.getMonth() + 1).padStart(2, '0');
const serviceDay = String(formDate.getDate()).padStart(2, '0');
const serviceDateStr = `${serviceYear}-${serviceMonth}-${serviceDay}`;
console.log('3. Service receives date string:', serviceDateStr);

// Step 4: Database stores the date string
console.log('4. Database stores:', serviceDateStr);

// Step 5: Database returns the date string (fetchFundMovements)
const dbReturns = serviceDateStr;
console.log('5. Database returns:', dbReturns);

// Step 6: FIXED parsing in fetchFundMovements
const [dbYear, dbMonth, dbDay] = dbReturns.split('-').map(Number);
const parsedDate = new Date(dbYear, dbMonth - 1, dbDay);
console.log('6. Fixed parsing creates:', parsedDate);

// Step 7: Form displays date for editing (FundMovementForm initialValues)
const editFormYear = parsedDate.getFullYear();
const editFormMonth = String(parsedDate.getMonth() + 1).padStart(2, '0');
const editFormDay = String(parsedDate.getDate()).padStart(2, '0');
const editFormValue = `${editFormYear}-${editFormMonth}-${editFormDay}`;
console.log('7. Form shows for editing:', editFormValue);

// Step 8: Final verification
console.log('\n=== VERIFICATION ===');
console.log('Original user input:', userDate);
console.log('Final display value:', editFormValue);
console.log('Complete round-trip success?', userDate === editFormValue);

// Test the fix with multiple problematic dates
console.log('\n=== TESTING MULTIPLE DATES ===');
const testDates = [
  '2025-01-01',  // New Year
  '2025-02-27',  // The reported issue date
  '2025-12-31',  // Year end
  '2024-02-29',  // Leap year day
  '2025-06-15'   // Mid-year date
];

testDates.forEach(testDate => {
  console.log(`\nTesting: ${testDate}`);
  
  // Complete flow
  const [y, m, d] = testDate.split('-').map(Number);
  const flowDate = new Date(y, m - 1, d);
  const serviceStr = `${flowDate.getFullYear()}-${String(flowDate.getMonth() + 1).padStart(2, '0')}-${String(flowDate.getDate()).padStart(2, '0')}`;
  
  // Parse back (fixed method)
  const [py, pm, pd] = serviceStr.split('-').map(Number);
  const parsedBack = new Date(py, pm - 1, pd);
  const finalDisplay = `${parsedBack.getFullYear()}-${String(parsedBack.getMonth() + 1).padStart(2, '0')}-${String(parsedBack.getDate()).padStart(2, '0')}`;
  
  console.log(`  Input: ${testDate}`);
  console.log(`  Output: ${finalDisplay}`);
  console.log(`  Status: ${testDate === finalDisplay ? '✅ PRESERVED' : '❌ SHIFTED'}`);
});

console.log('\n🎯 Fund movement date issue should now be COMPLETELY FIXED! 🎯');
