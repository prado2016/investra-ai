import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { Card, Button, Alert } from './ui';
import { RefreshCw, AlertTriangle, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only catches errors in this specific subtree
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  text-align: center;
`;

const ErrorIcon = styled.div`
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.error};
  
  svg {
    width: 4rem;
    height: 4rem;
  }
`;

const ErrorTitle = styled.h2`
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text.primary};
  font-size: 1.5rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  margin-bottom: 2rem;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1rem;
  line-height: 1.5;
  max-width: 500px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const ErrorDetails = styled.details`
  margin-top: 2rem;
  max-width: 600px;
  width: 100%;
  
  summary {
    cursor: pointer;
    font-weight: 500;
    color: ${props => props.theme.colors.text.secondary};
    margin-bottom: 1rem;
    
    &:hover {
      color: ${props => props.theme.colors.text.primary};
    }
  }
`;

const CodeBlock = styled.pre`
  background-color: ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.text.primary};
  padding: 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
`;

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to your error tracking service
    this.logErrorToService(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Placeholder for error logging service integration
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // In a real app, you would send this to services like:
    // - Sentry: Sentry.captureException(error, { extra: errorData });
    // - LogRocket: LogRocket.captureException(error);
    // - Bugsnag: Bugsnag.notify(error, event => { event.addMetadata('errorBoundary', errorData); });
    
    console.log('Error logged:', errorData);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleRefreshPage = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorUI() {
    const { error, errorInfo, errorId } = this.state;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Check if it's a network error
    const isNetworkError = error?.message?.includes('fetch') || 
                          error?.message?.includes('network') ||
                          error?.message?.includes('Failed to load');

    // Check if it's a chunk loading error (common in SPAs)
    const isChunkError = error?.message?.includes('ChunkLoadError') ||
                        error?.message?.includes('Loading chunk');

    return (
      <ErrorContainer>
        <Card variant="outlined" padding="lg">
          <ErrorIcon>
            <AlertTriangle />
          </ErrorIcon>
          
          <ErrorTitle>
            {isNetworkError 
              ? 'Connection Problem' 
              : isChunkError 
                ? 'App Update Available'
                : 'Something went wrong'
            }
          </ErrorTitle>
          
          <ErrorMessage>
            {isNetworkError 
              ? 'Unable to connect to our servers. Please check your internet connection and try again.'
              : isChunkError
                ? 'The app has been updated. Please refresh the page to get the latest version.'
                : 'An unexpected error occurred. Our team has been notified and is working on a fix.'
            }
          </ErrorMessage>

          {isDevelopment && (
            <Alert variant="warning" title="Development Mode" style={{ marginBottom: '1.5rem' }}>
              Error ID: {errorId} - Check console for detailed error information.
            </Alert>
          )}

          <ButtonGroup>
            <Button 
              variant="primary" 
              leftIcon={<RefreshCw />}
              onClick={this.handleRetry}
            >
              Try Again
            </Button>
            
            {isChunkError && (
              <Button 
                variant="secondary"
                leftIcon={<RefreshCw />}
                onClick={this.handleRefreshPage}
              >
                Refresh Page
              </Button>
            )}
            
            <Button 
              variant="outline" 
              leftIcon={<Home />}
              onClick={this.handleGoHome}
            >
              Go Home
            </Button>
          </ButtonGroup>

          {isDevelopment && error && (
            <ErrorDetails>
              <summary>
                <Bug style={{ display: 'inline', marginRight: '0.5rem' }} />
                Show Error Details
              </summary>
              <CodeBlock>
                <strong>Error:</strong> {error.message}
                {error.stack && (
                  <>
                    <br /><br />
                    <strong>Stack Trace:</strong>
                    <br />
                    {error.stack}
                  </>
                )}
                {errorInfo?.componentStack && (
                  <>
                    <br /><br />
                    <strong>Component Stack:</strong>
                    <br />
                    {errorInfo.componentStack}
                  </>
                )}
              </CodeBlock>
            </ErrorDetails>
          )}
        </Card>
      </ErrorContainer>
    );
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, render our default error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
