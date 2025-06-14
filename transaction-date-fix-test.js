// Test script to verify transaction date formatting fix
console.log('🔍 Testing Transaction Date Display Fix');

// Test the exact database value from your export
const databaseDate = "2025-05-01";
console.log('\n📅 Database Date:', databaseDate);

// OLD (problematic) way - what was causing the timezone shift
console.log('\n❌ OLD (Problematic) Method:');
const oldDate = new Date(databaseDate);
console.log('  new Date(databaseDate):', oldDate);
console.log('  toLocaleDateString():', oldDate.toLocaleDateString());
console.log('  Intl.DateTimeFormat result:', new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short', 
  day: 'numeric'
}).format(oldDate));

// NEW (fixed) way - timezone-safe parsing
console.log('\n✅ NEW (Fixed) Method:');
const [year, month, day] = databaseDate.split('-').map(Number);
const safeDate = new Date(year, month - 1, day); // month is 0-indexed
console.log('  Components parsed:', { year, month, day });
console.log('  Safe Date object:', safeDate);
console.log('  toLocaleDateString():', safeDate.toLocaleDateString());
console.log('  Intl.DateTimeFormat result:', new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
}).format(safeDate));

// Test with formatDate function simulation
function formatDate(date, locale = 'en-US', options = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

console.log('\n🧪 Final Test Results:');
console.log('Database value:', databaseDate);
console.log('Expected display: "May 1, 2025"');
console.log('OLD method result:', formatDate(databaseDate));
console.log('NEW method result:', formatDate(safeDate));

// Additional test cases
console.log('\n📊 Additional Test Cases:');
const testDates = ['2025-01-01', '2025-02-28', '2025-12-31'];
testDates.forEach(testDate => {
  const [y, m, d] = testDate.split('-').map(Number);
  const safeParsed = new Date(y, m - 1, d);
  console.log(`${testDate} → OLD: ${formatDate(testDate)} → NEW: ${formatDate(safeParsed)}`);
});

console.log('\n🎯 The date display issue should now be FIXED! ✅');
