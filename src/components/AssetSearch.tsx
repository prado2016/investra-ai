import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Search, Loader, X } from 'lucide-react';
import { useSearch } from '../hooks/useYahooFinance';

// Inline type to avoid import issues
type AssetType = 'stock' | 'option' | 'forex' | 'crypto' | 'reit' | 'etf';

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input<{ hasResults?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background-color: white;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  ${props => props.hasResults && `
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: transparent;
  `}
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  color: #6b7280;
  pointer-events: none;
`;

const LoadingIcon = styled(Loader)`
  position: absolute;
  right: 2.5rem;
  color: #6b7280;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.2s;
  
  &:hover {
    color: #374151;
  }
`;

const ResultsContainer = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const ResultItem = styled.button`
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  border: none;
  background: white;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    background-color: #f3f4f6;
  }
  
  &:focus {
    outline: none;
    background-color: #e5e7eb;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }
`;

const ResultContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ResultSymbol = styled.span`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
`;

const ResultName = styled.span`
  color: #6b7280;
  font-size: 0.75rem;
  line-height: 1.2;
`;

const ResultType = styled.span<{ assetType: string }>`
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  
  ${({ assetType }) => {
    switch (assetType) {
      case 'stock':
        return 'background: #dbeafe; color: #1e40af;';
      case 'crypto':
        return 'background: #fef3c7; color: #d97706;';
      case 'forex':
        return 'background: #d1fae5; color: #059669;';
      case 'option':
        return 'background: #fce7f3; color: #be185d;';
      case 'reit':
        return 'background: #ede9fe; color: #7c2d12;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

const ErrorState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #dc2626;
  font-size: 0.875rem;
`;

interface AssetSearchResult {
  symbol: string;
  name: string;
  type: AssetType;
}

interface AssetSearchProps {
  placeholder?: string;
  onSelect?: (_result: AssetSearchResult) => void;
  _value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const AssetSearch: React.FC<AssetSearchProps> = ({
  placeholder = "Search for stocks, crypto, forex...",
  onSelect,
  _value = '',
  onChange,
  className,
  disabled = false
}) => {
  const [query, setQuery] = useState(_value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, loading, error } = useSearch(query, {
    enabled: query.length >= 2 && !disabled,
    debounceMs: 300
  });

  // Sync with external value changes
  useEffect(() => {
    if (_value !== query) {
      setQuery(_value);
    }
  }, [_value, query]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange?.(newValue);
    setIsOpen(newValue.length >= 2);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectResult = (result: AssetSearchResult) => {
    setQuery(result.symbol);
    onChange?.(result.symbol);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !results || results.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const showResults = isOpen && query.length >= 2 && !disabled;
  const hasResults = results && results.length > 0;

  return (
    <SearchContainer ref={containerRef} className={className}>
      <SearchInputWrapper>
        <SearchIcon size={16} />
        <SearchInput
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          hasResults={showResults}
          disabled={disabled}
        />
        {loading && <LoadingIcon size={16} />}
        {query && !loading && (
          <ClearButton onClick={handleClear} type="button">
            <X size={16} />
          </ClearButton>
        )}
      </SearchInputWrapper>

      {showResults && (
        <ResultsContainer>
          {error ? (
            <ErrorState>
              Failed to search: {error}
            </ErrorState>
          ) : loading ? (
            <EmptyState>
              Searching...
            </EmptyState>
          ) : hasResults ? (
            results.map((result, index) => (
              <ResultItem
                key={result.symbol}
                onClick={() => handleSelectResult(result)}
                style={{
                  backgroundColor: selectedIndex === index ? '#e5e7eb' : undefined
                }}
              >
                <ResultContent>
                  <ResultSymbol>{result.symbol}</ResultSymbol>
                  <ResultName>{result.name}</ResultName>
                </ResultContent>
                <ResultType assetType={result.type}>
                  {result.type}
                </ResultType>
              </ResultItem>
            ))
          ) : (
            <EmptyState>
              No results found for "{query}"
            </EmptyState>
          )}
        </ResultsContainer>
      )}
    </SearchContainer>
  );
};

export default AssetSearch;
