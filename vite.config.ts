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
    open: true, // Open browser automatically
    host: true, // Listen on all network interfaces
    port: 5173,
    proxy: {
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
