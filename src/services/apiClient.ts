/**
 * API Client Service
 * Handles HTTP requests to the backend API server
 */

// Get API base URL with enhanced server detection
function getApiBaseUrl(): string {
  // Check if enhanced server URL is stored (from detection in useEmailProcessing)
  if (typeof window !== 'undefined' && (window as any).__ENHANCED_SERVER_URL__) {
    return (window as any).__ENHANCED_SERVER_URL__;
  }
  
  // Use environment variable for API base URL
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback logic
  if (typeof window !== 'undefined') {
    // In production, try enhanced server on port 3001, fallback to current domain
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction) {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    // Development mode - use current domain
    return window.location.origin;
  }
  
  // Server-side fallback
  return 'http://localhost:3001';
}

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}${endpoint}`;
    
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`Making API request to: ${url}`);
    }
    
    // Add timeout to all requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (import.meta.env.DEV) {
        console.log(`API response status: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (import.meta.env.DEV) {
        console.log('API response data:', data);
      }
      clearTimeout(timeoutId);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout: ${endpoint}`);
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      
      if (import.meta.env.DEV) {
        console.error(`API request failed: ${endpoint}`, error);
      }
      throw error;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient;
