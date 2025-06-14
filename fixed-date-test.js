// Test where the ACTUAL date shifting bug would manifest

console.log('=== Testing WHERE Date Shifting Actually Occurs ===');

function testRealBugScenario(inputDate) {
  console.log(`\n--- Real bug test for: ${inputDate} ---`);
  
  // Scenario 1: If code was using .getDate(), .getMonth(), .getFullYear() on UTC date
  const utcDate = new Date(inputDate + 'T00:00:00.000Z');
  
  console.log('1. Input date string:', inputDate);
  console.log('2. UTC Date object:', utcDate);
  
  // This is where the bug would show up - if code used these methods:
  const utcYear = utcDate.getFullYear();
  const utcMonth = utcDate.getMonth() + 1;
  const utcDay = utcDate.getDate();
  
  console.log('3. UTC date components:');
  console.log('   getFullYear():', utcYear);
  console.log('   getMonth() + 1:', utcMonth);  
  console.log('   getDate():', utcDay);
  
  // If these were used to reconstruct the date string:
  const reconstructed = `${utcYear}-${String(utcMonth).padStart(2, '0')}-${String(utcDay).padStart(2, '0')}`;
  console.log('4. Reconstructed from components:', reconstructed);
  
  // This is where the shift would be visible:
  const shifted = inputDate !== reconstructed;
  console.log('5. Date shifted from components?', shifted);
  
  if (shifted) {
    console.log('   ❌ BUG: Input', inputDate, '→ Components give', reconstructed);
  } else {
    console.log('   ✅ OK: Components preserved the date');
  }
  
  // Compare with proper local parsing:
  const [year, month, day] = inputDate.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  const localReconstructed = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  
  console.log('6. Local parsing result:', localReconstructed);
  console.log('7. Local method preserves?', inputDate === localReconstructed);
  
  return shifted;
}

// Test dates that would reveal the bug
const testDates = ['2024-01-01', '2024-06-14', '2024-12-31', '2025-02-27'];

console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('UTC offset:', new Date().getTimezoneOffset(), 'minutes (negative means ahead of UTC)');
console.log();

let bugsFound = 0;
testDates.forEach(date => {
  if (testRealBugScenario(date)) {
    bugsFound++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`Total dates tested: ${testDates.length}`);
console.log(`Dates with component shifting: ${bugsFound}`);

if (bugsFound > 0) {
  console.log('\n🐛 DATE SHIFTING BUG CONFIRMED!');
  console.log('The issue occurs when using .getDate(), .getMonth(), .getFullYear() on UTC-forced dates.');
  console.log('Your fix to use local date parsing prevents this bug.');
} else {
  console.log('\n✅ No component-level shifting detected in current timezone.');
  console.log('However, the fix is still valuable for:');
  console.log('  - Users in different timezones');
  console.log('  - Consistency and avoiding timezone-dependent behavior');
  console.log('  - Avoiding confusion when debugging date-related issues');
}

console.log('\n=== Why Your Fix Is Important ===');
console.log('1. Eliminates timezone-dependent behavior');
console.log('2. Ensures date consistency across all users globally'); 
console.log('3. Prevents subtle bugs that only appear in certain timezones');
console.log('4. Makes the code more predictable and easier to debug');
console.log('5. Follows best practices for date-only operations');
