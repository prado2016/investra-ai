/**
 * Dynamic Provider Selector
 * Intelligently selects the best AI provider based on real-time health metrics,
 * availability, quota remaining, and context-specific requirements
 */

import type { AIProvider } from '../../types/ai';
import { providerHealthMonitor, type ProviderHealthMetrics } from './providerHealthMonitor';
import { ApiKeyStorage } from '../../utils/apiKeyStorage';

export interface ProviderSelectionContext {
  useCase: 'symbol_lookup' | 'email_parsing' | 'financial_analysis' | 'general';
  urgency: 'low' | 'medium' | 'high';
  maxResponseTime?: number; // in milliseconds
  preferredProvider?: AIProvider;
  fallbackEnabled?: boolean;
  costSensitive?: boolean;
}

export interface ProviderScore {
  provider: AIProvider;
  score: number; // 0-1, higher is better
  reasons: string[];
  health: ProviderHealthMetrics;
  available: boolean;
}

export class DynamicProviderSelector {
  private static instance: DynamicProviderSelector;
  private healthMonitor = providerHealthMonitor;

  // Weights for different scoring criteria (must sum to 1.0)
  private readonly SCORING_WEIGHTS = {
    availability: 0.35,    // 35% - Can the provider handle requests?
    quota: 0.25,          // 25% - How much quota remains?
    performance: 0.20,    // 20% - How fast does it respond?
    cost: 0.10,          // 10% - How cost-efficient is it?
    reliability: 0.10     // 10% - Recent failure patterns
  };

  // Context-specific provider preferences
  private readonly CONTEXT_PREFERENCES = {
    symbol_lookup: {
      preferredProviders: ['gemini', 'openrouter'] as AIProvider[],
      minPerformanceScore: 0.7,
      maxResponseTime: 5000
    },
    email_parsing: {
      preferredProviders: ['gemini', 'openrouter'] as AIProvider[],
      minPerformanceScore: 0.5,
      maxResponseTime: 15000
    },
    financial_analysis: {
      preferredProviders: ['gemini', 'openai'] as AIProvider[],
      minPerformanceScore: 0.6,
      maxResponseTime: 20000
    },
    general: {
      preferredProviders: ['gemini', 'openrouter', 'openai'] as AIProvider[],
      minPerformanceScore: 0.5,
      maxResponseTime: 10000
    }
  };

  private constructor() {}

  static getInstance(): DynamicProviderSelector {
    if (!DynamicProviderSelector.instance) {
      DynamicProviderSelector.instance = new DynamicProviderSelector();
    }
    return DynamicProviderSelector.instance;
  }

  /**
   * Select the best provider based on context and current health metrics
   */
  async selectBestProvider(
    context: ProviderSelectionContext,
    availableServices: Set<AIProvider>
  ): Promise<AIProvider | null> {
    // Get user's preferred provider first
    const userDefault = this.getUserDefaultProvider();
    
    // If user has a strong preference and it's available and healthy, use it
    if (context.preferredProvider) {
      if (availableServices.has(context.preferredProvider) && 
          this.healthMonitor.isProviderHealthy(context.preferredProvider)) {
        return context.preferredProvider;
      }
    }

    // Check user default if it's healthy
    if (userDefault && 
        availableServices.has(userDefault) && 
        this.healthMonitor.isProviderHealthy(userDefault)) {
      return userDefault;
    }

    // Score all available providers
    const providerScores = await this.scoreProviders(context, availableServices);
    
    if (providerScores.length === 0) {
      return null;
    }

    // Sort by score (highest first)
    providerScores.sort((a, b) => b.score - a.score);

    // Log the selection reasoning
    this.logSelectionReasoning(context, providerScores);

    return providerScores[0].provider;
  }

  /**
   * Get a fallback provider if the primary fails
   */
  async getFallbackProvider(
    failedProvider: AIProvider,
    context: ProviderSelectionContext,
    availableServices: Set<AIProvider>
  ): Promise<AIProvider | null> {
    // Record the failure
    this.healthMonitor.recordFailure(
      failedProvider, 
      'Provider selection fallback triggered',
      false
    );

    // Remove the failed provider from consideration
    const remainingServices = new Set(availableServices);
    remainingServices.delete(failedProvider);

    if (remainingServices.size === 0) {
      return null;
    }

    // Select from remaining providers with higher urgency
    const fallbackContext: ProviderSelectionContext = {
      ...context,
      urgency: 'high',
      preferredProvider: undefined // Don't prefer the failed one
    };

    return this.selectBestProvider(fallbackContext, remainingServices);
  }

  /**
   * Score all available providers based on context and health metrics
   */
  private async scoreProviders(
    context: ProviderSelectionContext,
    availableServices: Set<AIProvider>
  ): Promise<ProviderScore[]> {
    const scores: ProviderScore[] = [];
    const contextPrefs = this.CONTEXT_PREFERENCES[context.useCase];

    console.log(`🎯 Scoring ${availableServices.size} providers for ${context.useCase}`);

    for (const provider of availableServices) {
      const health = this.healthMonitor.getProviderHealth(provider);
      if (!health) {
        console.log(`⚠️ No health data for provider: ${provider}`);
        continue;
      }

      const score = this.calculateProviderScore(provider, health, context);
      const reasons = this.getScoreReasons(provider, health, context);

      // Check minimum requirements
      const meetsRequirements = this.checkMinimumRequirements(
        provider, 
        health, 
        context, 
        contextPrefs
      );

      console.log(`📊 ${provider}: score=${(score * 100).toFixed(1)}%, meets requirements=${meetsRequirements}, reasons=[${reasons.join(', ')}]`);

      scores.push({
        provider,
        score: meetsRequirements ? score : 0,
        reasons,
        health,
        available: meetsRequirements
      });
    }

    const availableScores = scores.filter(s => s.available);
    console.log(`✅ ${availableScores.length} providers meet requirements out of ${scores.length} total`);

    return availableScores;
  }

  /**
   * Calculate overall score for a provider
   */
  private calculateProviderScore(
    provider: AIProvider,
    health: ProviderHealthMetrics,
    context: ProviderSelectionContext
  ): number {
    let score = 0;

    // Availability score
    score += health.availability * this.SCORING_WEIGHTS.availability;

    // Quota remaining score
    score += health.quotaRemaining * this.SCORING_WEIGHTS.quota;

    // Performance score (adjusted for context)
    let performanceScore = health.performance;
    if (context.maxResponseTime && health.averageResponseTime > 0) {
      const timeScore = Math.max(0, 1 - (health.averageResponseTime / context.maxResponseTime));
      performanceScore = Math.min(performanceScore, timeScore);
    }
    score += performanceScore * this.SCORING_WEIGHTS.performance;

    // Cost score (inverted - lower cost is better)
    const costScore = context.costSensitive ? 1 - health.cost : 0.5;
    score += costScore * this.SCORING_WEIGHTS.cost;

    // Reliability score (based on recent failures)
    const reliabilityScore = Math.max(0, 1 - (health.consecutiveFailures / 10));
    score += reliabilityScore * this.SCORING_WEIGHTS.reliability;

    // Context-specific bonuses
    score += this.getContextBonus(provider, context);

    // Urgency adjustments
    if (context.urgency === 'high' && health.availability > 0.8) {
      score += 0.1; // Bonus for high availability when urgent
    }

    return Math.min(1.0, Math.max(0, score));
  }

  /**
   * Get context-specific bonus points
   */
  private getContextBonus(provider: AIProvider, context: ProviderSelectionContext): number {
    const preferences = this.CONTEXT_PREFERENCES[context.useCase];
    const index = preferences.preferredProviders.indexOf(provider);
    
    if (index === -1) return 0;
    
    // Give decreasing bonus based on preference order
    return (preferences.preferredProviders.length - index) * 0.02;
  }

  /**
   * Check if provider meets minimum requirements
   */
  private checkMinimumRequirements(
    provider: AIProvider,
    health: ProviderHealthMetrics,
    context: ProviderSelectionContext,
    contextPrefs: typeof this.CONTEXT_PREFERENCES[keyof typeof this.CONTEXT_PREFERENCES]
  ): boolean {
    // Check basic health
    if (!this.healthMonitor.isProviderHealthy(provider)) {
      return false;
    }

    // For providers with no usage history, be more lenient
    if (health.totalRequests === 0) {
      // Only check quota for new providers
      return health.quotaRemaining > 0.05;
    }

    // Check performance requirements for providers with history
    if (health.performance < contextPrefs.minPerformanceScore) {
      return false;
    }

    // Check response time requirements
    if (context.maxResponseTime && 
        health.averageResponseTime > 0 &&
        health.averageResponseTime > context.maxResponseTime) {
      return false;
    }

    // Check if quota is available
    if (health.quotaRemaining < 0.05) { // Less than 5% quota remaining
      return false;
    }

    return true;
  }

  /**
   * Generate human-readable reasons for the score
   */
  private getScoreReasons(
    provider: AIProvider,
    health: ProviderHealthMetrics,
    context: ProviderSelectionContext
  ): string[] {
    const reasons: string[] = [];

    if (health.availability > 0.9) {
      reasons.push('High availability (>90%)');
    } else if (health.availability < 0.7) {
      reasons.push('Low availability (<70%)');
    }

    if (health.quotaRemaining > 0.8) {
      reasons.push('Plenty of quota remaining');
    } else if (health.quotaRemaining < 0.2) {
      reasons.push('Low quota remaining');
    }

    if (health.performance > 0.8) {
      reasons.push('Fast response times');
    } else if (health.performance < 0.5) {
      reasons.push('Slow response times');
    }

    if (health.consecutiveFailures > 0) {
      reasons.push(`${health.consecutiveFailures} recent failures`);
    }

    const preferences = this.CONTEXT_PREFERENCES[context.useCase];
    if (preferences.preferredProviders.includes(provider)) {
      const rank = preferences.preferredProviders.indexOf(provider) + 1;
      reasons.push(`Preferred for ${context.useCase} (rank #${rank})`);
    }

    return reasons;
  }

  /**
   * Log the selection reasoning for debugging
   */
  private logSelectionReasoning(
    context: ProviderSelectionContext,
    scores: ProviderScore[]
  ): void {
    console.log(`🤖 AI Provider Selection for ${context.useCase}:`);
    
    scores.forEach((score, index) => {
      const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${emoji} ${score.provider}: ${(score.score * 100).toFixed(1)}% - ${score.reasons.join(', ')}`);
    });
  }

  /**
   * Get user's default provider preference
   */
  private getUserDefaultProvider(): AIProvider | null {
    try {
      return ApiKeyStorage.getDefaultProvider() as AIProvider;
    } catch (error) {
      console.warn('Failed to get user default provider:', error);
      return null;
    }
  }

  /**
   * Update provider selection weights (for future customization)
   */
  updateScoringWeights(weights: Partial<typeof this.SCORING_WEIGHTS>): void {
    Object.assign(this.SCORING_WEIGHTS, weights);
    
    // Ensure weights sum to 1.0
    const total = Object.values(this.SCORING_WEIGHTS).reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      console.warn('Provider scoring weights do not sum to 1.0:', total);
    }
  }

  /**
   * Get current provider rankings for a specific context
   */
  async getProviderRankings(
    context: ProviderSelectionContext,
    availableServices: Set<AIProvider>
  ): Promise<ProviderScore[]> {
    const scores = await this.scoreProviders(context, availableServices);
    return scores.sort((a, b) => b.score - a.score);
  }
}

// Export singleton instance
export const dynamicProviderSelector = DynamicProviderSelector.getInstance();
export default dynamicProviderSelector;