// Test the actual problematic pattern that causes date shifting

console.log('=== Testing REAL Date Shifting Scenarios ===');

// Test what happens with midnight UTC (this is more likely to cause issues)
function testMidnightUTC(inputDate) {
  console.log(`\n--- Testing midnight UTC pattern for: ${inputDate} ---`);
  
  // This would be the REAL problematic pattern:
  const midnightUTC = new Date(inputDate + 'T00:00:00.000Z');
  console.log('1. Midnight UTC Date object:', midnightUTC);
  console.log('2. Local date components:', {
    year: midnightUTC.getFullYear(),
    month: midnightUTC.getMonth() + 1,
    day: midnightUTC.getDate()
  });
  console.log('3. toISOString():', midnightUTC.toISOString());
  console.log('4. toISOString().split("T")[0]:', midnightUTC.toISOString().split('T')[0]);
  
  const shifted = inputDate !== midnightUTC.toISOString().split('T')[0];
  console.log('5. Date shifted?', shifted);
  
  if (shifted) {
    console.log('   ❌ PROBLEM: Input was', inputDate, 'but result is', midnightUTC.toISOString().split('T')[0]);
  } else {
    console.log('   ✅ OK: Date preserved');
  }
  
  return shifted;
}

// Test with various patterns that COULD cause issues
const testDates = ['2024-01-01', '2024-06-14', '2024-12-31', '2025-02-27'];

console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('UTC offset:', new Date().getTimezoneOffset(), 'minutes');

testDates.forEach(date => {
  testMidnightUTC(date);
});

// Test the most problematic pattern: Direct Date constructor with timezone conversion
console.log('\n=== Testing Direct Date Constructor Issues ===');

testDates.forEach(dateStr => {
  console.log(`\n--- Testing: ${dateStr} ---`);
  
  // Pattern 1: Direct constructor (this is what could cause issues)
  const directDate = new Date(dateStr);
  console.log('Direct Date():', directDate);
  console.log('Direct result:', directDate.toISOString().split('T')[0]);
  console.log('Shifted?', dateStr !== directDate.toISOString().split('T')[0]);
  
  // Pattern 2: Fixed local parsing
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);
  console.log('Local Date():', localDate);
  console.log('Local result:', `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`);
  console.log('Preserved?', dateStr === `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`);
});

// Test edge case: Different timezones (simulate what happens in other zones)
console.log('\n=== Simulating Other Timezone Issues ===');

// Simulate what would happen at different times of day
const testTime = new Date('2024-06-14T23:30:00'); // Late evening
console.log('Late evening local time:', testTime);
console.log('Would UTC conversion shift this?', testTime.toISOString().split('T')[0]);

const morningTime = new Date('2024-06-14T02:30:00'); // Early morning  
console.log('Early morning local time:', morningTime);
console.log('Would UTC conversion shift this?', morningTime.toISOString().split('T')[0]);
console.log('  - Consistency and avoiding timezone-dependent behavior');
console.log('  - Avoiding confusion when debugging date-related issues');

// Test what happens in other timezones (simulation)
console.log('\n=== Simulating Other Timezones ===');

// Simulate timezone ahead of UTC (like Europe/London in summer)
function simulateTimezoneAhead() {
  console.log('\n--- Simulating timezone ahead of UTC (e.g., Europe/London +1) ---');
  
  // For someone in UTC+1, midnight UTC would be 1 AM local time
  // This might not cause date shifts, but let's see edge cases
  
  const testDate = '2024-06-14';
  console.log(`Testing ${testDate} in UTC+1 timezone:`);
  
  // If their local date constructor created:
  // new Date(2024, 5, 14) → would be June 14 at local midnight
  // But if UTC forced: new Date('2024-06-14T00:00:00.000Z') → would be June 14 at 1 AM local
  
  console.log('  UTC midnight approach: Date represents correct date');
  console.log('  But if any code used local methods on UTC date, could shift');
}

// Simulate timezone behind UTC (like Pacific Time)
function simulateTimezoneBehind() {
  console.log('\n--- Simulating timezone behind UTC (e.g., US Pacific -8) ---');
  
  const testDate = '2024-06-14';
  console.log(`Testing ${testDate} in UTC-8 timezone:`);
  
  // For someone in UTC-8, midnight UTC would be 4 PM previous day local time
  // This WOULD cause date shifts when using local components
  
  const utcDate = new Date(testDate + 'T00:00:00.000Z');
  console.log('  UTC Date object:', utcDate);
  
  // Simulate what .getDate() etc would return in UTC-8
  // (We can't actually change timezone, but we can show the concept)
  const simulatedOffset = -8 * 60; // -8 hours in minutes
  const localTime = new Date(utcDate.getTime() + (simulatedOffset * 60 * 1000));
  
  console.log('  Simulated local time in UTC-8:', localTime);
  console.log('  This would shift the date to:', localTime.toDateString());
}

simulateTimezoneAhead();
simulateTimezoneBehind();

console.log('\n=== Why Your Fix Is Important ===');
console.log('1. Eliminates timezone-dependent behavior');
console.log('2. Ensures date consistency across all users globally');
console.log('3. Prevents subtle bugs that only appear in certain timezones');
console.log('4. Makes the code more predictable and easier to debug');
console.log('5. Follows best practices for date-only operations');
