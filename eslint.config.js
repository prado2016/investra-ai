import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'build/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      '.github/',
      'tools/', // Skip tools directory
      'public/', // Skip public directory (browser scripts)
      'tests/debug/', // Skip debug test scripts
      'tests/', // Skip tests directory (e2e tests)
      'email-puller/dist/', // Explicitly ignore email-puller's dist
      'server/dist/', // Explicitly ignore server's dist
      'server/ecosystem.config.js', // Ignore PM2 config file
      '**/*.d.ts', // Ignore all declaration files
    ],
  },
  // Base JavaScript rules
  js.configs.recommended,

  // TypeScript recommended rules (applied globally to TS files)
  ...typescriptEslint.configs.recommended,

  // React and JSX specific rules for src/
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        // Custom globals for browser environment
        __DEV__: 'readonly',
        __DEBUG__: 'readonly',
        NodeJS: 'readonly',
        localStorage: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        performance: 'readonly',
        indexedDB: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly',
        process: 'readonly', // Add process for browser environment
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Custom React rules
      'react-hooks/exhaustive-deps': 'warn', // Re-enable exhaustive-deps
      'no-duplicate-case': 'off', // Disable for now, seems to be a bug with styled-components
      'react/no-unescaped-entities': 'off', // Disable for now
    },
  },

  // TypeScript files in src/ (specific project config)
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', }],
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off', // Disable for now
    },
  },

  // TypeScript files for vite.config.ts
  {
    files: ['vite.config.ts'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: './tsconfig.node.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', }],
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off', // Disable for now
    },
  },

  // TypeScript files in email-puller/
  {
    files: ['email-puller/src/**/*.ts'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: './email-puller/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', }],
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off', // Disable for now
    },
  },

  // TypeScript files in server/
  {
    files: ['server/**/*.ts'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: './server/tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', }],
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off', // Disable for now
    },
  },

  // JavaScript files in dist directories (compiled output)
  {
    files: ['email-puller/dist/**/*.js', 'server/dist/**/*.js'],
    languageOptions: {
      // No parser needed, use default espree
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // Relax rules for compiled JavaScript files
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off',
    },
  },

  // JavaScript test files
  {
    files: ['test-auth.js', 'test-server-auth.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // Root-level Node.js script files
  {
    files: ['*.js'],
    ignores: ['*.config.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-console': 'off',
      'no-debugger': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-prototype-builtins': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off',
    },
  },

  // Declaration files (d.ts)
  {
    files: ['**/*.d.ts', 'imapflow.d.ts', '@types/**/*.d.ts'],
    languageOptions: {
      // No parser needed for declaration files, as they are not compiled directly
      // The default parser (espree) will be used.
      // parserOptions: {},
      globals: {
        ...globals.browser,
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        indexedDB: 'readonly',
        crypto: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        localStorage: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];