/**
 * Debug Transaction Notes
 * Helper to examine the structure of transaction notes for pattern matching
 */

import { supabase } from '../lib/supabase';

export async function debugTransactionNotes(transactionId?: string): Promise<void> {
  try {
    console.log('🔍 Debugging transaction notes structure...');

    let query = supabase
      .from('transactions')
      .select('id, portfolio_id, notes, created_at')
      .not('notes', 'is', null);

    if (transactionId) {
      query = query.eq('id', transactionId);
    } else {
      query = query.limit(5); // Just get a few examples
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('❌ Error fetching transactions:', error);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('No transactions found with notes');
      return;
    }

    console.log(`📋 Found ${transactions.length} transactions to examine:`);

    for (const transaction of transactions) {
      console.log(`\n🔍 Transaction ID: ${transaction.id}`);
      console.log(`📅 Created: ${transaction.created_at}`);
      console.log(`💼 Portfolio ID: ${transaction.portfolio_id}`);
      
      try {
        const notes = JSON.parse(transaction.notes);
        console.log('📝 Notes structure:');
        console.log('Keys:', Object.keys(notes));
        
        // Check different potential locations for account info
        if (notes.aiResponse) {
          console.log('  📧 aiResponse exists');
          console.log('  aiResponse keys:', Object.keys(notes.aiResponse));
          
          if (notes.aiResponse.extractedData) {
            console.log('  📊 extractedData exists');
            console.log('  extractedData keys:', Object.keys(notes.aiResponse.extractedData));
            if (notes.aiResponse.extractedData.portfolioName) {
              console.log('  💼 portfolioName:', notes.aiResponse.extractedData.portfolioName);
            }
          }
          
          if (notes.aiResponse.rawData) {
            console.log('  📄 rawData exists');
            console.log('  rawData keys:', Object.keys(notes.aiResponse.rawData));
            if (notes.aiResponse.rawData.extractedText) {
              const text = notes.aiResponse.rawData.extractedText;
              console.log('  📝 extractedText preview (first 200 chars):');
              console.log('  ', text.substring(0, 200) + '...');
              
              // Look for account patterns
              const accountPatterns = [
                /Account:\s*\*([^*]+)\*/gi,
                /([A-Z]+)\s+account/gi,
                /account\s+type:\s*([A-Z]+)/gi,
                /(TFSA|RSP|RRSP|MARGIN|CASH)\b/gi
              ];
              
              console.log('  🔍 Pattern matches:');
              for (let i = 0; i < accountPatterns.length; i++) {
                const matches = text.match(accountPatterns[i]);
                if (matches) {
                  console.log(`    Pattern ${i + 1}: ${matches}`);
                }
              }
            }
          }
        }
        
        if (notes.originalEmail) {
          console.log('  📧 originalEmail exists');
          console.log('  originalEmail keys:', Object.keys(notes.originalEmail));
          if (notes.originalEmail.content) {
            const content = notes.originalEmail.content;
            console.log('  📝 originalEmail content preview (first 200 chars):');
            console.log('  ', content.substring(0, 200) + '...');
          }
        }
        
        // Show full structure for debugging (truncated)
        console.log('  📋 Full notes preview:');
        console.log('  ', JSON.stringify(notes, null, 2).substring(0, 500) + '...');
        
      } catch (parseError) {
        console.log('❌ Could not parse notes as JSON:', parseError);
        console.log('📝 Raw notes (first 200 chars):');
        console.log('  ', transaction.notes.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}