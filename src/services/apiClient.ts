/**
 * API Client Service
 * Handles HTTP requests to the backend API server
 */

// Use environment variable for API base URL, fallback to current domain for production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
);

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
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
