// Test fund movement date handling

console.log('=== Fund Movement Date Handling Test ===');

// Simulate user entering date in form
const userInputDate = '2025-02-27'; // What user types in date field
console.log('1. User input date:', userInputDate);

// Step 1: FundMovementForm processes the date (from onSubmit)
const [year, month, day] = userInputDate.split('-').map(Number);
const formDate = new Date(year, month - 1, day);
console.log('2. Form creates Date object:', formDate);
console.log('   Components:', { year: formDate.getFullYear(), month: formDate.getMonth() + 1, day: formDate.getDate() });

// Step 2: Transactions page processes the date for service call
const serviceYear = formDate.getFullYear();
const serviceMonth = String(formDate.getMonth() + 1).padStart(2, '0');
const serviceDay = String(formDate.getDate()).padStart(2, '0');
const serviceDateString = `${serviceYear}-${serviceMonth}-${serviceDay}`;
console.log('3. Service call date string:', serviceDateString);

// Step 3: Check if there would be any shifts
console.log('4. Round-trip check:');
console.log('   Original input:', userInputDate);
console.log('   Final output:', serviceDateString);
console.log('   Are they equal?', userInputDate === serviceDateString);

// Step 4: Test what happens when we read the date back from database
// Simulate database returning the date string
const dbDateString = serviceDateString; // This is what comes back from DB
console.log('5. Database returns:', dbDateString);

// When loading for editing, check how we parse it back
const editDate = new Date(dbDateString);
console.log('6. Date parsed for editing:', editDate);
console.log('   toISOString():', editDate.toISOString());
console.log('   Local components:', { 
  year: editDate.getFullYear(), 
  month: editDate.getMonth() + 1, 
  day: editDate.getDate() 
});

// Check if editing would cause issues
const editFormValue = editDate.toISOString().split('T')[0];
console.log('7. Form value for editing:', editFormValue);
console.log('8. Would editing cause shift?', userInputDate !== editFormValue);

// Test current timezone
console.log('\n=== Timezone Info ===');
console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('UTC offset (minutes):', new Date().getTimezoneOffset());

// Test a specific problematic scenario
console.log('\n=== Testing Direct Date Constructor (Potential Issue) ===');
const directDate = new Date(userInputDate);
console.log('Direct new Date(userInputDate):', directDate);
console.log('Direct date components:', {
  year: directDate.getFullYear(),
  month: directDate.getMonth() + 1, 
  day: directDate.getDate()
});
console.log('Direct toISOString().split("T")[0]:', directDate.toISOString().split('T')[0]);
console.log('Direct method causes shift?', userInputDate !== directDate.toISOString().split('T')[0]);
