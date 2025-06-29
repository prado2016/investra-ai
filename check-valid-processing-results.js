/**
 * Check what processing_result values are currently used and valid
 */

import { database } from './email-puller/dist/database.js';

async function checkValidProcessingResults() {
  try {
    console.log('🔍 Checking Valid Processing Results');
    console.log('===================================\n');

    // Get all unique processing_result values currently in use
    const { data: results, error } = await database['client']
      .from('imap_processed')
      .select('processing_result')
      .not('processing_result', 'is', null);

    if (error) {
      console.error('❌ Error fetching processing results:', error);
      return;
    }

    const uniqueResults = [...new Set(results?.map(r => r.processing_result))];
    
    console.log('📊 Currently used processing_result values:');
    uniqueResults.forEach(result => {
      const count = results?.filter(r => r.processing_result === result).length || 0;
      console.log(`   • ${result}: ${count} emails`);
    });

    console.log('\n💡 Based on the constraint error, valid values appear to be:');
    console.log('   • approved');
    console.log('   • processed');
    console.log('   • failed');
    console.log('   • pending');
    console.log('   (expense is NOT allowed)\n');

    console.log('🛠️ ALTERNATIVE SOLUTIONS:');
    console.log('   1. Leave as "approved" but update processing_notes for clarity');
    console.log('   2. Create a separate "expense_emails" table');
    console.log('   3. Add a boolean "is_expense" column');
    console.log('   4. Update database constraint to allow "expense" status');

    return uniqueResults;

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkValidProcessingResults();