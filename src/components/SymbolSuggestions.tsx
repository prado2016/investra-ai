/**
 * Symbol Suggestions Component
 * Task 9: Shows symbol suggestions in a dropdown for the enhanced symbol input
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Search, TrendingUp, Building, Star } from 'lucide-react';
import { useAISymbolLookup } from '../hooks/useAISymbolLookup';
import type { SymbolLookupResult } from '../types/ai';

const SuggestionsContainer = styled.div<{ $isVisible: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  visibility: ${({ $isVisible }) => $isVisible ? 'visible' : 'hidden'};
  opacity: ${({ $isVisible }) => $isVisible ? 1 : 0};
  transform: ${({ $isVisible }) => $isVisible ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease;
`;

const SuggestionItem = styled.div<{ $isHighlighted: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: ${({ $isHighlighted }) => $isHighlighted ? '#f3f4f6' : 'white'};
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.15s ease;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const SuggestionContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const IconWrapper = styled.div<{ $type: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $type }) => {
    switch ($type) {
      case 'stock': return '#eff6ff';
      case 'etf': return '#f0fdf4';
      case 'crypto': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'stock': return '#3b82f6';
      case 'etf': return '#10b981';
      case 'crypto': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
`;

const SuggestionInfo = styled.div`
  flex: 1;
`;

const SymbolText = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: #111827;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const CompanyName = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
`;

const TypeBadge = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 500;
`;

const LoadingState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }
`;

interface SymbolSuggestionsProps {
  query: string;
  isVisible: boolean;
  onSelectSuggestion: (symbol: string, metadata?: SymbolLookupResult) => void;
  onOpenSearch?: () => void;
  maxSuggestions?: number;
  highlightedIndex?: number;
  onHighlightChange?: (index: number) => void;
  className?: string;
}

export const SymbolSuggestions: React.FC<SymbolSuggestionsProps> = ({
  query,
  isVisible,
  onSelectSuggestion,
  onOpenSearch,
  maxSuggestions = 5,
  highlightedIndex = -1,
  onHighlightChange,
  className
}) => {
  const [suggestions, setSuggestions] = useState<SymbolLookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getSuggestions } = useAISymbolLookup();

  // Fetch suggestions when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    const timeoutId = setTimeout(async () => {
      try {
        const response = await getSuggestions(query, { limit: maxSuggestions });
        
        if (response.success && response.data?.suggestions) {
          setSuggestions(response.data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.warn('Failed to fetch symbol suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      setIsLoading(false);
    };
  }, [query, maxSuggestions, getSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: SymbolLookupResult) => {
    onSelectSuggestion(suggestion.symbol, suggestion);
  }, [onSelectSuggestion]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = highlightedIndex < suggestions.length - 1 ? highlightedIndex + 1 : 0;
          onHighlightChange?.(nextIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = highlightedIndex > 0 ? highlightedIndex - 1 : suggestions.length - 1;
          onHighlightChange?.(prevIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
            handleSelectSuggestion(suggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          onHighlightChange?.(-1);
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, highlightedIndex, suggestions, onHighlightChange, handleSelectSuggestion]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <TrendingUp size={16} />;
      case 'etf':
        return <Building size={16} />;
      case 'crypto':
        return <Star size={16} />;
      default:
        return <Search size={16} />;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingState>
          Searching symbols...
        </LoadingState>
      );
    }

    if (suggestions.length === 0) {
      return (
        <EmptyState>
          No symbols found
          {onOpenSearch && (
            <>
              <br />
              <ActionButton onClick={onOpenSearch} style={{ marginTop: '0.5rem' }}>
                <Search size={14} style={{ marginRight: '0.25rem' }} />
                Try AI Search
              </ActionButton>
            </>
          )}
        </EmptyState>
      );
    }

    return suggestions.map((suggestion, index) => (
      <SuggestionItem
        key={`${suggestion.symbol}-${index}`}
        $isHighlighted={index === highlightedIndex}
        onClick={() => handleSelectSuggestion(suggestion)}
      >
        <SuggestionContent>
          <IconWrapper $type={suggestion.type || 'stock'}>
            {getIcon(suggestion.type || 'stock')}
          </IconWrapper>
          
          <SuggestionInfo>
            <SymbolText>{suggestion.symbol}</SymbolText>
            {suggestion.name && (
              <CompanyName>{suggestion.name}</CompanyName>
            )}
          </SuggestionInfo>
          
          <TypeBadge>
            {suggestion.type || 'stock'}
          </TypeBadge>
        </SuggestionContent>
      </SuggestionItem>
    ));
  };

  if (!isVisible) {
    return null;
  }

  return (
    <SuggestionsContainer 
      $isVisible={isVisible}
      className={className}
    >
      {renderContent()}
    </SuggestionsContainer>
  );
};

export default SymbolSuggestions;
