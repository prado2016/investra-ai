Group>
            <Label>Validation Only</Label>
            <EnhancedSymbolInput
              value={validationSymbol}
              onChange={setValidationSymbol}
              onValidation={handleValidation}
              placeholder="Test symbol validation"
              showValidation={true}
              showSuggestions={false}
              showAIButton={false}
            />
          </TestGroup>
          
          <TestGroup>
            <Label>Suggestions Only</Label>
            <EnhancedSymbolInput
              value={suggestionSymbol}
              onChange={setSuggestionSymbol}
              placeholder="Test autocomplete"
              showValidation={false}
              showSuggestions={true}
              showAIButton={false}
            />
          </TestGroup>
        </TestRow>

        <InfoBox>
          🔍 <strong>Try these:</strong> Type "AAPL", "MSFT", "TSLA", "GOOGL", or any company name to test validation and suggestions!
        </InfoBox>
      </Section>

      {/* Symbol Search Modal Test */}
      <Section>
        <SectionTitle>
          <Brain size={20} />
          AI Symbol Search Modal
        </SectionTitle>
        
        <TestGroup>
          <Label>Modal Search Interface</Label>
          <ButtonGroup>
            <AILookupButton
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Open Search Modal
            </AILookupButton>
          </ButtonGroup>
        </TestGroup>

        <SymbolSearchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectSymbol={handleModalSelection}
          initialQuery=""
        />

        <InfoBox>
          🚀 <strong>Modal Features:</strong> Search with filters, real-time results, asset type filtering, and confidence scoring!
        </InfoBox>
      </Section>

      {/* Results Display */}
      <Section>
        <SectionTitle>
          <CheckCircle size={20} />
          Test Results
        </SectionTitle>
        
        <TestGroup>
          <Label>Selected Symbols</Label>
          <ResultDisplay>
            {selectedResults.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                No symbols selected yet. Try using the AI inputs above!
              </div>
            ) : (
              selectedResults.map((result, index) => (
                <ResultItem key={index}>
                  <div>
                    <strong>{result.symbol}</strong> - {result.name}
                    <br />
                    <small style={{ color: '#6b7280' }}>
                      {result.exchange} • {result.assetType.toUpperCase()}
                    </small>
                  </div>
                  <StatusBadge $status={result.confidence > 0.8 ? 'success' : 'warning'}>
                    <CheckCircle size={12} />
                    {Math.round(result.confidence * 100)}%
                  </StatusBadge>
                </ResultItem>
              ))
            )}
          </ResultDisplay>
        </TestGroup>

        <TestGroup>
          <Label>Validation Results</Label>
          <ResultDisplay>
            {validationResults.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                No validation tests yet. Try typing in the validation input above!
              </div>
            ) : (
              validationResults.map((result, index) => (
                <ResultItem key={index}>
                  <div>
                    <strong>{result.symbol}</strong>
                    <br />
                    <small style={{ color: '#6b7280' }}>
                      {result.timestamp}
                      {result.suggestion && ` • Suggested: ${result.suggestion}`}
                    </small>
                  </div>
                  <StatusBadge $status={result.isValid ? 'success' : 'error'}>
                    {result.isValid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {result.isValid ? 'Valid' : 'Invalid'}
                  </StatusBadge>
                </ResultItem>
              ))
            )}
          </ResultDisplay>
        </TestGroup>
      </Section>

      {/* Feature Overview */}
      <Section>
        <SectionTitle>
          <TrendingUp size={20} />
          Feature Overview
        </SectionTitle>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>🧠 AI-Powered Search</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Intelligent symbol lookup using natural language queries with confidence scoring.
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>⚡ Real-time Suggestions</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Autocomplete dropdown with debounced search and keyboard navigation support.
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>✅ Symbol Validation</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Instant validation with visual feedback and smart correction suggestions.
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>🔍 Comprehensive Modal</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Full-featured search interface with filtering, results, and metadata display.
            </p>
          </div>
        </div>
      </Section>

      {/* Usage Instructions */}
      <Section style={{ background: '#f0f9ff', borderColor: '#93c5fd' }}>
        <SectionTitle style={{ color: '#1e40af' }}>
          📚 How to Test
        </SectionTitle>
        
        <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
          <p><strong>1. Button Testing:</strong> Try different button variants and states. Hover for tooltips.</p>
          <p><strong>2. Symbol Input:</strong> Type symbols like "AAPL", "MSFT", or company names like "Apple" or "Microsoft".</p>
          <p><strong>3. Suggestions:</strong> Start typing to see real-time autocomplete suggestions appear.</p>
          <p><strong>4. Validation:</strong> Watch for visual feedback (green checkmark = valid, red X = invalid).</p>
          <p><strong>5. AI Search:</strong> Click the brain icon or "Open Search Modal" for comprehensive search.</p>
          <p><strong>6. Keyboard Navigation:</strong> Use arrow keys and Enter in suggestion dropdowns.</p>
        </div>
      </Section>
    </TestContainer>
  );
};

export default AISymbolInputTest;
