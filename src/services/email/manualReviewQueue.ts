/**
 * Manual Review Queue Service
 * Task 5.4: Create queue system for ambiguous duplicate cases
 */

import type { WealthsimpleEmailData } from './wealthsimpleEmailParser';
import type { EmailIdentification } from './emailIdentificationService';
import type { DuplicateDetectionResult } from './multiLevelDuplicateDetection';
import type { TimeWindowAnalysis } from './timeWindowProcessing';

export interface ReviewQueueItem {
  id: string;
  
  // Email data
  emailData: WealthsimpleEmailData;
  emailIdentification: EmailIdentification;
  
  // Detection results
  duplicateDetectionResult: DuplicateDetectionResult;
  timeWindowAnalysis?: TimeWindowAnalysis;
  
  // Queue metadata
  queuedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-review' | 'approved' | 'rejected' | 'deferred';
  
  // Review details
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  reviewDecision?: 'accept' | 'reject' | 'merge' | 'split';
  
  // Context information
  portfolioId: string;
  potentialDuplicates: {
    emailId?: string;
    transactionId?: string;
    similarity: number;
    reason: string;
  }[];
  
  // Workflow
  escalationLevel: number; // 0 = normal, 1 = escalated, 2 = senior review
  automaticExpiryAt?: string;
  tags: string[];
  
  // Analytics
  processingTime?: number;
  confidence: number;
  riskScore: number;
}

export interface ReviewQueueFilter {
  status?: ReviewQueueItem['status'] | ReviewQueueItem['status'][];
  priority?: ReviewQueueItem['priority'] | ReviewQueueItem['priority'][];
  portfolioId?: string;
  symbol?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  escalationLevel?: number;
  tags?: string[];
  reviewedBy?: string;
  confidence?: {
    min?: number;
    max?: number;
  };
  riskScore?: {
    min?: number;
    max?: number;
  };
}

export interface ReviewQueueStats {
  total: number;
  byStatus: Record<ReviewQueueItem['status'], number>;
  byPriority: Record<ReviewQueueItem['priority'], number>;
  byEscalationLevel: Record<number, number>;
  averageReviewTime: number;
  oldestPendingItem?: string; // ISO date
  queueHealthScore: number; // 0-100
  throughputMetrics: {
    itemsProcessedToday: number;
    itemsAddedToday: number;
    averageProcessingTime: number;
  };
}

export interface ReviewAction {
  action: 'approve' | 'reject' | 'escalate' | 'defer' | 'merge' | 'split';
  reason: string;
  notes?: string;
  reviewerId: string;
  metadata?: Record<string, unknown>;
}

export interface QueueConfiguration {
  maxQueueSize: number;
  autoEscalationThresholds: {
    timeInQueue: number; // milliseconds
    riskScore: number;
  };
  priorityWeights: {
    riskScore: number;
    confidence: number;
    timeInQueue: number;
    duplicateCount: number;
  };
  autoExpiryEnabled: boolean;
  autoExpiryDuration: number; // milliseconds
  notificationSettings: {
    escalationNotifications: boolean;
    queueSizeWarnings: boolean;
    staleItemAlerts: boolean;
  };
}

/**
 * Manual Review Queue Service
 */
export class ManualReviewQueue {
  private static queue: Map<string, ReviewQueueItem> = new Map();
  
  private static readonly DEFAULT_CONFIG: QueueConfiguration = {
    maxQueueSize: 1000,
    autoEscalationThresholds: {
      timeInQueue: 24 * 60 * 60 * 1000, // 24 hours
      riskScore: 0.8
    },
    priorityWeights: {
      riskScore: 0.4,
      confidence: 0.3,
      timeInQueue: 0.2,
      duplicateCount: 0.1
    },
    autoExpiryEnabled: false,
    autoExpiryDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    notificationSettings: {
      escalationNotifications: true,
      queueSizeWarnings: true,
      staleItemAlerts: true
    }
  };

  /**
   * Add item to review queue
   */
  static async addToQueue(
    emailData: WealthsimpleEmailData,
    emailIdentification: EmailIdentification,
    duplicateDetectionResult: DuplicateDetectionResult,
    portfolioId: string,
    timeWindowAnalysis?: TimeWindowAnalysis
  ): Promise<ReviewQueueItem> {
    const id = this.generateQueueId();
    const queuedAt = new Date().toISOString();
    
    // Calculate priority and risk score
    const priority = this.calculatePriority(duplicateDetectionResult, timeWindowAnalysis);
    const riskScore = this.calculateRiskScore(duplicateDetectionResult, timeWindowAnalysis);
    const confidence = duplicateDetectionResult.overallConfidence;
    
    // Extract potential duplicates from detection result
    const potentialDuplicates = duplicateDetectionResult.matches.map(match => ({
      emailId: match.existingIdentification?.emailHash,
      transactionId: match.existingTransaction?.id,
      similarity: match.confidence,
      reason: match.reasons.join('; ')
    }));
    
    // Generate tags
    const tags = this.generateTags(emailData, duplicateDetectionResult, timeWindowAnalysis);
    
    // Set automatic expiry if enabled
    const automaticExpiryAt = this.DEFAULT_CONFIG.autoExpiryEnabled
      ? new Date(Date.now() + this.DEFAULT_CONFIG.autoExpiryDuration).toISOString()
      : undefined;
    
    const queueItem: ReviewQueueItem = {
      id,
      emailData,
      emailIdentification,
      duplicateDetectionResult,
      timeWindowAnalysis,
      queuedAt,
      priority,
      status: 'pending',
      portfolioId,
      potentialDuplicates,
      escalationLevel: 0,
      automaticExpiryAt,
      tags,
      confidence,
      riskScore
    };
    
    // Check queue capacity
    if (this.queue.size >= this.DEFAULT_CONFIG.maxQueueSize) {
      await this.processOldestLowPriorityItem();
    }
    
    this.queue.set(id, queueItem);
    
    // Check for automatic escalation
    await this.checkAutoEscalation(queueItem);
    
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 Added item ${id} to review queue (Priority: ${priority}, Risk: ${riskScore.toFixed(2)})`);
    }
    
    return queueItem;
  }

  /**
   * Get queue items with filtering and sorting
   */
  static getQueueItems(
    filter?: ReviewQueueFilter,
    sortBy?: keyof ReviewQueueItem,
    sortOrder: 'asc' | 'desc' = 'desc',
    limit?: number,
    offset?: number
  ): ReviewQueueItem[] {
    let items = Array.from(this.queue.values());
    
    // Apply filters
    if (filter) {
      items = this.applyFilters(items, filter);
    }
    
    // Apply sorting
    if (sortBy) {
      items.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
      });
    } else {
      // Default sort by priority and queued time
      items.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // Then by queued time (oldest first)
        return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
      });
    }
    
    // Apply pagination
    if (offset !== undefined) {
      items = items.slice(offset);
    }
    
    if (limit !== undefined) {
      items = items.slice(0, limit);
    }
    
    return items;
  }

  /**
   * Get queue item by ID
   */
  static getQueueItem(id: string): ReviewQueueItem | null {
    return this.queue.get(id) || null;
  }

  /**
   * Process review action
   */
  static async processReviewAction(
    itemId: string,
    action: ReviewAction
  ): Promise<{ success: boolean; item?: ReviewQueueItem; error?: string }> {
    const item = this.queue.get(itemId);
    
    if (!item) {
      return { success: false, error: 'Queue item not found' };
    }
    
    if (item.status !== 'pending' && item.status !== 'in-review') {
      return { success: false, error: 'Item is not available for review' };
    }
    
    const now = new Date().toISOString();
    const reviewTime = item.status === 'in-review' 
      ? Date.now() - new Date(item.queuedAt).getTime()
      : undefined;
    
    // Update item based on action
    switch (action.action) {
      case 'approve':
        item.status = 'approved';
        item.reviewDecision = 'accept';
        break;
        
      case 'reject':
        item.status = 'rejected';
        item.reviewDecision = 'reject';
        break;
        
      case 'escalate':
        item.escalationLevel += 1;
        item.status = 'pending'; // Back to pending for higher level review
        break;
        
      case 'defer':
        item.status = 'deferred';
        // Set new expiry date
        item.automaticExpiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        break;
        
      case 'merge':
        item.status = 'approved';
        item.reviewDecision = 'merge';
        break;
        
      case 'split':
        item.status = 'approved';
        item.reviewDecision = 'split';
        break;
    }
    
    // Update review metadata
    item.reviewedBy = action.reviewerId;
    item.reviewedAt = now;
    item.reviewNotes = action.notes;
    item.processingTime = reviewTime;
    
    // Add action-specific tags
    if (action.action === 'escalate') {
      item.tags.push(`escalated-level-${item.escalationLevel}`);
    }
    
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Processed review action: ${action.action} for item ${itemId} by ${action.reviewerId}`);
    }
    
    return { success: true, item };
  }

  /**
   * Set item status to in-review
   */
  static async claimForReview(itemId: string, reviewerId: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    
    if (!item || item.status !== 'pending') {
      return false;
    }
    
    item.status = 'in-review';
    item.reviewedBy = reviewerId;
    
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 Item ${itemId} claimed for review by ${reviewerId}`);
    }
    
    return true;
  }

  /**
   * Release item from review (back to pending)
   */
  static async releaseFromReview(itemId: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    
    if (!item || item.status !== 'in-review') {
      return false;
    }
    
    item.status = 'pending';
    item.reviewedBy = undefined;
    
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Item ${itemId} released back to pending status`);
    }
    
    return true;
  }

  /**
   * Remove item from queue
   */
  static async removeFromQueue(itemId: string, reason: string): Promise<boolean> {
    const item = this.queue.get(itemId);
    
    if (!item) {
      return false;
    }
    
    this.queue.delete(itemId);
    
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗑️ Removed item ${itemId} from queue. Reason: ${reason}`);
    }
    
    return true;
  }

  /**
   * Get queue statistics
   */
  static getQueueStats(): ReviewQueueStats {
    const items = Array.from(this.queue.values());
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    // Count by status
    const byStatus = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<ReviewQueueItem['status'], number>);
    
    // Count by priority
    const byPriority = items.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<ReviewQueueItem['priority'], number>);
    
    // Count by escalation level
    const byEscalationLevel = items.reduce((acc, item) => {
      acc[item.escalationLevel] = (acc[item.escalationLevel] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    // Calculate average review time
    const reviewedItems = items.filter(item => item.processingTime !== undefined);
    const averageReviewTime = reviewedItems.length > 0
      ? reviewedItems.reduce((sum, item) => sum + (item.processingTime || 0), 0) / reviewedItems.length
      : 0;
    
    // Find oldest pending item
    const pendingItems = items.filter(item => item.status === 'pending');
    const oldestPendingItem = pendingItems.length > 0
      ? pendingItems.sort((a, b) => 
          new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
        )[0].queuedAt
      : undefined;
    
    // Throughput metrics
    const itemsProcessedToday = items.filter(item => 
      item.reviewedAt && new Date(item.reviewedAt).getTime() >= todayStart
    ).length;
    
    const itemsAddedToday = items.filter(item => 
      new Date(item.queuedAt).getTime() >= todayStart
    ).length;
    
    const processedItemsWithTime = items.filter(item => 
      item.processingTime !== undefined &&
      item.reviewedAt && new Date(item.reviewedAt).getTime() >= todayStart
    );
    
    const averageProcessingTime = processedItemsWithTime.length > 0
      ? processedItemsWithTime.reduce((sum, item) => sum + (item.processingTime || 0), 0) / processedItemsWithTime.length
      : 0;
    
    // Calculate queue health score (0-100)
    const queueHealthScore = this.calculateQueueHealthScore(items, now);
    
    return {
      total: items.length,
      byStatus: {
        pending: byStatus.pending || 0,
        'in-review': byStatus['in-review'] || 0,
        approved: byStatus.approved || 0,
        rejected: byStatus.rejected || 0,
        deferred: byStatus.deferred || 0
      },
      byPriority: {
        low: byPriority.low || 0,
        medium: byPriority.medium || 0,
        high: byPriority.high || 0,
        urgent: byPriority.urgent || 0
      },
      byEscalationLevel,
      averageReviewTime,
      oldestPendingItem,
      queueHealthScore,
      throughputMetrics: {
        itemsProcessedToday,
        itemsAddedToday,
        averageProcessingTime
      }
    };
  }

  /**
   * Process expired items
   */
  static async processExpiredItems(): Promise<number> {
    const now = new Date().toISOString();
    const expiredItems = Array.from(this.queue.values()).filter(item => 
      item.automaticExpiryAt && item.automaticExpiryAt <= now && item.status === 'pending'
    );
    
    for (const item of expiredItems) {
      await this.processReviewAction(item.id, {
        action: 'approve', // Auto-approve expired items
        reason: 'Automatic approval due to expiry',
        notes: 'Item expired without manual review',
        reviewerId: 'system'
      });
    }
    
    if (expiredItems.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`⏰ Processed ${expiredItems.length} expired queue items`);
    }
    
    return expiredItems.length;
  }

  /**
   * Calculate priority based on detection results
   */
  private static calculatePriority(
    detectionResult: DuplicateDetectionResult,
    timeWindowAnalysis?: TimeWindowAnalysis
  ): ReviewQueueItem['priority'] {
    let score = 0;
    
    // Base score from confidence
    score += detectionResult.overallConfidence * 0.4;
    
    // Risk level impact
    switch (detectionResult.riskLevel) {
      case 'critical': score += 0.4; break;
      case 'high': score += 0.3; break;
      case 'medium': score += 0.2; break;
      case 'low': score += 0.1; break;
    }
    
    // Time window analysis
    if (timeWindowAnalysis) {
      switch (timeWindowAnalysis.duplicateRisk) {
        case 'critical': score += 0.2; break;
        case 'high': score += 0.15; break;
        case 'medium': score += 0.1; break;
        case 'low': score += 0.05; break;
      }
    }
    
    // Determine priority
    if (score >= 0.8) return 'urgent';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculate risk score
   */
  private static calculateRiskScore(
    detectionResult: DuplicateDetectionResult,
    timeWindowAnalysis?: TimeWindowAnalysis
  ): number {
    let score = detectionResult.overallConfidence * 0.6;
    
    if (timeWindowAnalysis) {
      const timeRiskScore = timeWindowAnalysis.duplicateRisk === 'critical' ? 0.4 :
                           timeWindowAnalysis.duplicateRisk === 'high' ? 0.3 :
                           timeWindowAnalysis.duplicateRisk === 'medium' ? 0.2 : 0.1;
      score += timeRiskScore * 0.4;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate tags for queue item
   */
  private static generateTags(
    emailData: WealthsimpleEmailData,
    detectionResult: DuplicateDetectionResult,
    timeWindowAnalysis?: TimeWindowAnalysis
  ): string[] {
    const tags: string[] = [];
    
    // Symbol tag
    tags.push(`symbol:${emailData.symbol}`);
    
    // Transaction type tag
    tags.push(`type:${emailData.transactionType}`);
    
    // Account type tag
    tags.push(`account:${emailData.accountType}`);
    
    // Risk level tag
    tags.push(`risk:${detectionResult.riskLevel}`);
    
    // Detection level tags
    detectionResult.matches.forEach(match => {
      tags.push(`level-${match.level.level}:${(match.confidence * 100).toFixed(0)}%`);
    });
    
    // Time window tags
    if (timeWindowAnalysis) {
      if (timeWindowAnalysis.withinWindows.sameSecond) tags.push('same-second');
      if (timeWindowAnalysis.withinWindows.sameMinute) tags.push('same-minute');
      if (timeWindowAnalysis.withinWindows.rapidTrading) tags.push('rapid-trading');
      if (timeWindowAnalysis.withinWindows.partialFill) tags.push('partial-fill');
      if (timeWindowAnalysis.withinWindows.splitOrder) tags.push('split-order');
    }
    
    // Confidence tag
    const confidenceLevel = detectionResult.overallConfidence >= 0.8 ? 'high' :
                           detectionResult.overallConfidence >= 0.6 ? 'medium' : 'low';
    tags.push(`confidence:${confidenceLevel}`);
    
    return tags;
  }

  /**
   * Apply filters to items
   */
  private static applyFilters(items: ReviewQueueItem[], filter: ReviewQueueFilter): ReviewQueueItem[] {
    return items.filter(item => {
      // Status filter
      if (filter.status) {
        const statusArray = Array.isArray(filter.status) ? filter.status : [filter.status];
        if (!statusArray.includes(item.status)) return false;
      }
      
      // Priority filter
      if (filter.priority) {
        const priorityArray = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        if (!priorityArray.includes(item.priority)) return false;
      }
      
      // Portfolio filter
      if (filter.portfolioId && item.portfolioId !== filter.portfolioId) return false;
      
      // Symbol filter
      if (filter.symbol && item.emailData.symbol !== filter.symbol) return false;
      
      // Date range filter
      if (filter.dateRange) {
        const itemDate = new Date(item.queuedAt);
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);
        if (itemDate < startDate || itemDate > endDate) return false;
      }
      
      // Escalation level filter
      if (filter.escalationLevel !== undefined && item.escalationLevel !== filter.escalationLevel) return false;
      
      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const hasAllTags = filter.tags.every(tag => item.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      
      // Reviewer filter
      if (filter.reviewedBy && item.reviewedBy !== filter.reviewedBy) return false;
      
      // Confidence filter
      if (filter.confidence) {
        if (filter.confidence.min !== undefined && item.confidence < filter.confidence.min) return false;
        if (filter.confidence.max !== undefined && item.confidence > filter.confidence.max) return false;
      }
      
      // Risk score filter
      if (filter.riskScore) {
        if (filter.riskScore.min !== undefined && item.riskScore < filter.riskScore.min) return false;
        if (filter.riskScore.max !== undefined && item.riskScore > filter.riskScore.max) return false;
      }
      
      return true;
    });
  }

  /**
   * Check for automatic escalation
   */
  private static async checkAutoEscalation(item: ReviewQueueItem): Promise<void> {
    const { timeInQueue, riskScore } = this.DEFAULT_CONFIG.autoEscalationThresholds;
    const timeInQueueMs = Date.now() - new Date(item.queuedAt).getTime();
    
    if (timeInQueueMs >= timeInQueue || item.riskScore >= riskScore) {
      await this.processReviewAction(item.id, {
        action: 'escalate',
        reason: 'Automatic escalation due to time in queue or high risk score',
        reviewerId: 'system'
      });
    }
  }

  /**
   * Process oldest low priority item to make room
   */
  private static async processOldestLowPriorityItem(): Promise<void> {
    const lowPriorityItems = Array.from(this.queue.values())
      .filter(item => item.priority === 'low' && item.status === 'pending')
      .sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime());
    
    if (lowPriorityItems.length > 0) {
      const oldestItem = lowPriorityItems[0];
      await this.processReviewAction(oldestItem.id, {
        action: 'approve',
        reason: 'Auto-approved to make room in queue',
        reviewerId: 'system'
      });
    }
  }

  /**
   * Calculate queue health score
   */
  private static calculateQueueHealthScore(items: ReviewQueueItem[], now: number): number {
    if (items.length === 0) return 100;
    
    let score = 100;
    
    // Penalize for queue size
    const queueSizePenalty = Math.min(50, (items.length / this.DEFAULT_CONFIG.maxQueueSize) * 50);
    score -= queueSizePenalty;
    
    // Penalize for old items
    const pendingItems = items.filter(item => item.status === 'pending');
    const oldItems = pendingItems.filter(item => 
      now - new Date(item.queuedAt).getTime() > 24 * 60 * 60 * 1000
    );
    const oldItemsPenalty = Math.min(30, (oldItems.length / pendingItems.length) * 30);
    score -= oldItemsPenalty;
    
    // Penalize for high escalation levels
    const escalatedItems = items.filter(item => item.escalationLevel > 0);
    const escalationPenalty = Math.min(20, (escalatedItems.length / items.length) * 20);
    score -= escalationPenalty;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Generate unique queue ID
   */
  private static generateQueueId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear queue (for testing)
   */
  static clearQueue(): void {
    this.queue.clear();
    // Log for development debugging - replace with proper logging in production
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Queue cleared');
    }
  }
}

export default ManualReviewQueue;