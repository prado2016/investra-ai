/**
 * Supabase Instance Tracker
 * Development utility to detect and prevent multiple GoTrueClient instances
 */

interface SupabaseInstanceInfo {
  id: string;
  created: number;
  storageKey?: string;
  url?: string;
}

class SupabaseInstanceTracker {
  private instances: Map<string, SupabaseInstanceInfo> = new Map();
  private warningShown = false;

  registerInstance(id: string, storageKey?: string, url?: string): void {
    const instanceInfo: SupabaseInstanceInfo = {
      id,
      created: Date.now(),
      storageKey,
      url
    };

    this.instances.set(id, instanceInfo);

    // Check for multiple instances
    if (this.instances.size > 1 && !this.warningShown) {
      this.showMultipleInstancesWarning();
      this.warningShown = true;
    }
  }

  private showMultipleInstancesWarning(): void {
    console.group('⚠️ Multiple Supabase Instances Detected');
    console.warn('Multiple GoTrueClient instances can cause authentication conflicts.');
    console.table(Array.from(this.instances.values()));
    console.log('💡 Solutions:');
    console.log('  1. Use a singleton pattern for Supabase client creation');
    console.log('  2. Ensure only one client is created per application');
    console.log('  3. Use unique storage keys if multiple clients are necessary');
    console.groupEnd();
  }

  getInstanceCount(): number {
    return this.instances.size;
  }

  getInstances(): SupabaseInstanceInfo[] {
    return Array.from(this.instances.values());
  }

  clearInstances(): void {
    this.instances.clear();
    this.warningShown = false;
  }
}

// Global instance tracker (only in development)
export const supabaseInstanceTracker = new SupabaseInstanceTracker();

// Helper function to register instances
export const registerSupabaseInstance = (
  id: string, 
  storageKey?: string, 
  url?: string
): void => {
  if (import.meta.env.DEV) {
    supabaseInstanceTracker.registerInstance(id, storageKey, url);
  }
};

// Helper to check current instance count
export const getSupabaseInstanceCount = (): number => {
  return supabaseInstanceTracker.getInstanceCount();
};

// Global debug function
if (import.meta.env.DEV) {
  (window as any).__supabaseDebug = {
    getInstances: () => supabaseInstanceTracker.getInstances(),
    getCount: () => supabaseInstanceTracker.getInstanceCount(),
    clear: () => supabaseInstanceTracker.clearInstances()
  };
}
