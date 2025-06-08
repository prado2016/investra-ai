import React from 'react';
import { TrendingUp, DollarSign, PieChart, Target } from 'lucide-react';

interface InvestraThemeDemoProps {
  className?: string;
}

const InvestraThemeDemo: React.FC<InvestraThemeDemoProps> = ({ className }) => {
  return (
    <div className={`investra-demo ${className || ''}`} style={{ padding: 'var(--space-8)' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h1 style={{ 
            fontSize: 'var(--text-3xl)', 
            fontWeight: 'var(--font-weight-bold)',
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 'var(--space-4)'
          }}>
            Welcome to Investra AI
          </h1>
          <p style={{ 
            fontSize: 'var(--text-lg)', 
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Experience premium AI-powered investment analytics with our sophisticated golden design system.
          </p>
        </div>

        {/* Button Examples */}
        <div style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
            Golden Button Components
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button className="btn-investra btn-primary">
              <TrendingUp size={18} style={{ marginRight: 'var(--space-2)' }} />
              Analyze Portfolio
            </button>
            <button className="btn-investra btn-secondary">
              <PieChart size={18} style={{ marginRight: 'var(--space-2)' }} />
              View Reports
            </button>
            <button className="btn-investra btn-subtle btn-sm">
              Quick Action
            </button>
            <button className="btn-investra btn-primary btn-lg">
              <Target size={20} style={{ marginRight: 'var(--space-2)' }} />
              Start Investing
            </button>
          </div>
        </div>

        {/* Card Examples */}
        <div style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
            Premium Cards & Metrics
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-6)'
          }}>
            {/* Portfolio Value Card */}
            <div className="card-investra" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <DollarSign size={24} style={{ color: 'var(--color-primary-600)', marginRight: 'var(--space-2)' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Portfolio Value</h3>
              </div>
              <div className="financial-metric metric-highlight" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' }}>
                $1,247,892.50
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="badge-investra badge-success">+12.4%</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>vs last month</span>
              </div>
            </div>

            {/* AI Insights Card */}
            <div className="card-investra card-premium" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <TrendingUp size={24} style={{ color: 'var(--color-primary-600)', marginRight: 'var(--space-2)' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>AI Recommendation</h3>
                <span className="badge-investra badge-primary" style={{ marginLeft: 'auto' }}>New</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Based on market analysis, consider rebalancing your tech allocation.
              </p>
              <button className="btn-investra btn-primary btn-sm" style={{ width: '100%' }}>
                View Full Analysis
              </button>
            </div>

            {/* Performance Metrics */}
            <div className="card-investra" style={{ padding: 'var(--space-6)' }}>
              <h3 style={{ margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
                Performance Metrics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>YTD Return</span>
                  <span className="financial-metric metric-positive">+18.7%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Gain/Loss</span>
                  <span className="financial-metric metric-positive">+$23,847.20</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Risk Score</span>
                  <span className="financial-metric metric-neutral">7.2/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Examples */}
        <div style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
            Golden Form Elements
          </h2>
          <div className="card-investra" style={{ padding: 'var(--space-8)', maxWidth: '500px' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--space-2)', 
                color: 'var(--text-primary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Stock Symbol
              </label>
              <input 
                className="input-investra" 
                type="text" 
                placeholder="Enter ticker symbol (e.g., AAPL)"
                defaultValue="AAPL"
              />
            </div>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--space-2)', 
                color: 'var(--text-primary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Investment Amount
              </label>
              <input 
                className="input-investra" 
                type="number" 
                placeholder="Enter amount"
                defaultValue="10000"
              />
            </div>
            <button className="btn-investra btn-primary" style={{ width: '100%' }}>
              Add to Portfolio
            </button>
          </div>
        </div>

        {/* Loading State */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
            Loading States
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-6)' }}>
            <div className="spinner-investra"></div>
            <span style={{ color: 'var(--text-secondary)' }}>Loading market data...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestraThemeDemo;
