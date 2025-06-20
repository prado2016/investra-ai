/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __DEBUG__: JSON.stringify(true)
  },
  // Enable source maps for better debugging
  optimizeDeps: {
    include: ['yahoo-finance2'],
    exclude: []
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'yahoo-finance': ['yahoo-finance2']
        }
      }
    }
  },
  server: {
    open: !process.env.CI, // Don't open browser in CI
    host: process.env.CI ? '127.0.0.1' : true, // Specific host for CI
    port: 5173,
    strictPort: true, // Fail if port is busy
    proxy: {
      // Proxy backend API requests to avoid Chrome security warnings
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('🔴 API Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('🔵 Proxying API Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('🟢 API Response:', proxyRes.statusCode, req.url);
          });
        },
      },
      // Proxy Yahoo Finance API requests through a CORS proxy
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('🔴 Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('🔵 Sending Request to Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('🟢 Received Response from Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
});
