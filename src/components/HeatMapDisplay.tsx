import React, { useEffect, useState } from 'react';
import { assetPLService } from '../services/analytics/assetPLService';
import type { AssetPLData } from '../services/analytics/assetPLService';
import { usePortfolios } from '../contexts/PortfolioContext';

const HeatMapDisplay: React.FC = () => {
  const { activePortfolio, portfolios } = usePortfolios();
  const [data, setData] = useState<AssetPLData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let result;
      
      if (activePortfolio) {
        // Single portfolio
        result = await assetPLService.getAssetPL(activePortfolio.id);
      } else {
        // All portfolios
        const portfolioIds = portfolios.map(p => p.id);
        result = await assetPLService.getAggregatedAssetPL(portfolioIds);
      }
      
      if (result.data) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    };
    
    fetchData();
  }, [activePortfolio, portfolios]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data || data.length === 0) {
    return <div>No data available.</div>;
  }

  return (
    <div>
      <h2>Asset P/L Heat Map</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {activePortfolio 
          ? `Showing P/L for ${activePortfolio.name}` 
          : 'Showing aggregated P/L across all portfolios'
        }
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {data.map((item) => (
          <div
            key={item.symbol}
            style={{
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              textAlign: 'center',
              backgroundColor: item.totalPL >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: item.totalPL >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h3 style={{ 
              margin: '0 0 var(--space-2) 0',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              {item.symbol}
            </h3>
            <p style={{ 
              margin: '0 0 var(--space-1) 0',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              textTransform: 'capitalize'
            }}>
              {item.assetType}
            </p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <p style={{ 
                margin: '0 0 var(--space-1) 0',
                color: item.totalPL >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                fontWeight: 'var(--font-weight-semibold)',
                fontSize: 'var(--text-base)'
              }}>
                Total P/L: ${item.totalPL.toFixed(2)}
              </p>
              <p style={{ 
                margin: '0 0 var(--space-1) 0',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)'
              }}>
                Realized: ${item.realizedPL.toFixed(2)}
              </p>
              <p style={{ 
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)'
              }}>
                Unrealized: ${item.unrealizedPL.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeatMapDisplay;
