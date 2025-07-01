/**
 * API endpoint to check sync request status
 * Uses service role to bypass RLS restrictions
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ecbuwhpipphdssqjwgfm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODg3NTg2MSwiZXhwIjoyMDY0NDUxODYxfQ.Tf9CrI7XB9UHcx3FZH5BGu9EmyNS3rX4UIiPuKhU-5I';

const serviceSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function checkSyncStatus(requestId: string, userId: string) {
  try {
    const { data, error } = await serviceSupabase
      .from('sync_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Failed to check sync status:', error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      status: data.status,
      result: data.result,
      processedAt: data.processed_at
    };
    
  } catch (error) {
    console.error('💥 Sync status check failed:', error);
    return { success: false, error: 'Failed to check sync status' };
  }
}

export async function getRecentSyncRequests(userId: string, limit = 5) {
  try {
    const { data, error } = await serviceSupabase
      .from('sync_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to get recent sync requests:', error);
      return { success: false, error: error.message };
    }

    return { success: true, requests: data };
    
  } catch (error) {
    console.error('💥 Recent sync requests fetch failed:', error);
    return { success: false, error: 'Failed to get recent sync requests' };
  }
}