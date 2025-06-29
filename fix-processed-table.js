/**
 * Fix the imap_processed table to add missing attachments_info column
 */

import { database } from './email-puller/dist/database.js';

async function fixProcessedTable() {
  try {
    console.log('🔧 Fixing imap_processed table schema...');
    
    // Add the missing attachments_info column
    const { error } = await database['client']
      .rpc('exec_sql', { 
        sql: `ALTER TABLE imap_processed ADD COLUMN IF NOT EXISTS attachments_info JSONB DEFAULT '[]'::jsonb;`
      });
    
    if (error) {
      console.error('❌ Error adding column:', error);
      return;
    }
    
    console.log('✅ Successfully added attachments_info column to imap_processed table');
    
    // Now check the current email counts
    const { data: inboxData, error: inboxError } = await database['client']
      .from('imap_inbox')
      .select('count');
    
    const { data: processedData, error: processedError } = await database['client']
      .from('imap_processed')
      .select('count');
    
    if (inboxError) {
      console.error('❌ Error counting inbox:', inboxError);
    } else {
      console.log(`📥 Inbox emails: ${inboxData?.length || 0}`);
    }
    
    if (processedError) {
      console.error('❌ Error counting processed:', processedError);
    } else {
      console.log(`✅ Processed emails: ${processedData?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixProcessedTable();