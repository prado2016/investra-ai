# Investra AI - AI-Powered Investment Analytics

A cutting-edge AI-powered investment portfolio management and analytics platform built with React, TypeScript, and Vite.

## Features

- **AI-Powered Analytics**: Advanced machine learning for portfolio optimization
- **Real-time Portfolio Tracking**: Live market data and position monitoring  
- **Intelligent Insights**: AI-driven investment recommendations and market analysis
- **Performance Visualization**: Interactive charts and advanced reporting
- **Transaction Management**: Comprehensive trade tracking and analysis
- **Dark/Light Theme**: Premium golden theme with professional aesthetics

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite for lightning-fast development
- **Styling**: Modern CSS with golden design system
- **Charts**: Advanced visualizations with Chart.js
- **Backend**: Supabase for real-time data and authentication
- **AI Integration**: Google Generative AI for intelligent analytics

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
# CI Testing
