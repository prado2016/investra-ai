import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import styled from 'styled-components';
import { SymbolValidator } from '../utils/symbolValidator';
import { isETF } from '../utils/assetCategorization';

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

  // Extract base symbol without exchange suffix for logo lookups
  const extractBaseSymbol = (sym: string): string => {
    // Remove common exchange suffixes
    return sym.replace(/\.(TO|L|F|V|AX|HK|T|SI|PA|MI|MC|SW|ST|CO|MX|SA|BR|AR)$/i, '');
  };

  // Validate domain to prevent invalid requests
  const isValidDomain = (domain: string): boolean => {
    // Blacklist known invalid domains from exchange suffixes
    const invalidDomains = ['to.com', 'l.com', 'f.com', 'v.com', 'ax.com', 'hk.com', 't.com', 'si.com'];
    return !invalidDomains.includes(domain.toLowerCase()) && 
           domain.length > 3 && 
           !domain.match(/^[a-z]{1,2}\.com$/i); // Reject single/double letter .com domains
  };

  // Generate multiple logo sources with validated domains
  const generateLogoSources = (sym: string) => {
    const sources: string[] = [];
    const baseSymbol = extractBaseSymbol(sym);
    
    // Primary source: use company domain if available
    if (companyDomain && isValidDomain(companyDomain)) {
      sources.push(`https://logo.clearbit.com/${companyDomain}`);
    }
    
    // For Canadian stocks (.TO), try both with and without suffix
    if (sym.includes('.TO')) {
      const canadianBase = sym.replace('.TO', '');
      sources.push(
        `https://logo.clearbit.com/${canadianBase.toLowerCase()}.ca`,
        `https://logo.clearbit.com/${canadianBase.toLowerCase()}.com`
      );
    }
    
    // For ETFs, add specific ETF providers
    if (isETF(baseSymbol) || sym.match(/^(SPY|QQQ|VTI|VEA|IWM|GLD|SLV|XL[A-Z]|ARK[A-Z])/)) {
      const etfProviders = ['vanguard.com', 'ishares.com', 'ssga.com', 'invesco.com'];
      etfProviders.forEach(provider => {
        sources.push(`https://logo.clearbit.com/${provider}`);
      });
    }
    
    // Only add fallback sources for valid base symbols (minimum 2 chars, not exchange suffix)
    if (baseSymbol.length >= 2 && baseSymbol !== sym.replace(/^.*\./, '')) {
      const fallbackDomain = `${baseSymbol.toLowerCase()}.com`;
      if (isValidDomain(fallbackDomain)) {
        sources.push(
          `https://logo.clearbit.com/${fallbackDomain}`,
          `https://api.logo.dev/${fallbackDomain}?format=png&size=128`,
          `https://cdn.brandfetch.io/${fallbackDomain}`,
          `https://img.logo.dev/${fallbackDomain}?format=png&size=64`
        );
      }
    }
    
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

  // Generate a fallback based on company name/symbol and asset type
  const generateFallback = (symbol: string) => {
    if (!symbol || typeof symbol !== 'string') {
      return null;
    }

    // For well-known companies, we can provide custom fallbacks
    const knownCompanies: { [key: string]: string } = {
      // Major US stocks
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
      'CVX': '⛽',
      
      // Major ETFs
      'SPY': '📈',
      'QQQ': '💻',
      'VTI': '🏢',
      'VEA': '🌍',
      'VWO': '🌏',
      'IWM': '🏪',
      'GLD': '🥇',
      'SLV': '🥈',
      'TLT': '📋',
      'XLK': '💻',
      'XLF': '🏦',
      'XLE': '⛽',
      'XLV': '🏥',
      'XLI': '🏭',
      'XLP': '🛒',
      'XLY': '🛍️',
      'XLU': '⚡',
      'XLB': '🏗️',
      'XLRE': '🏠',
      'AGG': '📊',
      'BND': '📋',
      'IEFA': '🌍',
      'IEMG': '🌏',
      'HYG': '💰',
      'LQD': '💼',
      'EFA': '🌍',
      'EEM': '🌏',
      'RSP': '⚖️',
      'ARKK': '🚀',
      'ARKQ': '🤖',
      'ARKG': '🧬',
      'ARKW': '🌐',
      'ARKF': '💳',
      
      // Leveraged ETFs
      'TSLL': '🚀', // Direxion Daily S&P 500 Bull 3X
      'AAPU': '🍎', // Direxion Daily AAPL Bull 1.5X
      'NVDL': '💻', // GraniteShares 1.5x Long NVDA
      'NVDU': '💻', // GraniteShares 2x Long NVDA
      'NVDD': '💻', // GraniteShares 1x Short NVDA
      'SOXL': '🔌', // Direxion Daily Semiconductor Bull 3X
      'SOXS': '🔌', // Direxion Daily Semiconductor Bear 3X
      'TQQQ': '💻', // ProShares UltraPro QQQ
      'SQQQ': '💻', // ProShares UltraPro Short QQQ
      'SPXL': '📈', // Direxion Daily S&P 500 Bull 3X
      'SPXS': '📈', // Direxion Daily S&P 500 Bear 3X
      'UPRO': '📈', // ProShares UltraPro S&P 500
      'SPXU': '📈', // ProShares UltraPro Short S&P 500
      'TECL': '💻', // Direxion Daily Technology Bull 3X
      'TECS': '💻', // Direxion Daily Technology Bear 3X
      'FNGU': '💻', // MicroSectors FANG+ Index 3X Leveraged
      'FNGD': '💻', // MicroSectors FANG+ Index 3X Inverse
      'LABU': '🏥', // Direxion Daily S&P Biotech Bull 3X
      'LABD': '🏥', // Direxion Daily S&P Biotech Bear 3X
      'WEBL': '🌐', // Direxion Daily Dow Jones Internet Bull 3X
      'WEBS': '🌐', // Direxion Daily Dow Jones Internet Bear 3X
      'BULZ': '🐂', // MicroSectors Travel 3x Leveraged
      'BERZ': '🐻', // MicroSectors Travel 3x Inverse
      'CURE': '🏥', // Direxion Daily Healthcare Bull 3X
      'HIBL': '🏥', // Direxion Daily S&P 500 High Beta Bull 3X
      'HIBS': '🏥', // Direxion Daily S&P 500 High Beta Bear 3X
      'NAIL': '🏠', // Direxion Daily Homebuilders & Supplies Bull 3X
      'DRN': '🏠', // Direxion Daily Real Estate Bull 3X
      'DRV': '🏠', // Direxion Daily Real Estate Bear 3X
      'DFEN': '🛡️', // Direxion Daily Aerospace & Defense Bull 3X
      'DPST': '🏦', // Direxion Daily Regional Banks Bull 3X
      'DRIP': '⛽', // Direxion Daily S&P Oil & Gas E&P Bear 2X
      'GUSH': '⛽', // Direxion Daily S&P Oil & Gas E&P Bull 2X
      'JNUG': '🥇', // Direxion Daily Junior Gold Miners Bull 2X
      'JDST': '🥇', // Direxion Daily Junior Gold Miners Bear 2X
      'NUGT': '🥇', // Direxion Daily Gold Miners Bull 2X
      'DUST': '🥇', // Direxion Daily Gold Miners Bear 2X
      
      // Canadian stocks (with .TO suffix handling)
      'SHOP': '🛒',
      'CNR': '🚂',
      'TD': '🏦',
      'RY': '🏦',
      'BMO': '🏦',
      'BNS': '🏦',
      'CM': '🏦',
      'ENB': '🛢️',
      'TRP': '🛢️',
      'SU': '⛽',
      'CNQ': '⛽',
      'CVE': '⛽',
      'WCN': '♻️',
      'CSU': '💻',
      'ATD': '⛽',
      'MFC': '🏢',
      'SLF': '🏢',
      'PWF': '💼',
      'GIB': '🏗️',
      'CP': '🚂',
      'BAM': '🏢',
      'FFH': '🏢',
      'L': '🏪',
      'DOL': '🛒',
      'EMA': '⚡',
      'FTS': '⚡',
      'H': '🏪',
      'QSR': '🍔',
      'TIH': '🏥',
      'CCL': '🏗️',
      'WPM': '🥇',
      'K': '🥇',
      'ABX': '🥇',
      'NTR': '🌾',
      'CCO': '☢️',
      
      // Popular Canadian ETFs
      'VTI.TO': '🏢',
      'VCN.TO': '🍁',
      'XIC.TO': '🍁',
      'TDB902.TO': '📈',
      'VXUS.TO': '🌍',
      'VEA.TO': '🌍'
    };

    const upperSymbol = symbol.toUpperCase();
    
    // Check for direct match first
    if (knownCompanies[upperSymbol]) {
      return knownCompanies[upperSymbol];
    }

    // Smart fallback based on asset type and symbol patterns
    const baseSymbol = extractBaseSymbol(upperSymbol);
    
    // ETF pattern-based fallbacks
    if (isETF(baseSymbol)) {
      // Leveraged ETF patterns
      if (upperSymbol.includes('3X') || upperSymbol.includes('BULL') || upperSymbol.includes('BEAR')) {
        return upperSymbol.includes('BEAR') || upperSymbol.includes('SHORT') ? '📉' : '📈';
      }
      // Sector-specific ETF fallbacks
      if (upperSymbol.includes('TECH') || upperSymbol.includes('SOX')) return '💻';
      if (upperSymbol.includes('BIO') || upperSymbol.includes('HEALTH')) return '🏥';
      if (upperSymbol.includes('GOLD') || upperSymbol.includes('MINER')) return '🥇';
      if (upperSymbol.includes('OIL') || upperSymbol.includes('ENERGY')) return '⛽';
      if (upperSymbol.includes('BANK') || upperSymbol.includes('FINANC')) return '🏦';
      if (upperSymbol.includes('REAL') || upperSymbol.includes('REIT')) return '🏠';
      if (upperSymbol.includes('DEFENSE') || upperSymbol.includes('AERO')) return '🛡️';
      if (upperSymbol.includes('INTERNET') || upperSymbol.includes('WEB')) return '🌐';
      if (upperSymbol.includes('TRAVEL') || upperSymbol.includes('TRANSPORT')) return '✈️';
      // Default ETF icon
      return '📊';
    }
    
    // Stock fallbacks based on symbol patterns
    if (upperSymbol.length <= 4) {
      // Tech company patterns
      if (/^[A-Z]*T[A-Z]*$/.test(upperSymbol) && upperSymbol.includes('T')) return '💻';
      // Financial patterns
      if (/^[A-Z]*B[A-Z]*$/.test(upperSymbol) && upperSymbol.includes('B')) return '🏦';
      // Energy patterns  
      if (upperSymbol.includes('X') && upperSymbol.includes('O')) return '⛽';
    }
    
    // Cryptocurrency fallback
    if (upperSymbol.includes('BTC') || upperSymbol.includes('BITCOIN')) return '₿';
    if (upperSymbol.includes('ETH') || upperSymbol.includes('ETHEREUM')) return '⟨Ξ⟩';
    
    // Generic fallbacks based on symbol characteristics
    if (upperSymbol.length >= 4) {
      // Longer symbols often indicate ETFs or special instruments
      return '📈';
    }
    
    return null;
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
