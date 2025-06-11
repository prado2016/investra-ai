/**
 * Emergency Stop Mechanism
 * Provides a circuit breaker for runaway API calls
 */

class EmergencyStop {
  private isActive = false;
  private activatedAt = 0;
  private reason = '';

  /**
   * Activate emergency stop
   */
  activate(reason: string): void {
    this.isActive = true;
    this.activatedAt = Date.now();
    this.reason = reason;
    console.error(`🛑 EMERGENCY STOP ACTIVATED: ${reason}`);
  }

  /**
   * Deactivate emergency stop
   */
  deactivate(): void {
    this.isActive = false;
    this.activatedAt = 0;
    this.reason = '';
    console.log('✅ Emergency stop deactivated');
  }

  /**
   * Check if emergency stop is active
   */
  isBlocked(): boolean {
    return this.isActive;
  }

  /**
   * Get emergency stop status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      reason: this.reason,
      activatedAt: this.activatedAt,
      duration: this.isActive ? Date.now() - this.activatedAt : 0
    };
  }

  /**
   * Auto-deactivate after timeout
   */
  autoDeactivate(timeoutMs: number = 300000): void { // 5 minutes default
    if (this.isActive) {
      setTimeout(() => {
        if (this.isActive && Date.now() - this.activatedAt >= timeoutMs) {
          this.deactivate();
        }
      }, timeoutMs);
    }
  }
}

// Global emergency stop
export const emergencyStop = new EmergencyStop();

// Add global controls for debugging
(window as any).__emergencyStop = {
  activate: (reason: string) => emergencyStop.activate(reason),
  deactivate: () => emergencyStop.deactivate(),
  status: () => emergencyStop.getStatus()
};
