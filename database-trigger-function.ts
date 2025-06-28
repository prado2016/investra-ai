/**
 * Database-driven manual sync trigger function
 * Add this to simpleEmailService.ts
 */

// Add this function to your simpleEmailService.ts file
export async function triggerManualSyncViaDatabase(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔄 Triggering manual sync via database...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return { 
        success: false, 
        error: 'No authenticated user. Please log in again.' 
      };
    }

    console.log('✅ User authenticated for database sync:', user.email);
    
    // Insert sync request into database
    const { data: syncRequest, error: insertError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: user.id,
        request_type: 'manual_sync',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create sync request:', insertError);
      return { 
        success: false, 
        error: `Failed to create sync request: ${insertError.message}` 
      };
    }

    console.log('✅ Sync request created:', syncRequest.id);
    
    // Poll for completion with timeout
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    const pollInterval = 1000; // 1 second
    
    console.log('⏳ Polling for sync completion...');
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const { data: updatedRequest, error: pollError } = await supabase
        .from('sync_requests')
        .select('*')
        .eq('id', syncRequest.id)
        .single();

      if (pollError) {
        console.warn('⚠️  Poll error (continuing):', pollError.message);
        attempts++;
        continue;
      }
      
      if (updatedRequest.status === 'completed') {
        console.log('✅ Sync completed successfully');
        return { 
          success: true, 
          data: {
            requestId: syncRequest.id,
            completedAt: updatedRequest.processed_at,
            result: updatedRequest.result
          }
        };
      } else if (updatedRequest.status === 'failed') {
        console.log('❌ Sync failed');
        return { 
          success: false, 
          error: `Sync failed: ${updatedRequest.result?.error || 'Unknown error'}` 
        };
      }
      
      attempts++;
      
      // Log progress every 5 seconds
      if (attempts % 5 === 0) {
        console.log(`⏳ Still waiting for sync completion... (${attempts}/${maxAttempts})`);
      }
    }
    
    // Timeout - but sync might still be running
    console.log('⏰ Sync request timeout, but sync may still be running in background');
    return { 
      success: true, 
      data: {
        requestId: syncRequest.id,
        status: 'timeout',
        message: 'Sync initiated but completion status unknown (check email list in a few moments)'
      }
    };
    
  } catch (error) {
    console.error('❌ Database sync trigger error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database sync error' 
    };
  }
}

// Alternative: Non-blocking version (fire and forget)
export async function triggerManualSyncNonBlocking(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔄 Triggering manual sync (non-blocking)...');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user:', userError);
      return { 
        success: false, 
        error: 'No authenticated user. Please log in again.' 
      };
    }

    // Insert sync request into database
    const { data: syncRequest, error: insertError } = await supabase
      .from('sync_requests')
      .insert({
        user_id: user.id,
        request_type: 'manual_sync',
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create sync request:', insertError);
      return { 
        success: false, 
        error: `Failed to create sync request: ${insertError.message}` 
      };
    }

    console.log('✅ Sync request created (non-blocking):', syncRequest.id);
    
    return { 
      success: true, 
      data: {
        requestId: syncRequest.id,
        message: 'Sync request submitted successfully. Check email list in a few moments.'
      }
    };
    
  } catch (error) {
    console.error('❌ Database sync trigger error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database sync error' 
    };
  }
}