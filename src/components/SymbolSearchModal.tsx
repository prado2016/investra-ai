/**
 * Symbol Search Modal Component
 * Task 8 & 9: Comprehensive AI-powered symbol search interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Search, X, TrendingUp, Building, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useAISymbolLookup } from '../hooks/useAISymbolLookup';
import { Modal } from './ui/Modal';
import type { SymbolLookupResult } from '../types/ai';

const SearchContainer = styled.div`
  padding: 1.5rem;
  max-width: 600px;
  width: 100%;
`;

const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
`;

const SearchTitle = styled.h2`
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
`;

const SearchInputContainer = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => $active ? '#3b82f6' : '#d1d5db'};
  background: ${({ $active }) => $active ? '#3b82f6' : 'white'};
  color: ${({ $active }) => $active ? 'white' : '#374151'};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    background: ${({ $active }) => $active ? '#2563eb' : '#f0f9ff'};
  }
`;

const ResultsContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`;

const ResultInfo = styled.div`
  flex: 1;
`;

const ResultSymbol = styled.div`
  font-weight: 600;
  color: #1f2937;
  font-size: 1rem;
  margin-bottom: 0.25rem;
`;

const ResultName = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
`;

const ResultMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #9ca3af;
`;

const ConfidenceScore = styled.div<{ $score: number }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $score }) => 
    $score > 0.8 ? '#059669' : 
    $score > 0.5 ? '#d97706' : '#dc2626'
  };
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $variant = 'secondary' }) => 
    $variant === 'primary' 
      ? `
        background: #3b82f6;
        color: white;
        border: none;
        &:hover { background: #2563eb; }
      `
      : `
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;
        &:hover { background: #f9fafb; }
      `
  }
`;

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: SymbolLookupResult) => void;
  initialQuery?: string;
  assetTypes?: string[];
}

const ASSET_TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'stock', label: 'Stocks' },
  { value: 'etf', label: 'ETFs' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'reit', label: 'REITs' }
];

export const SymbolSearchModal: React.FC<SymbolSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  initialQuery = '',
  assetTypes = ['all']
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [results, setResults] = useState<SymbolLookupResult[]>([]);
  
  const { searchSymbols, isSearching, lastError, clearError } = useAISymbolLookup();

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await searchSymbols(query, {
          maxResults: 10,
          includeAnalysis: false
        });

        if (response.success && response.data) {
          let filteredResults = response.data.results;
          
          // Apply asset type filter
          if (selectedFilter !== 'all') {
            filteredResults = filteredResults.filter(
              result => result.assetType === selectedFilter
            );
          }
          
          setResults(filteredResults);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedFilter, searchSymbols]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedFilter('all');
      clearError();
    }
  }, [isOpen, initialQuery, clearError]);

  const handleSelectSymbol = useCallback((symbol: SymbolLookupResult) => {
    onSelectSymbol(symbol);
    onClose();
  }, [onSelectSymbol, onClose]);

  const getAssetTypeIcon = (assetType: string) => {
    switch (assetType) {
      case 'stock':
        return <TrendingUp size={16} />;
      case 'etf':
        return <Building size={16} />;
      case 'crypto':
        return <Zap size={16} />;
      default:
        return <Building size={16} />;
    }
  };

  const renderResults = () => {
    if (isSearching) {
      return (
        <LoadingState>
          <div>Searching symbols...</div>
        </LoadingState>
      );
    }

    if (lastError) {
      return (
        <ErrorState>
          <AlertCircle size={20} />
          <div>
            <div>Search failed: {lastError}</div>
            <Button onClick={clearError} style={{ marginTop: '0.5rem' }}>
              Try Again
            </Button>
          </div>
        </ErrorState>
      );
    }

    if (!query.trim()) {
      return (
        <EmptyState>
          <div>
            <Search size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
            <h3>Search for Symbols</h3>
            <p>Enter a company name, stock symbol, or description to find financial instruments</p>
          </div>
        </EmptyState>
      );
    }

    if (results.length === 0) {
      return (
        <EmptyState>
          <div>
            <AlertCircle size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
            <h3>No Results Found</h3>
            <p>Try a different search term or check your spelling</p>
          </div>
        </EmptyState>
      );
    }

    return (
      <ResultsContainer>
        {results.map((result, index) => (
          <ResultItem 
            key={`${result.symbol}-${index}`}
            onClick={() => handleSelectSymbol(result)}
          >
            <ResultInfo>
              <ResultSymbol>{result.symbol}</ResultSymbol>
              <ResultName>{result.name}</ResultName>
              <ResultMeta>
                <span>{result.exchange}</span>
                <span>•</span>
                <span>{result.assetType.toUpperCase()}</span>
                {result.sector && (
                  <>
                    <span>•</span>
                    <span>{result.sector}</span>
                  </>
                )}
              </ResultMeta>
            </ResultInfo>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getAssetTypeIcon(result.assetType)}
              <ConfidenceScore $score={result.confidence}>
                {result.confidence > 0.8 ? (
                  <CheckCircle size={12} />
                ) : (
                  <AlertCircle size={12} />
                )}
                {Math.round(result.confidence * 100)}%
              </ConfidenceScore>
            </div>
          </ResultItem>
        ))}
      </ResultsContainer>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <SearchContainer>
        <SearchHeader>
          <Zap size={24} style={{ color: '#3b82f6' }} />
          <SearchTitle>AI Symbol Search</SearchTitle>
        </SearchHeader>

        <SearchInputContainer>
          <SearchIcon size={20} />
          <SearchInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for stocks, ETFs, crypto, and more..."
            autoFocus
          />
        </SearchInputContainer>

        <FilterContainer>
          {ASSET_TYPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              $active={selectedFilter === filter.value}
              onClick={() => setSelectedFilter(filter.value)}
            >
              {filter.label}
            </FilterChip>
          ))}
        </FilterContainer>

        {renderResults()}

        <ActionButtons>
          <Button onClick={onClose}>
            Cancel
          </Button>
        </ActionButtons>
      </SearchContainer>
    </Modal>
  );
};

export default SymbolSearchModal;
