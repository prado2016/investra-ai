import React, { useEffect, useState } from 'react';
import { assetTypePLService } from '../services/analytics/assetTypePLService';
import type { AssetTypePLData } from '../services/analytics/assetTypePLService';
import { usePortfolios } from '../contexts/PortfolioContext';

const HeatMapDisplay: React.FC = () => {
  const { activePortfolio } = usePortfolios();
  const [data, setData] = useState<AssetTypePLData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activePortfolio) {
      const fetchData = async () => {
        setLoading(true);
        const result = await assetTypePLService.getAssetTypePL(activePortfolio.id);
        if (result.data) {
          setData(result.data);
        } else {
          setError(result.error);
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [activePortfolio]);

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
      <h2>Heat Map Display</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {data.map((item) => (
          <div
            key={item.assetType}
            style={{
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '16px',
              margin: '8px',
              minWidth: '200px',
              textAlign: 'center',
              backgroundColor: item.totalPL >= 0 ? '#e6fffa' : '#ffebe6',
            }}
          >
            <h3>{item.assetType}</h3>
            <p>Total P/L: {item.totalPL.toFixed(2)}</p>
            <p>Realized P/L: {item.realizedPL.toFixed(2)}</p>
            <p>Unrealized P/L: {item.unrealizedPL.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeatMapDisplay;
