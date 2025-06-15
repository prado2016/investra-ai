/**
 * Test script for Fund Movement Editing functionality
 * Run this in the browser console to test fund movement editing
 */

function testFundMovementEditing() {
  console.log('🧪 Testing Fund Movement Editing Functionality');
  
  // Check if the necessary components are loaded
  const checkComponents = () => {
    console.log('1. Checking if components are loaded...');
    
    // Check if React and the app context are available
    if (typeof React === 'undefined') {
      console.log('❌ React not found - testing from browser console');
    } else {
      console.log('✅ React found');
    }
    
    // Check for fund movement list
    const fundMovementList = document.querySelector('[data-testid="fund-movement-list"], .fund-movement-list');
    if (fundMovementList) {
      console.log('✅ Fund Movement List found');
    } else {
      console.log('❌ Fund Movement List not found - navigate to Transactions page');
    }
    
    // Check for edit buttons
    const editButtons = document.querySelectorAll('[data-testid="edit-fund-movement"], .edit-fund-movement');
    console.log(`📊 Found ${editButtons.length} edit buttons`);
    
    return { fundMovementList, editButtons };
  };
  
  // Test edit modal functionality
  const testEditModal = () => {
    console.log('2. Testing edit modal...');
    
    const editButtons = document.querySelectorAll('[data-testid="edit-fund-movement"], .edit-fund-movement, [title*="Edit"], button[title*="edit"], button[aria-label*="edit"]');
    
    if (editButtons.length === 0) {
      console.log('❌ No edit buttons found');
      return false;
    }
    
    console.log(`✅ Found ${editButtons.length} edit buttons`);
    
    // Try to click the first edit button
    const firstEditButton = editButtons[0];
    console.log('🖱️ Clicking first edit button...');
    
    try {
      firstEditButton.click();
      
      // Wait for modal to appear
      setTimeout(() => {
        const modal = document.querySelector('[data-testid="fund-movement-edit-modal"], .fund-movement-edit-modal, [role="dialog"]');
        if (modal) {
          console.log('✅ Edit modal opened successfully');
          
          // Check for form fields
          const formFields = modal.querySelectorAll('input, select, textarea');
          console.log(`📊 Found ${formFields.length} form fields in modal`);
          
          // Check for save button
          const saveButton = modal.querySelector('[data-testid="save-button"], button[type="submit"], button:contains("Save")');
          if (saveButton) {
            console.log('✅ Save button found in modal');
          }
          
          // Check for cancel button
          const cancelButton = modal.querySelector('[data-testid="cancel-button"], button:contains("Cancel")');
          if (cancelButton) {
            console.log('✅ Cancel button found in modal');
          }
          
        } else {
          console.log('❌ Edit modal did not open');
        }
      }, 500);
      
    } catch (error) {
      console.log('❌ Error clicking edit button:', error);
    }
    
    return true;
  };
  
  // Test console logging
  const testConsoleLogging = () => {
    console.log('3. Testing console logging optimization...');
    
    // Count current console messages
    const originalConsoleLog = console.log;
    let logCount = 0;
    
    console.log = function(...args) {
      logCount++;
      originalConsoleLog.apply(console, args);
    };
    
    console.log('📊 Starting console log monitoring...');
    
    // Wait and check for excessive logging
    setTimeout(() => {
      if (logCount > 10) {
        console.log(`⚠️ Detected ${logCount} console logs in 5 seconds - may need further optimization`);
      } else {
        console.log(`✅ Console logging seems optimized (${logCount} logs in 5 seconds)`);
      }
      
      // Restore original console.log
      console.log = originalConsoleLog;
    }, 5000);
  };
  
  // Run all tests
  const components = checkComponents();
  
  if (components.fundMovementList) {
    testEditModal();
  }
  
  testConsoleLogging();
  
  console.log('🎯 Test completed. Check the results above.');
  console.log('💡 To run this test:');
  console.log('   1. Navigate to the Transactions page');
  console.log('   2. Make sure you have some fund movements');
  console.log('   3. Run testFundMovementEditing() in the console');
}

// Instructions for manual testing
console.log('🧪 Fund Movement Editing Test Script Loaded');
console.log('📝 Manual Testing Steps:');
console.log('1. Navigate to the Transactions page');
console.log('2. Look for the "Recent Funds" section');
console.log('3. Click on any edit button (pencil icon)');
console.log('4. Verify the edit modal opens with pre-populated data');
console.log('5. Try editing the fund movement');
console.log('6. Save the changes');
console.log('7. Verify the changes are reflected in the list');
console.log('');
console.log('🚀 To run automated tests, call: testFundMovementEditing()');

// Export for use
window.testFundMovementEditing = testFundMovementEditing;
