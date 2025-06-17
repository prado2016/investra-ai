/**
 * Debug utility for position calculation issues
 * This utility helps debug position synchronization problems
 * 
 * NOTE: Temporarily disabled due to TypeScript issues
 */

export class PositionDebugger {
  static async findOrphanedPositions() {
    console.log('PositionDebugger temporarily disabled');
    return { orphaned: [], summary: 'Debugger disabled' };
  }

  static async cleanupOrphanedPositions() {
    console.log('PositionDebugger temporarily disabled');
    return { success: true, deleted: 0 };
  }

  static async validatePositions() {
    console.log('PositionDebugger temporarily disabled');
    return { valid: true, issues: [] };
  }
}

// Make debugger available in browser console for manual debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).PositionDebugger = PositionDebugger;
}