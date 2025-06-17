/**
 * Email Processing Test Configuration Helper
 * Helps configure IMAP settings for testing with root@10.0.0.83
 */

export const EMAIL_TEST_CONFIG = {
  // Server connection settings
  server: {
    host: '10.0.0.83',
    defaultPort: 993,
    secure: true
  },
  
  // Test configurations to try
  imapConfigs: [
    {
      name: 'IMAPS (Secure)',
      host: '10.0.0.83',
      port: 993,
      secure: true,
      auth: {
        user: 'root', // Adjust based on your actual email account
        pass: 'your_password_here' // Replace with actual password
      }
    },
    {
      name: 'IMAP with STARTTLS',
      host: '10.0.0.83',
      port: 143,
      secure: false,
      auth: {
        user: 'root',
        pass: 'your_password_here'
      }
    }
  ],
  
  // Sample test emails for processing
  testEmails: {
    stockBuy: {
      subject: 'Trade Confirmation - AAPL Purchase',
      from: 'noreply@wealthsimple.com',
      html: `
        <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p><strong>Account:</strong> TFSA</p>
          <p><strong>Transaction Type:</strong> Buy</p>
          <p><strong>Symbol:</strong> AAPL</p>
          <p><strong>Quantity:</strong> 10 shares</p>
          <p><strong>Price:</strong> $150.00</p>
          <p><strong>Total Cost:</strong> $1,500.00</p>
          <p><strong>Date:</strong> June 17, 2025 10:30 AM EST</p>
        </body>
        </html>
      `,
      text: `
Trade Confirmation

Account: TFSA
Transaction Type: Buy
Symbol: AAPL
Quantity: 10 shares
Price: $150.00
Total Cost: $1,500.00
Date: June 17, 2025 10:30 AM EST
      `
    },
    
    stockSell: {
      subject: 'Trade Confirmation - GOOGL Sale',
      from: 'noreply@wealthsimple.com',
      html: `
        <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p><strong>Account:</strong> RRSP</p>
          <p><strong>Transaction Type:</strong> Sell</p>
          <p><strong>Symbol:</strong> GOOGL</p>
          <p><strong>Quantity:</strong> 5 shares</p>
          <p><strong>Price:</strong> $2,500.00</p>
          <p><strong>Total Proceeds:</strong> $12,500.00</p>
          <p><strong>Date:</strong> June 17, 2025 11:15 AM EST</p>
        </body>
        </html>
      `
    },
    
    optionTrade: {
      subject: 'Your order has been filled',
      from: 'noreply@wealthsimple.com',
      html: `
        <html>
        <body>
          <h2>Order Filled</h2>
          <p><strong>Account:</strong> RRSP</p>
          <p><strong>Type:</strong> Limit Buy to Close</p>
          <p><strong>Option:</strong> TSLL 13.00 call</p>
          <p><strong>Contracts:</strong> 10</p>
          <p><strong>Average price:</strong> US$0.02</p>
          <p><strong>Total cost:</strong> US$27.50</p>
          <p><strong>Time:</strong> June 13, 2025 10:44 EDT</p>
        </body>
        </html>
      `
    },
    
    dividend: {
      subject: 'Dividend Payment - AAPL',
      from: 'noreply@wealthsimple.com',
      html: `
        <html>
        <body>
          <h2>Dividend Payment</h2>
          <p><strong>Account:</strong> TFSA</p>
          <p><strong>Symbol:</strong> AAPL</p>
          <p><strong>Dividend per share:</strong> $0.24</p>
          <p><strong>Shares owned:</strong> 100</p>
          <p><strong>Total dividend:</strong> $24.00</p>
          <p><strong>Payment date:</strong> June 17, 2025</p>
        </body>
        </html>
      `
    }
  },
  
  // Expected processing results for test emails
  expectedResults: {
    stockBuy: {
      account: 'TFSA',
      symbol: 'AAPL',
      type: 'buy',
      quantity: 10,
      price: 150.00,
      totalAmount: 1500.00,
      currency: 'USD'
    },
    
    stockSell: {
      account: 'RRSP',
      symbol: 'GOOGL', 
      type: 'sell',
      quantity: 5,
      price: 2500.00,
      totalAmount: 12500.00,
      currency: 'USD'
    },
    
    optionTrade: {
      account: 'RRSP',
      symbol: 'TSLL 13.00 call',
      type: 'sell', // "Buy to Close" = sell position
      quantity: 10,
      price: 0.02,
      totalAmount: 27.50,
      currency: 'USD'
    },
    
    dividend: {
      account: 'TFSA',
      symbol: 'AAPL',
      type: 'dividend',
      quantity: 100,
      price: 0.24,
      totalAmount: 24.00,
      currency: 'USD'
    }
  },
  
  // Test scenarios for different conditions
  testScenarios: [
    {
      name: 'Basic Stock Purchase',
      description: 'Test simple stock buy transaction',
      email: 'stockBuy',
      expectSuccess: true,
      checkDuplicates: false
    },
    {
      name: 'Stock Sale Processing', 
      description: 'Test stock sell transaction',
      email: 'stockSell',
      expectSuccess: true,
      checkDuplicates: false
    },
    {
      name: 'Option Trade Handling',
      description: 'Test complex option transaction',
      email: 'optionTrade',
      expectSuccess: true,
      checkDuplicates: false
    },
    {
      name: 'Dividend Payment',
      description: 'Test dividend transaction processing',
      email: 'dividend',
      expectSuccess: true,
      checkDuplicates: false
    },
    {
      name: 'Duplicate Detection',
      description: 'Test duplicate email handling',
      email: 'stockBuy', // Same as first test
      expectSuccess: false, // Should be caught as duplicate
      checkDuplicates: true
    }
  ],
  
  // Portfolio mappings for testing
  portfolioMappings: {
    'TFSA': 'tfsa-portfolio-id',
    'RRSP': 'rrsp-portfolio-id', 
    'Personal': 'personal-portfolio-id',
    'Margin': 'margin-portfolio-id'
  }
};

/**
 * Get IMAP configuration for your server
 */
export function getIMAPConfig(credentials: { username?: string; password?: string } = {}) {
  return {
    host: EMAIL_TEST_CONFIG.server.host,
    port: EMAIL_TEST_CONFIG.server.defaultPort,
    secure: EMAIL_TEST_CONFIG.server.secure,
    auth: {
      user: credentials.username || 'root',
      pass: credentials.password || 'your_password_here'
    },
    logger: false
  };
}

/**
 * Get test email by type
 */
export function getTestEmail(type: keyof typeof EMAIL_TEST_CONFIG.testEmails = 'stockBuy') {
  return EMAIL_TEST_CONFIG.testEmails[type] || EMAIL_TEST_CONFIG.testEmails.stockBuy;
}

/**
 * Get expected result for test email
 */
export function getExpectedResult(type: keyof typeof EMAIL_TEST_CONFIG.expectedResults = 'stockBuy') {
  return EMAIL_TEST_CONFIG.expectedResults[type] || EMAIL_TEST_CONFIG.expectedResults.stockBuy;
}

/**
 * Validate processing result against expected outcome
 */
export function validateProcessingResult(result: any, expected: any) {
  const errors = [];
  
  if (result.account !== expected.account) {
    errors.push(`Account mismatch: got ${result.account}, expected ${expected.account}`);
  }
  
  if (result.symbol !== expected.symbol) {
    errors.push(`Symbol mismatch: got ${result.symbol}, expected ${expected.symbol}`);
  }
  
  if (result.type !== expected.type) {
    errors.push(`Type mismatch: got ${result.type}, expected ${expected.type}`);
  }
  
  if (Math.abs(result.quantity - expected.quantity) > 0.01) {
    errors.push(`Quantity mismatch: got ${result.quantity}, expected ${expected.quantity}`);
  }
  
  if (Math.abs(result.price - expected.price) > 0.01) {
    errors.push(`Price mismatch: got ${result.price}, expected ${expected.price}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export default EMAIL_TEST_CONFIG;
