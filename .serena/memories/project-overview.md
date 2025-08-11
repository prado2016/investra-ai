# Investra AI - Project Overview

## Purpose
Investra AI is a React-based investment tracking and portfolio management application with automated email processing capabilities. It integrates with Supabase for database operations and uses AI services (Gemini, OpenRouter) to parse trading emails and automatically create transaction records.

## Tech Stack
- **Frontend**: React 19.1.0 with TypeScript
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: Styled Components
- **Email Processing**: IMAP (imapflow, mailparser)
- **AI Services**: Google Gemini AI, OpenRouter
- **Charts**: Recharts
- **Testing**: Vitest, Playwright
- **Error Tracking**: Sentry

## Core Features
1. **Portfolio Management**: Track multiple portfolios (TFSA, RRSP, etc.)
2. **Automated Email Processing**: Parse trading emails from brokers
3. **Transaction Management**: Automatically create transactions from parsed emails
4. **Asset Tracking**: Track stocks, options, ETFs, crypto, etc.
5. **Real-time Data**: Yahoo Finance integration for market data

## Main Components
- **SimpleEmailManagement**: Main email processing interface
- **Email Parsing**: AI-powered extraction of trading data from broker emails
- **Database Services**: Transaction and portfolio management
- **Authentication**: Supabase Auth integration