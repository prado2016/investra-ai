// Test timezone edge cases that would cause date shifting

console.log('=== Testing UTC Conversion Issues ===');

// Simulate what the OLD code was doing
function oldDateHandling(dateString) {
  // Old problematic method
  return new Date(dateString + 'T12:00:00.000Z'); // Force UTC
}

// New fixed method
function newDateHandling(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local timezone
}

// Test with various dates
const testDates = ['2024-01-01', '2024-06-14', '2024-12-31'];

testDates.forEach(testDate => {
  console.log(`\n--- Testing date: ${testDate} ---`);
  
  const oldDate = oldDateHandling(testDate);
  const newDate = newDateHandling(testDate);
  
  console.log('Old method (UTC forced):');
  console.log('  Date object:', oldDate);
  console.log('  Year:', oldDate.getFullYear(), 'Month:', oldDate.getMonth() + 1, 'Day:', oldDate.getDate());
  console.log('  toISOString():', oldDate.toISOString());
  console.log('  toISOString().split("T")[0]:', oldDate.toISOString().split('T')[0]);
  
  console.log('New method (local):');
  console.log('  Date object:', newDate);
  console.log('  Year:', newDate.getFullYear(), 'Month:', newDate.getMonth() + 1, 'Day:', newDate.getDate());
  console.log('  toISOString():', newDate.toISOString());
  console.log('  toISOString().split("T")[0]:', newDate.toISOString().split('T')[0]);
  
  // Check if there would be a shift
  const oldFormatted = oldDate.toISOString().split('T')[0];
  const newFormatted = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
  
  console.log('Original input:', testDate);
  console.log('Old output:', oldFormatted);
  console.log('New output:', newFormatted);
  console.log('Old method causes shift?', testDate !== oldFormatted);
  console.log('New method preserves date?', testDate === newFormatted);
});

// Show the exact timezone offset effect
console.log('\n=== Timezone Offset Analysis ===');
const offsetMinutes = new Date().getTimezoneOffset();
const offsetHours = offsetMinutes / 60;
console.log(`Current timezone offset: ${offsetMinutes} minutes (${offsetHours} hours)`);
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

if (offsetHours > 0) {
  console.log(`You are ${offsetHours} hours BEHIND UTC`);
  console.log('UTC date conversion could shift dates BACKWARD by 1 day');
} else if (offsetHours < 0) {
  console.log(`You are ${Math.abs(offsetHours)} hours AHEAD of UTC`);
  console.log('UTC date conversion could shift dates FORWARD by 1 day');
} else {
  console.log('You are at UTC timezone - no shifting expected');
}
