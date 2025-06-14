// Test the FIXED fund movement date handling

console.log('=== FIXED Fund Movement Date Handling Test ===');

// Simulate what comes back from database
const dbMovementDate = '2025-02-27'; // Database returns this string
console.log('1. Database returns movement_date:', dbMovementDate);

// OLD (problematic) way - what was causing the issue
console.log('\n--- OLD (Problematic) Method ---');
const oldDate = new Date(dbMovementDate);
console.log('2. Old: new Date(dbMovementDate):', oldDate);
console.log('3. Old: Local components:', {
  year: oldDate.getFullYear(),
  month: oldDate.getMonth() + 1,
  day: oldDate.getDate()
});
console.log('4. Old: Form value would be:', `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`);

// NEW (fixed) way - what should prevent the issue
console.log('\n--- NEW (Fixed) Method ---');
const [year, month, day] = dbMovementDate.split('-').map(Number);
const newDate = new Date(year, month - 1, day);
console.log('2. New: Parse components and create local date:', newDate);
console.log('3. New: Local components:', {
  year: newDate.getFullYear(),
  month: newDate.getMonth() + 1,
  day: newDate.getDate()
});
console.log('4. New: Form value would be:', `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`);

// Comparison
console.log('\n--- Comparison ---');
const oldFormValue = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}-${String(oldDate.getDate()).padStart(2, '0')}`;
const newFormValue = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;

console.log('Original DB date:', dbMovementDate);
console.log('Old method result:', oldFormValue);
console.log('New method result:', newFormValue);
console.log('Old method causes shift?', dbMovementDate !== oldFormValue);
console.log('New method preserves date?', dbMovementDate === newFormValue);

// Test with different dates
console.log('\n=== Testing Multiple Dates ===');
const testDates = ['2025-01-01', '2025-02-27', '2025-12-31'];

testDates.forEach(testDate => {
  console.log(`\nTesting: ${testDate}`);
  
  // Old method
  const oldTestDate = new Date(testDate);
  const oldResult = `${oldTestDate.getFullYear()}-${String(oldTestDate.getMonth() + 1).padStart(2, '0')}-${String(oldTestDate.getDate()).padStart(2, '0')}`;
  
  // New method
  const [y, m, d] = testDate.split('-').map(Number);
  const newTestDate = new Date(y, m - 1, d);
  const newResult = `${newTestDate.getFullYear()}-${String(newTestDate.getMonth() + 1).padStart(2, '0')}-${String(newTestDate.getDate()).padStart(2, '0')}`;
  
  console.log(`  Old: ${testDate} → ${oldResult} (${testDate === oldResult ? 'OK' : 'SHIFTED'})`);
  console.log(`  New: ${testDate} → ${newResult} (${testDate === newResult ? 'OK' : 'SHIFTED'})`);
});
