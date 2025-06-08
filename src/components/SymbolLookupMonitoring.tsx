import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  BarChart3, 
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useSymbolLookup } from '../hooks/useSymbolLookup';
import type { AIProvider } from '../types/ai';

interface MonitoringDashboardProps {
  className?: string;
  refreshInterval?: number; // in milliseconds
}

interface ProviderStatus {
  name?: string;
  available: boolean;
  latency?: number;
  responseTime?: number;
  error?: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<AIProvider, ProviderStatus>;
  metadata: {
    timestamp: string;
    version: string;
    uptime: number;
  };
  // For backwards compatibility with existing code that expects providers array
  providers?: ProviderStatus[];
  uptime?: number;
  averageResponseTime?: number;
}

interface RecentError {
  timestamp: string;
  error: string;
  message?: string;
  code?: string;
  query: string;
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  requestsByProvider: Record<AIProvider, number>;
  recentErrors: RecentError[];
  // Additional fields used in the component but not in the API
  errorCount?: number;
  averageResponseTime?: number;
  hourlyRequests?: number;
  dailyRequests?: number;
  hourlyLimit?: number;
  dailyLimit?: number;
  rateLimitResetTime?: string;
}

export function SymbolLookupMonitoring({ 
  className = "",
  refreshInterval = 30000 // 30 seconds
}: MonitoringDashboardProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { checkHealth, getUsageStats } = useSymbolLookup();

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [health, stats] = await Promise.all([
        checkHealth(),
        getUsageStats()
      ]);
      
      // Transform health data to include providers array for backwards compatibility
      if (health) {
        const transformedHealth: HealthData = {
          ...health,
          providers: Object.entries(health.services || {}).map(([name, status]) => ({
            name,
            available: status.available,
            responseTime: status.latency,
            latency: status.latency,
            error: status.error
          })),
          uptime: health.metadata?.uptime || 0,
          averageResponseTime: Object.values(health.services || {})
            .filter(s => s.available && s.latency)
            .reduce((sum, s) => sum + (s.latency || 0), 0) / 
            Math.max(1, Object.values(health.services || {}).filter(s => s.available && s.latency).length)
        };
        setHealthData(transformedHealth);
      }
      
      // Transform usage stats to include computed fields
      if (stats) {
        const transformedStats: UsageStats = {
          ...stats,
          errorCount: stats.failedRequests || 0,
          averageResponseTime: stats.averageProcessingTime,
          hourlyRequests: 0, // Default values since not in API
          dailyRequests: 0,
          hourlyLimit: 1000,
          dailyLimit: 10000
        };
        setUsageStats(transformedStats);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkHealth, getUsageStats]);

  // Auto-refresh data
  useEffect(() => {
    refreshData();
    
    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshData, refreshInterval]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertCircle className="w-5 h-5" />;
      case 'unhealthy': return <AlertCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Symbol Lookup Monitoring</h2>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-gray-500">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* Health Status Cards */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Status</p>
                <div className={`flex items-center space-x-2 mt-2 px-3 py-1 rounded-full ${getHealthStatusColor(healthData.status)}`}>
                  {getHealthStatusIcon(healthData.status)}
                  <span className="font-semibold capitalize">{healthData.status}</span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatUptime(healthData.uptime || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {healthData.averageResponseTime || 0}ms
                </p>
              </div>
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {healthData.providers?.filter((p: ProviderStatus) => p.available).length || 0}
                  <span className="text-base text-gray-500">
                    /{healthData.providers?.length || 0}
                  </span>
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Provider Status */}
      {healthData?.providers && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Provider Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthData.providers.map((provider: ProviderStatus, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{provider.name}</p>
                    <p className="text-sm text-gray-600">
                      Response: {provider.responseTime || 0}ms
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${provider.available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {provider.available ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {usageStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Statistics */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Request Statistics</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(usageStats.totalRequests || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {((usageStats.successfulRequests / usageStats.totalRequests) * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BarChart3 className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(usageStats.averageResponseTime || 0)}ms
                  </p>
                  <p className="text-sm text-gray-600">Avg Response</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(usageStats.errorCount || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Rate Limiting</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Hourly Usage</span>
                    <span className="text-sm text-gray-600">
                      {usageStats.hourlyRequests || 0} / {usageStats.hourlyLimit || 1000}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(((usageStats.hourlyRequests || 0) / (usageStats.hourlyLimit || 1000)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Daily Usage</span>
                    <span className="text-sm text-gray-600">
                      {usageStats.dailyRequests || 0} / {usageStats.dailyLimit || 10000}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(((usageStats.dailyRequests || 0) / (usageStats.dailyLimit || 10000)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {usageStats.rateLimitResetTime && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Rate limit resets: {new Date(usageStats.rateLimitResetTime).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Errors */}
      {usageStats?.recentErrors && usageStats.recentErrors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {usageStats.recentErrors.slice(0, 5).map((error: RecentError, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">{error.code || 'ERROR'}</p>
                    <p className="text-sm text-red-700">{error.message || error.error}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(error.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SymbolLookupMonitoring;
