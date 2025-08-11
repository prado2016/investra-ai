/**
 * Modern Navigation Component - Financial UI 2024-2025
 * Implementing card-based layouts and modern color scheme
 */
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, TrendingUp, Settings, ArrowLeftRight, Calendar, Menu, X, Mail, Bell, Database, Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDataToolsMenuOpen, setIsDataToolsMenuOpen] = useState(false);
  const [isAnalyzeToolsMenuOpen, setIsAnalyzeToolsMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/positions', label: 'Positions', icon: TrendingUp },
    { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { path: '/summary', label: 'Summary', icon: Calendar },
    { path: '/portfolio-summary/heat-map', label: 'Heat Map', icon: BarChart3 },
    { path: '/email-management', label: 'Email Import', icon: Mail },
    { path: '/data-tools', label: 'Data Tools', icon: Database },
    { path: '/analyze-tools', label: 'Analyze Tools', icon: Activity },
    { path: '/notifications', label: 'Alerts', icon: Bell },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`nav-container ${className || ''}`}
      style={{
        background: 'var(--bg-card)',
        padding: 'var(--space-4) 0',
        boxShadow: 'var(--shadow-md)',
        borderBottom: '1px solid var(--border-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-fixed)',
        backdropFilter: 'blur(8px)',
        minHeight: '72px'
      }}
    >
      <div 
        className="nav-content"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
          position: 'relative'
        }}
      >
        <div className="nav-logo-container" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src="/investra-logo.svg" 
            alt="Investra" 
            style={{
              width: '160px',
              height: '48px',
              objectFit: 'contain'
            }}
          />
        </div>

        <button
          className="mobile-menu-button"
          onClick={toggleMobileMenu}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-md)',
            transition: 'all var(--transition-fast)',
            minHeight: 'var(--input-height-sm)',
            minWidth: 'var(--input-height-sm)'
          }}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="nav-desktop-content" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
          <ul 
            className={`nav-list ${isMobileMenuOpen ? 'nav-list-open' : ''}`}
            style={{
              display: 'flex',
              listStyle: 'none',
              margin: 0,
              padding: 0,
              gap: 'var(--space-2)',
              alignItems: 'center'
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path} className="nav-item">
                  <Link 
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: isActive ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                      textDecoration: 'none',
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-fast)',
                      fontWeight: 'var(--font-weight-medium)',
                      fontSize: 'var(--text-sm)',
                      background: isActive ? 'rgba(202, 138, 4, 0.1)' : 'transparent',
                      border: isActive ? '1px solid rgba(202, 138, 4, 0.2)' : '1px solid transparent',
                      minHeight: 'var(--input-height-sm)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--color-primary-600)';
                        e.currentTarget.style.background = 'rgba(202, 138, 4, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span className="nav-link-text">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Data Tools Dropdown */}
          <div 
            className="data-tools-dropdown-container" 
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsDataToolsMenuOpen(true)} 
            onMouseLeave={() => setIsDataToolsMenuOpen(false)}
          >
            <button
              className={`nav-link ${isDataToolsMenuOpen ? 'nav-link-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: isDataToolsMenuOpen ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                fontWeight: 'var(--font-weight-medium)',
                fontSize: 'var(--text-sm)',
                background: isDataToolsMenuOpen ? 'rgba(202, 138, 4, 0.1)' : 'transparent',
                border: isDataToolsMenuOpen ? '1px solid rgba(202, 138, 4, 0.2)' : '1px solid transparent',
                minHeight: 'var(--input-height-sm)',
                cursor: 'pointer'
              }}
            >
              <Database size={18} />
              <span className="nav-link-text">Data Tools</span>
            </button>
            {isDataToolsMenuOpen && (
              <div
                className="dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 'var(--z-dropdown)',
                  minWidth: '220px',
                  padding: 'var(--space-2) 0',
                }}
              >
                <Link
                  to="/data-tools"
                  onClick={() => setIsDataToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  All Data Tools
                </Link>
                <Link
                  to="/tools/covered-call-processor"
                  onClick={() => setIsDataToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Covered Call Processor
                </Link>
                <Link
                  to="/email-management"
                  onClick={() => setIsDataToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Email Import
                </Link>
              </div>
            )}
          </div>

          {/* Analyze Tools Dropdown */}
          <div 
            className="analyze-tools-dropdown-container" 
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsAnalyzeToolsMenuOpen(true)} 
            onMouseLeave={() => setIsAnalyzeToolsMenuOpen(false)}
          >
            <button
              className={`nav-link ${isAnalyzeToolsMenuOpen ? 'nav-link-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                color: isAnalyzeToolsMenuOpen ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                fontWeight: 'var(--font-weight-medium)',
                fontSize: 'var(--text-sm)',
                background: isAnalyzeToolsMenuOpen ? 'rgba(202, 138, 4, 0.1)' : 'transparent',
                border: isAnalyzeToolsMenuOpen ? '1px solid rgba(202, 138, 4, 0.2)' : '1px solid transparent',
                minHeight: 'var(--input-height-sm)',
                cursor: 'pointer'
              }}
            >
              <Activity size={18} />
              <span className="nav-link-text">Analyze Tools</span>
            </button>
            {isAnalyzeToolsMenuOpen && (
              <div
                className="dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 'var(--z-dropdown)',
                  minWidth: '220px',
                  padding: 'var(--space-2) 0',
                }}
              >
                <Link
                  to="/analyze-tools"
                  onClick={() => setIsAnalyzeToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  All Analyze Tools
                </Link>
                <Link
                  to="/tools/stock-finder"
                  onClick={() => setIsAnalyzeToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Stock Finder
                </Link>
                <Link
                  to="/portfolio-summary/heat-map"
                  onClick={() => setIsAnalyzeToolsMenuOpen(false)}
                  className="dropdown-item"
                  style={{
                    display: 'block',
                    padding: 'var(--space-2) var(--space-4)',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Heat Map
                </Link>
              </div>
            )}
          </div>

          <ThemeToggle />
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: 'fixed',
            top: 'var(--navbar-height)',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 'calc(var(--z-fixed) - 1)',
            display: 'none'
          }}
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile menu */}
      <div
        className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
          transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isMobileMenuOpen ? 1 : 0,
          visibility: isMobileMenuOpen ? 'visible' : 'hidden',
          transition: 'all var(--transition-normal)',
          zIndex: 'var(--z-dropdown)',
          backdropFilter: 'blur(8px)',
          display: 'none'
        }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 'var(--space-4) 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link 
                  to={item.path}
                  onClick={closeMobileMenu}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    color: isActive ? 'var(--color-primary-600)' : 'var(--text-primary)',
                    textDecoration: 'none',
                    padding: 'var(--space-4) var(--space-6)',
                    transition: 'all var(--transition-fast)',
                    fontWeight: 'var(--font-weight-medium)',
                    background: isActive ? 'rgba(202, 138, 4, 0.1)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--color-primary-600)' : '4px solid transparent'
                  }}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              </li>
            );
          })}
          
          <li style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
            <div style={{ padding: '0 var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Theme</span>
              <ThemeToggle />
            </div>
          </li>
        </ul>
      </div>

      <style>{`
        .data-tools-dropdown-container,
        .analyze-tools-dropdown-container {
          display: flex !important;
        }
        
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: block !important;
          }
          
          .nav-desktop-content .nav-list {
            display: none !important;
          }
          
          .data-tools-dropdown-container,
          .analyze-tools-dropdown-container {
            display: none !important;
          }
          
          .nav-desktop-content .theme-toggle {
            display: none !important;
          }
          
          .mobile-menu {
            display: block !important;
          }
          
          .mobile-menu-overlay {
            display: block !important;
          }
          
          .nav-logo-container img {
            width: 120px !important;
            height: 36px !important;
          }
        }
        
        .nav-link:focus-visible {
          outline: 2px solid var(--border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </nav>
  );
};

export default Navigation;
