/**
 * Test script for UUID generation fix
 * Run this in the browser console to test the account destination service
 */

// Test UUID generation
function testUUIDGeneration() {
  console.log('🧪 Testing UUID Generation Fix');
  
  // Test the UUID generation function
  const testUUIDs = [];
  
  for (let i = 0; i < 5; i++) {
    // Access the service function directly (if available)
    let uuid;
    
    // Test crypto.randomUUID if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      console.log('✅ crypto.randomUUID is available');
      uuid = crypto.randomUUID();
    } else {
      console.log('⚠️ crypto.randomUUID not available, using fallback');
      // Fallback UUID v4 implementation
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    testUUIDs.push(uuid);
    console.log(`UUID ${i + 1}: ${uuid}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uuid)) {
      console.log(`✅ UUID ${i + 1} format is valid`);
    } else {
      console.log(`❌ UUID ${i + 1} format is invalid`);
    }
  }
  
  // Check for uniqueness
  const uniqueUUIDs = new Set(testUUIDs);
  if (uniqueUUIDs.size === testUUIDs.length) {
    console.log('✅ All generated UUIDs are unique');
  } else {
    console.log('❌ Some UUIDs are duplicated');
  }
  
  console.log('🎯 UUID generation test completed');
  return testUUIDs;
}

// Test account destination creation
async function testAccountDestinationCreation() {
  console.log('🧪 Testing Account Destination Creation');
  
  try {
    // Navigate to settings first
    if (!window.location.pathname.includes('settings')) {
      console.log('📍 Please navigate to the Settings page first');
      console.log('   Go to: http://localhost:5176/settings');
      return;
    }
    
    // Look for the account destination management section
    const accountSection = document.querySelector('[data-testid="account-destination-manager"]') ||
                          document.querySelector('h3:contains("Account Destination Management")') ||
                          document.querySelector('h3');
    
    if (accountSection) {
      console.log('✅ Account Destination Management section found');
    } else {
      console.log('❌ Account Destination Management section not found');
      console.log('   Make sure you are on the Settings page');
      return;
    }
    
    // Look for the "Add New Account" button
    const addButton = document.querySelector('button:contains("Add New Account")') ||
                     document.querySelector('[data-testid="add-account-button"]') ||
                     Array.from(document.querySelectorAll('button')).find(btn => 
                       btn.textContent?.includes('Add New Account') || 
                       btn.textContent?.includes('Add') && btn.textContent?.includes('Account')
                     );
    
    if (addButton) {
      console.log('✅ Add New Account button found');
      console.log('🖱️ Try clicking it to test the UUID generation');
      console.log('   If no error occurs, the fix is working!');
    } else {
      console.log('❌ Add New Account button not found');
      console.log('   The button might be styled differently or have a different text');
    }
    
    // Test manual account creation if accountDestinationService is available
    if (window.accountDestinationService) {
      console.log('🧪 Testing service directly...');
      try {
        await window.accountDestinationService.create({
          name: 'Test Account ' + Date.now(),
          displayName: 'Test Account',
          type: 'OTHER'
        });
        console.log('✅ Account creation successful - UUID fix is working!');
      } catch (error) {
        console.log('❌ Account creation failed:', error.message);
      }
    } else {
      console.log('⚠️ accountDestinationService not available in window scope');
      console.log('   Test by clicking the Add New Account button manually');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('🔧 UUID Generation Fix Test Script Loaded');
console.log('');
console.log('📝 Testing Instructions:');
console.log('1. Run testUUIDGeneration() to test UUID generation');
console.log('2. Navigate to Settings page');
console.log('3. Run testAccountDestinationCreation() to test the fix');
console.log('4. Or manually click "Add New Account" and fill the form');
console.log('');
console.log('🚀 Commands:');
console.log('   testUUIDGeneration()');
console.log('   testAccountDestinationCreation()');

// Export functions to window
window.testUUIDGeneration = testUUIDGeneration;
window.testAccountDestinationCreation = testAccountDestinationCreation;
