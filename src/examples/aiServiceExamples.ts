/**
 * AI Services Usage Examples
 * Task 18: Gemini AI Service Layer Integration
 */

import { aiServiceManager } from '../services/ai';
import type { SymbolLookupRequest, FinancialAnalysisRequest } from '../types/ai';

/**
 * Example 1: Initialize AI Service and Perform Symbol Lookup
 */
export async function exampleSymbolLookup() {
  try {
    // Initialize Gemini AI service
    const initialized = await aiServiceManager.initializeService('gemini', {
      // API key will be loaded from storage automatically
      model: 'gemini-1.5-flash',
      temperature: 0.1,
      enableCaching: true
    });

    if (!initialized) {
      console.error('Failed to initialize AI service');
      return;
    }

    // Perform symbol lookup
    const lookupRequest: SymbolLookupRequest = {
      query: 'Apple technology company stock',
      maxResults: 5,
      includeAnalysis: true,
      context: 'Looking for major tech stock symbols'
    };

    const response = await aiServiceManager.lookupSymbols(lookupRequest, 'gemini');

    if (response.success) {
      console.log('Symbol lookup results:');
      response.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.symbol} - ${result.name}`);
        console.log(`   Exchange: ${result.exchange}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Asset Type: ${result.assetType}`);
        if (result.sector) console.log(`   Sector: ${result.sector}`);
        console.log('');
      });
    } else {
      console.error('Symbol lookup failed:', response.error);
    }

    return response;
  } catch (error) {
    console.error('Example failed:', error);
  }
}

/**
 * Example 2: Financial Data Analysis
 */
export async function exampleFinancialAnalysis() {
  try {
    // Ensure service is initialized
    await aiServiceManager.initializeService('gemini');

    // Sample financial data for analysis
    const analysisRequest: FinancialAnalysisRequest = {
      symbol: 'AAPL',
      data: {
        prices: [150.25, 152.10, 149.80, 153.45, 151.90, 154.20, 152.75],
        volumes: [45000000, 52000000, 38000000, 61000000, 47000000, 55000000, 49000000],
        marketData: {
          marketCap: 2500000000000, // $2.5T
          peRatio: 28.5,
          dividendYield: 0.46,
          beta: 1.21,
          eps: 5.89
        },
        newsData: [
          'Apple reports strong Q4 earnings',
          'New iPhone launch exceeds expectations',
          'Services revenue continues to grow'
        ]
      },
      analysisType: 'trend',
      timeframe: '1W'
    };

    const response = await aiServiceManager.analyzeFinancialData(analysisRequest, 'gemini');

    if (response.success && response.result) {
      const result = response.result;
      console.log('Financial Analysis Results:');
      console.log(`Symbol: ${result.symbol}`);
      console.log(`Analysis Type: ${result.analysisType}`);
      console.log(`Score: ${result.score}/10`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Risk Level: ${result.riskLevel}`);
      console.log(`Timeframe: ${result.timeframe}`);
      
      console.log('\nKey Insights:');
      result.insights.forEach((insight, index) => {
        console.log(`${index + 1}. ${insight}`);
      });
      
      console.log('\nRecommendations:');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
      if (response.tokensUsed) {
        console.log(`\nTokens used: ${response.tokensUsed}`);
      }
      if (response.processingTime) {
        console.log(`Processing time: ${response.processingTime}ms`);
      }
    } else {
      console.error('Financial analysis failed:', response.error);
    }

    return response;
  } catch (error) {
    console.error('Example failed:', error);
  }
}

/**
 * Example 3: Multiple Provider Comparison
 */
export async function exampleMultiProviderComparison() {
  try {
    // Initialize multiple providers (in real app, you'd have different API keys)
    const providers = ['gemini'] as const; // Only Gemini implemented for now
    
    for (const provider of providers) {
      await aiServiceManager.initializeService(provider);
    }

    const query = 'Tesla electric vehicle stock';
    const results: Record<string, any> = {};

    // Test each provider
    for (const provider of providers) {
      console.log(`\nTesting ${provider}...`);
      
      const lookupRequest: SymbolLookupRequest = {
        query,
        maxResults: 3
      };

      const startTime = Date.now();
      const response = await aiServiceManager.lookupSymbols(lookupRequest, provider);
      const endTime = Date.now();

      results[provider] = {
        success: response.success,
        resultCount: response.results?.length || 0,
        responseTime: endTime - startTime,
        error: response.error,
        tokensUsed: response.tokensUsed
      };

      console.log(`${provider} results:`, results[provider]);
    }

    return results;
  } catch (error) {
    console.error('Example failed:', error);
  }
}

/**
 * Example 4: Health Monitoring and Cache Management
 */
export async function exampleHealthMonitoring() {
  try {
    // Get health status of all services
    const healthStatus = await aiServiceManager.getHealthStatus();
    
    console.log('AI Services Health Status:');
    for (const [provider, status] of Object.entries(healthStatus)) {
      console.log(`\n${provider}:`);
      console.log(`  Configured: ${status.configured}`);
      console.log(`  Connected: ${status.connected}`);
      
      if (status.rateLimit) {
        console.log(`  Rate Limit: ${status.rateLimit.requestsThisHour}/${status.rateLimit.maxRequestsPerHour} (hourly)`);
        console.log(`  Rate Limit: ${status.rateLimit.requestsToday}/${status.rateLimit.maxRequestsPerDay} (daily)`);
      }
      
      if (status.cache) {
        console.log(`  Cache Hit Rate: ${(status.cache.hitRate * 100).toFixed(1)}%`);
        console.log(`  Cache Entries: ${status.cache.entriesCount}`);
        console.log(`  Cache Memory: ${(status.cache.memoryUsage / 1024).toFixed(1)} KB`);
      }
      
      if (status.latency) {
        console.log(`  Connection Latency: ${status.latency}ms`);
      }
      
      if (status.error) {
        console.log(`  Error: ${status.error}`);
      }
    }

    // Test connections
    console.log('\nTesting connections...');
    const connectionResults = await aiServiceManager.testAllConnections();
    
    for (const [provider, result] of Object.entries(connectionResults)) {
      console.log(`${provider}: ${result.success ? '✓' : '✗'} ${result.latency ? `(${result.latency}ms)` : ''}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    }

    // Get usage metrics
    console.log('\nUsage metrics (last 24h):');
    const metrics = await aiServiceManager.getAggregatedUsageMetrics('24h');
    
    const groupedMetrics = metrics.reduce((acc, metric) => {
      const key = `${metric.provider}_${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = {
          provider: metric.provider,
          endpoint: metric.endpoint,
          totalRequests: 0,
          totalTokens: 0,
          totalErrors: 0,
          avgResponseTime: 0
        };
      }
      
      acc[key].totalRequests += metric.requestCount;
      acc[key].totalTokens += metric.tokensUsed;
      acc[key].totalErrors += metric.errorCount;
      acc[key].avgResponseTime = (acc[key].avgResponseTime + metric.averageResponseTime) / 2;
      
      return acc;
    }, {} as Record<string, any>);

    for (const [key, stats] of Object.entries(groupedMetrics)) {
      console.log(`${stats.provider} ${stats.endpoint}:`);
      console.log(`  Requests: ${stats.totalRequests}`);
      console.log(`  Tokens: ${stats.totalTokens}`);
      console.log(`  Errors: ${stats.totalErrors}`);
      console.log(`  Avg Response Time: ${stats.avgResponseTime.toFixed(0)}ms`);
    }

    return { healthStatus, connectionResults, metrics: groupedMetrics };
  } catch (error) {
    console.error('Example failed:', error);
  }
}

/**
 * Example 5: Cache Operations
 */
export async function exampleCacheOperations() {
  try {
    await aiServiceManager.initializeService('gemini');

    const request: SymbolLookupRequest = {
      query: 'Microsoft corporation',
      maxResults: 3
    };

    console.log('Making first request (should miss cache)...');
    const response1 = await aiServiceManager.lookupSymbols(request);
    console.log(`Cached: ${response1.cached || false}`);

    console.log('Making second identical request (should hit cache)...');
    const response2 = await aiServiceManager.lookupSymbols(request);
    console.log(`Cached: ${response2.cached || false}`);

    // Get cache stats
    const service = aiServiceManager.getService('gemini');
    if (service) {
      const cacheStats = service.getCacheStats();
      console.log('\nCache Statistics:');
      console.log(`Hit Rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
      console.log(`Total Requests: ${cacheStats.totalRequests}`);
      console.log(`Cache Hits: ${cacheStats.cacheHits}`);
      console.log(`Cache Misses: ${cacheStats.cacheMisses}`);
      console.log(`Entries: ${cacheStats.entriesCount}`);
      console.log(`Memory Usage: ${(cacheStats.memoryUsage / 1024).toFixed(1)} KB`);
    }

    // Clear cache
    console.log('\nClearing cache...');
    aiServiceManager.clearAllCaches();

    console.log('Making request after cache clear (should miss cache)...');
    const response3 = await aiServiceManager.lookupSymbols(request);
    console.log(`Cached: ${response3.cached || false}`);

    return { response1, response2, response3 };
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export all examples for easy testing
export const examples = {
  symbolLookup: exampleSymbolLookup,
  financialAnalysis: exampleFinancialAnalysis,
  multiProvider: exampleMultiProviderComparison,
  healthMonitoring: exampleHealthMonitoring,
  cacheOperations: exampleCacheOperations
};

export default examples;
