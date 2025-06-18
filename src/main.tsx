import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { runProductionValidation, logValidationResults } from './utils/productionValidation'

// Run production validation in development and production
if (import.meta.env.NODE_ENV === 'production' || import.meta.env.DEV) {
  runProductionValidation().then(result => {
    logValidationResults(result);
    
    // In production, halt startup if critical errors exist
    if (import.meta.env.NODE_ENV === 'production' && !result.isValid) {
      console.error('🚨 Application startup halted due to validation errors');
      // Don't render the app if validation fails in production
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `
          <div style="
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            background: #fee; 
            color: #c00; 
            font-family: system-ui;
            text-align: center;
            padding: 20px;
          ">
            <div>
              <h1>⚠️ Configuration Error</h1>
              <p>The application is not properly configured for production.</p>
              <p>Please check the console for detailed error messages.</p>
            </div>
          </div>
        `;
      }
      return;
    }
    
    // Render the app if validation passes or in development
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }).catch(error => {
    console.error('Production validation failed:', error);
    // Still render in case of validation errors in development
    if (import.meta.env.DEV) {
      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    }
  });
} else {
  // No validation in other environments
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
