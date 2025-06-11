/**
 * Request Debouncing Utility
 * Prevents duplicate/rapid API calls by debouncing requests
 */

type DebouncedFunction<T extends (...args: unknown[]) => Promise<unknown>> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDebouncer {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private defaultDelay: number;

  constructor(defaultDelay: number = 500) {
    this.defaultDelay = defaultDelay;
  }

  /**
   * Debounce a function call by key
   */
  debounce<T extends (...args: unknown[]) => Promise<unknown>>(
    key: string,
    fn: T,
    delay: number = this.defaultDelay
  ): DebouncedFunction<T> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const now = Date.now();
      const pending = this.pendingRequests.get(key);

      // If there's a recent pending request, return that promise
      if (pending && (now - pending.timestamp) < delay) {
        console.log(`🔄 Debouncing duplicate request: ${key}`);
        return pending.promise as ReturnType<T>;
      }

      // Create new request
      const promise = fn(...args);
      this.pendingRequests.set(key, {
        promise,
        timestamp: now
      });

      // Clean up after completion
      promise.finally(() => {
        const current = this.pendingRequests.get(key);
        if (current && current.timestamp === now) {
          this.pendingRequests.delete(key);
        }
      });

      return promise;
    };
  }

  /**
   * Clear pending request for a key
   */
  clear(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Global request debouncer
export const requestDebouncer = new RequestDebouncer(1000); // 1 second debounce

export { RequestDebouncer };
