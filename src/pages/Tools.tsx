/**
 * Tools Page - Central hub for all administrative and utility tools
 * Provides organized access to portfolio management, transaction analysis, and system tools
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Database, 
  Search, 
  TrendingUp, 
  Settings, 
  Mail, 
  BarChart3,
  Wrench,
  Target,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

const Tools: React.FC = () => {
  usePageTitle('Tools');

  const toolCategories = [
    {
      title: 'Portfolio Management',
      description: 'Tools for managing portfolios and transaction data',
      icon: Database,
      color: 'var(--color-primary-600)',
      tools: [
        {
          name: 'Batch Update Portfolios',
          description: 'Run batch updates on transaction portfolio assignments',
          path: '/batch-update-portfolios',
          icon: RefreshCw,
          status: 'stable'
        },
        {
          name: 'Covered Call Processor', 
          description: 'Identify and process covered call transactions',
          path: '/tools/covered-call-processor',
          icon: Target,
          status: 'stable'
        }
      ]
    },
    {
      title: 'Analysis & Research',
      description: 'Data analysis and research utilities',
      icon: BarChart3,
      color: 'var(--color-success-600)',
      tools: [
        {
          name: 'Stock Finder',
          description: 'Search and analyze stock information',
          path: '/tools/stock-finder',
          icon: Search,
          status: 'stable'
        },
        {
          name: 'Heat Map',
          description: 'Visual portfolio performance analysis',
          path: '/portfolio-summary/heat-map',
          icon: TrendingUp,
          status: 'stable'
        }
      ]
    },
    {
      title: 'Data Management',
      description: 'Email and transaction data processing',
      icon: Mail,
      color: 'var(--color-info-600)',
      tools: [
        {
          name: 'Email Import',
          description: 'Import and process trading emails',
          path: '/email-management',
          icon: Mail,
          status: 'stable'
        },
        {
          name: 'Transaction Analysis',
          description: 'Analyze and debug transaction data',
          path: '/transactions',
          icon: FileText,
          status: 'stable'
        }
      ]
    },
    {
      title: 'System Administration',
      description: 'System configuration and maintenance',
      icon: Settings,
      color: 'var(--color-warning-600)',
      tools: [
        {
          name: 'Settings',
          description: 'Configure API keys and system settings',
          path: '/settings',
          icon: Settings,
          status: 'stable'
        },
        {
          name: 'Notifications',
          description: 'Manage alerts and system notifications',
          path: '/notifications',
          icon: AlertTriangle,
          status: 'stable'
        }
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stable':
        return <CheckCircle size={16} style={{ color: 'var(--color-success-600)' }} />;
      case 'beta':
        return <AlertTriangle size={16} style={{ color: 'var(--color-warning-600)' }} />;
      default:
        return <Wrench size={16} style={{ color: 'var(--color-info-600)' }} />;
    }
  };

  return (
    <div 
      className="tools-page"
      style={{
        padding: 'var(--space-6)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}
    >
      {/* Page Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
          borderBottom: '1px solid var(--border-primary)',
          paddingBottom: 'var(--space-6)'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
            color: 'white'
          }}
        >
          <Wrench size={32} />
        </div>
        <div>
          <h1 
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-primary)',
              margin: 0,
              marginBottom: 'var(--space-2)'
            }}
          >
            Tools & Utilities
          </h1>
          <p 
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-secondary)',
              margin: 0
            }}
          >
            Access all administrative tools and utilities for portfolio management and data analysis
          </p>
        </div>
      </div>

      {/* Tool Categories */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: 'var(--space-8)'
        }}
      >
        {toolCategories.map((category) => {
          const CategoryIcon = category.icon;
          
          return (
            <div
              key={category.title}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {/* Category Header */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                  paddingBottom: 'var(--space-4)',
                  borderBottom: '1px solid var(--border-secondary)'
                }}
              >
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: `color-mix(in srgb, ${category.color} 10%, transparent)`,
                    color: category.color
                  }}
                >
                  <CategoryIcon size={24} />
                </div>
                <div>
                  <h2 
                    style={{
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--text-primary)',
                      margin: 0,
                      marginBottom: 'var(--space-1)'
                    }}
                  >
                    {category.title}
                  </h2>
                  <p 
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-secondary)',
                      margin: 0
                    }}
                  >
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Category Tools */}
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)'
                }}
              >
                {category.tools.map((tool) => {
                  const ToolIcon = tool.icon;
                  
                  return (
                    <Link
                      key={tool.name}
                      to={tool.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-secondary)',
                        textDecoration: 'none',
                        transition: 'all var(--transition-fast)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-card)';
                        e.currentTarget.style.borderColor = 'var(--border-secondary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          background: `color-mix(in srgb, ${category.color} 10%, transparent)`,
                          color: category.color
                        }}
                      >
                        <ToolIcon size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            marginBottom: 'var(--space-1)'
                          }}
                        >
                          <span 
                            style={{
                              fontSize: 'var(--text-base)',
                              fontWeight: 'var(--font-weight-medium)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {tool.name}
                          </span>
                          {getStatusIcon(tool.status)}
                        </div>
                        <p 
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-secondary)',
                            margin: 0
                          }}
                        >
                          {tool.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tools;