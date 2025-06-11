import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import styled from 'styled-components';
import { SymbolValidator } from '../utils/symbolValidator';

interface CompanyLogoProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LogoContainer = styled.div<{ size: 'sm' | 'md' | 'lg' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  overflow: hidden;
  flex-shrink: 0;
  
  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `
          width: 20px;
          height: 20px;
        `;
      case 'md':
        return `
          width: 24px;
          height: 24px;
        `;
      case 'lg':
        return `
          width: 32px;
          height: 32px;
        `;
      default:
        return `
          width: 24px;
          height: 24px;
        `;
    }
  }}
  
  [data-theme="dark"] & {
    background: var(--bg-tertiary);
    border-color: var(--border-primary);
  }
`;

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const FallbackIcon = styled(Building2).withConfig({
  shouldForwardProp: (prop) => prop !== 'size'
})<{ size: 'sm' | 'md' | 'lg' }>`
  color: var(--text-muted);
  
  ${({ size }) => {
    switch (size) {
      case 'sm':
        return `width: 12px; height: 12px;`;
      case 'md':
        return `width: 14px; height: 14px;`;
      case 'lg':
        return `width: 18px; height: 18px;`;
      default:
        return `width: 14px; height: 14px;`;
    }
  }}
  
  [data-theme="dark"] & {
    color: var(--text-muted);
  }
`;

const CompanyLogo: React.FC<CompanyLogoProps> = ({ 
  symbol, 
  size = 'md', 
  className 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  // Early return if symbol is not provided
  if (!symbol || typeof symbol !== 'string') {
    return (
      <LogoContainer size={size} className={className}>
        <FallbackIcon size={size} />
      </LogoContainer>
    );
  }

  // Normalize the symbol to handle typos and variations
  const normalizedSymbol = SymbolValidator.normalizeSymbol(symbol);
  const companyDomain = SymbolValidator.getCompanyDomain(normalizedSymbol);

  // Generate multiple logo sources with validated domains
  const generateLogoSources = (sym: string) => {
    const sources: string[] = [];
    
    // Primary source: use company domain if available
    if (companyDomain) {
      sources.push(`https://logo.clearbit.com/${companyDomain}`);
    }
    
    // Fallback sources
    sources.push(
      `https://logo.clearbit.com/${sym.toLowerCase()}.com`,
      `https://api.logo.dev/${sym.toLowerCase()}.com?format=png&size=128`,
      `https://cdn.brandfetch.io/${sym.toLowerCase()}.com`,
      `https://img.logo.dev/${sym.toLowerCase()}.com?format=png&size=64`
    );
    
    return sources;
  };

  const logoSources = generateLogoSources(normalizedSymbol);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    // Try next source if available
    if (currentSourceIndex < logoSources.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
      setImageLoaded(false);
    } else {
      setImageError(true);
      setImageLoaded(false);
    }
  };

  // Generate a fallback based on company name/symbol
  const generateFallback = (symbol: string) => {
    if (!symbol || typeof symbol !== 'string') {
      return null;
    }

    // For well-known companies, we can provide custom fallbacks
    const knownCompanies: { [key: string]: string } = {
      'AAPL': '🍎',
      'MSFT': '🪟',
      'GOOGL': '🔍',
      'AMZN': '📦',
      'TSLA': '🚗',
      'META': '👥',
      'NVDA': '💻',
      'NFLX': '🎬',
      'DIS': '🏰',
      'UBER': '🚕',
      'SPOT': '🎵',
      'TWTR': '🐦',
      'SNAP': '👻',
      'COIN': '₿',
      'SQ': '⬜',
      'PYPL': '💳',
      'V': '💳',
      'MA': '💳',
      'JPM': '🏦',
      'BAC': '🏦',
      'WMT': '🛒',
      'KO': '🥤',
      'PEP': '🥤',
      'MCD': '🍟',
      'SBUX': '☕',
      'NKE': '👟',
      'BA': '✈️',
      'GE': '⚡',
      'GM': '🚗',
      'F': '🚗',
      'XOM': '⛽',
      'CVX': '⛽'
    };

    return knownCompanies[symbol.toUpperCase()] || null;
  };

  const emojiIcon = generateFallback(normalizedSymbol);
  const currentLogoSource = logoSources[currentSourceIndex];

  return (
    <LogoContainer size={size} className={className}>
      {!imageError && currentLogoSource ? (
        <LogoImage
          src={currentLogoSource}
          alt={`${normalizedSymbol} logo`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: imageLoaded ? 'block' : 'none' }}
        />
      ) : null}
      
      {(imageError || !imageLoaded) && (
        <>
          {emojiIcon ? (
            <span style={{ fontSize: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '12px' }}>
              {emojiIcon}
            </span>
          ) : (
            <FallbackIcon size={size} />
          )}
        </>
      )}
    </LogoContainer>
  );
};

export default CompanyLogo;
