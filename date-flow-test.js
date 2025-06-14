// Test the specific scenario where date shifting would occur

console.log('=== Testing Database Date Round-Trip ===');

// Simulate what happens when saving/loading dates
function simulateOldBuggyFlow(inputDate) {
  console.log(`\n--- Simulating old buggy flow for: ${inputDate} ---`);
  
  // Step 1: User selects date in form
  console.log('1. User selects date:', inputDate);
  
  // Step 2: Old code creates Date with UTC conversion
  const oldFormDate = new Date(inputDate + 'T12:00:00.000Z');
  console.log('2. Old form parsing (UTC forced):', oldFormDate);
  
  // Step 3: Old code saves to database using toISOString
  const oldSavedDate = oldFormDate.toISOString().split('T')[0];
  console.log('3. Old database save:', oldSavedDate);
  
  // Step 4: When editing, date comes back from database
  console.log('4. Date loaded from database:', oldSavedDate);
  
  // Step 5: Old code sets form value using toISOString again
  const oldEditDate = new Date(oldSavedDate);
  const oldFormValue = oldEditDate.toISOString().split('T')[0];
  console.log('5. Old form display value:', oldFormValue);
  
  console.log('Final result - Date shifted?', inputDate !== oldFormValue);
  return oldFormValue;
}

function simulateNewFixedFlow(inputDate) {
  console.log(`\n--- Simulating NEW fixed flow for: ${inputDate} ---`);
  
  // Step 1: User selects date in form
  console.log('1. User selects date:', inputDate);
  
  // Step 2: New code creates Date with local timezone
  const [year, month, day] = inputDate.split('-').map(Number);
  const newFormDate = new Date(year, month - 1, day);
  console.log('2. New form parsing (local):', newFormDate);
  
  // Step 3: New code saves to database using local date formatting
  const newSavedDate = `${newFormDate.getFullYear()}-${String(newFormDate.getMonth() + 1).padStart(2, '0')}-${String(newFormDate.getDate()).padStart(2, '0')}`;
  console.log('3. New database save:', newSavedDate);
  
  // Step 4: When editing, date comes back from database
  console.log('4. Date loaded from database:', newSavedDate);
  
  // Step 5: New code handles existing dates properly
  const newFormValue = newSavedDate; // Direct use, no conversion
  console.log('5. New form display value:', newFormValue);
  
  console.log('Final result - Date preserved?', inputDate === newFormValue);
  return newFormValue;
}

// Test edge cases that could cause problems
const testCases = [
  '2024-01-01',  // New Year's Day
  '2024-06-14',  // Summer date (current)
  '2024-12-31',  // New Year's Eve
  '2025-02-27',  // The specific date mentioned in the issue
];

testCases.forEach(testDate => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing date: ${testDate}`);
  console.log(`${'='.repeat(50)}`);
  
  const oldResult = simulateOldBuggyFlow(testDate);
  const newResult = simulateNewFixedFlow(testDate);
  
  console.log(`\nSUMMARY for ${testDate}:`);
  console.log(`Original: ${testDate}`);
  console.log(`Old flow: ${oldResult} (${testDate === oldResult ? 'PRESERVED' : 'SHIFTED'})`);
  console.log(`New flow: ${newResult} (${testDate === newResult ? 'PRESERVED' : 'SHIFTED'})`);
});

// Test current timezone info
console.log('\n' + '='.repeat(50));
console.log('TIMEZONE INFO');
console.log('='.repeat(50));
const now = new Date();
console.log('Current time:', now);
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('UTC offset (minutes):', now.getTimezoneOffset());
console.log('UTC offset (hours):', now.getTimezoneOffset() / 60);
