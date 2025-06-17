/**
 * Test samples for Wealthsimple email parsing
 * These are mock email formats based on common patterns
 */

export const MOCK_WEALTHSIMPLE_EMAILS = {
  stockBuy: {
    subject: "Trade Confirmation - AAPL Purchase",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p>Your order has been executed successfully.</p>
          
          <div class="trade-details">
            <h3>Transaction Details</h3>
            <p><strong>Account:</strong> TFSA - Tax-Free Savings Account</p>
            <p><strong>Action:</strong> Bought 100 shares of AAPL</p>
            <p><strong>Price:</strong> $150.25 per share</p>
            <p><strong>Total Amount:</strong> $15,025.00</p>
            <p><strong>Execution Time:</strong> January 15, 2025 at 10:30 AM EST</p>
            <p><strong>Order ID:</strong> WS123456789</p>
          </div>
          
          <div class="company-info">
            <p><strong>Security:</strong> Apple Inc. (AAPL)</p>
            <p><strong>Exchange:</strong> NASDAQ</p>
            <p><strong>Currency:</strong> USD</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Trade Confirmation
      
      Your order has been executed successfully.
      
      Transaction Details:
      Account: TFSA - Tax-Free Savings Account
      Action: Bought 100 shares of AAPL
      Price: $150.25 per share
      Total Amount: $15,025.00
      Execution Time: January 15, 2025 at 10:30 AM EST
      Order ID: WS123456789
      
      Security: Apple Inc. (AAPL)
      Exchange: NASDAQ
      Currency: USD
    `
  },

  stockSell: {
    subject: "Trade Confirmation - TSLA Sale",
    from: "trade@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Order Filled</h2>
          <p>Your sell order has been completed.</p>
          
          <div class="transaction">
            <p><strong>Account Type:</strong> RRSP</p>
            <p><strong>Transaction:</strong> Sold 50 shares of TSLA</p>
            <p><strong>Execution Price:</strong> $248.75</p>
            <p><strong>Gross Proceeds:</strong> $12,437.50</p>
            <p><strong>Commission:</strong> $0.00</p>
            <p><strong>Net Proceeds:</strong> $12,437.50</p>
            <p><strong>Settlement Date:</strong> 2025-01-17</p>
            <p><strong>Trade Date:</strong> 2025-01-15</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Order Filled
      
      Your sell order has been completed.
      
      Account Type: RRSP
      Transaction: Sold 50 shares of TSLA
      Execution Price: $248.75
      Gross Proceeds: $12,437.50
      Commission: $0.00
      Net Proceeds: $12,437.50
      Settlement Date: 2025-01-17
      Trade Date: 2025-01-15
    `
  },

  canadianStock: {
    subject: "Confirmation: CNR Purchase Complete",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h1>Trade Executed</h1>
          <p>Your purchase order has been filled.</p>
          
          <table>
            <tr><td>Account:</td><td>Margin Account</td></tr>
            <tr><td>Symbol:</td><td>CNR.TO</td></tr>
            <tr><td>Company:</td><td>Canadian National Railway Company</td></tr>
            <tr><td>Action:</td><td>Buy</td></tr>
            <tr><td>Quantity:</td><td>75 shares</td></tr>
            <tr><td>Price:</td><td>C$165.50</td></tr>
            <tr><td>Total:</td><td>C$12,412.50</td></tr>
            <tr><td>Time:</td><td>09:45 EST on 2025-01-15</td></tr>
          </table>
        </body>
      </html>
    `,
    text: `
      Trade Executed
      
      Your purchase order has been filled.
      
      Account: Margin Account
      Symbol: CNR.TO
      Company: Canadian National Railway Company
      Action: Buy
      Quantity: 75 shares
      Price: C$165.50
      Total: C$12,412.50
      Time: 09:45 EST on 2025-01-15
    `
  },

  optionExpired: {
    subject: "Option Expiration Notice - NVDA Call",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Option Expiration</h2>
          <p>The following option in your account has expired.</p>
          
          <div class="option-details">
            <p><strong>Account:</strong> Cash Account</p>
            <p><strong>Option:</strong> NVDA MAY 30 $108 CALL</p>
            <p><strong>Quantity:</strong> 2 contracts</p>
            <p><strong>Expiration Date:</strong> May 30, 2025</p>
            <p><strong>Strike Price:</strong> $108.00</p>
            <p><strong>Status:</strong> Expired Out of the Money</p>
            <p><strong>Value:</strong> $0.00</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Option Expiration
      
      The following option in your account has expired.
      
      Account: Cash Account
      Option: NVDA MAY 30 $108 CALL
      Quantity: 2 contracts
      Expiration Date: May 30, 2025
      Strike Price: $108.00
      Status: Expired Out of the Money
      Value: $0.00
    `
  },

  dividend: {
    subject: "Dividend Payment - RY.TO",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Dividend Received</h2>
          <p>A dividend payment has been credited to your account.</p>
          
          <div class="dividend-info">
            <p><strong>Account:</strong> TFSA</p>
            <p><strong>Security:</strong> Royal Bank of Canada (RY.TO)</p>
            <p><strong>Payment Date:</strong> January 15, 2025</p>
            <p><strong>Record Date:</strong> December 15, 2024</p>
            <p><strong>Dividend Rate:</strong> C$1.38 per share</p>
            <p><strong>Shares Held:</strong> 100</p>
            <p><strong>Gross Amount:</strong> C$138.00</p>
            <p><strong>Withholding Tax:</strong> C$0.00</p>
            <p><strong>Net Amount:</strong> C$138.00</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Dividend Received
      
      A dividend payment has been credited to your account.
      
      Account: TFSA
      Security: Royal Bank of Canada (RY.TO)
      Payment Date: January 15, 2025
      Record Date: December 15, 2024
      Dividend Rate: C$1.38 per share
      Shares Held: 100
      Gross Amount: C$138.00
      Withholding Tax: C$0.00
      Net Amount: C$138.00
    `
  },

  etfPurchase: {
    subject: "ETF Purchase Confirmation - VTI",
    from: "trade@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Transaction Complete</h2>
          <p>Your ETF purchase has been executed.</p>
          
          <div class="etf-details">
            <p><strong>Portfolio:</strong> RRSP - Registered Retirement Savings Plan</p>
            <p><strong>ETF:</strong> Vanguard Total Stock Market ETF (VTI)</p>
            <p><strong>Transaction Type:</strong> Purchase</p>
            <p><strong>Units:</strong> 25.5 shares</p>
            <p><strong>Price per Unit:</strong> $235.42 USD</p>
            <p><strong>Total Cost:</strong> $6,003.21 USD</p>
            <p><strong>Exchange Rate:</strong> 1 USD = 1.35 CAD</p>
            <p><strong>CAD Equivalent:</strong> $8,104.33 CAD</p>
            <p><strong>Execution:</strong> 2025-01-15 14:22:15 EST</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Transaction Complete
      
      Your ETF purchase has been executed.
      
      Portfolio: RRSP - Registered Retirement Savings Plan
      ETF: Vanguard Total Stock Market ETF (VTI)
      Transaction Type: Purchase
      Units: 25.5 shares
      Price per Unit: $235.42 USD
      Total Cost: $6,003.21 USD
      Exchange Rate: 1 USD = 1.35 CAD
      CAD Equivalent: $8,104.33 CAD
      Execution: 2025-01-15 14:22:15 EST
    `
  }
};

export const INVALID_EMAILS = {
  nonWealthsimple: {
    subject: "Your TD Ameritrade Trade Confirmation",
    from: "notifications@tdameritrade.com",
    html: "<p>This is not a Wealthsimple email</p>",
    text: "This is not a Wealthsimple email"
  },

  nonTransaction: {
    subject: "Welcome to Wealthsimple",
    from: "welcome@wealthsimple.com",
    html: "<p>Welcome to our platform!</p>",
    text: "Welcome to our platform!"
  },

  malformed: {
    subject: "Something went wrong",
    from: "error@wealthsimple.com",
    html: "<p>Error processing request</p>",
    text: "Error processing request"
  }
};

export const EDGE_CASES = {
  fractionalShares: {
    subject: "Trade Confirmation - Fractional Share Purchase",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p><strong>Account:</strong> TFSA</p>
          <p><strong>Action:</strong> Bought 0.75 shares of AMZN</p>
          <p><strong>Price:</strong> $3,200.00 per share</p>
          <p><strong>Total:</strong> $2,400.00</p>
        </body>
      </html>
    `,
    text: `
      Trade Confirmation
      Account: TFSA
      Action: Bought 0.75 shares of AMZN
      Price: $3,200.00 per share
      Total: $2,400.00
    `
  },

  highValue: {
    subject: "Large Transaction Confirmation",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Confirmation</h2>
          <p><strong>Account:</strong> Margin</p>
          <p><strong>Action:</strong> Sold 10,000 shares of XYZ</p>
          <p><strong>Price:</strong> $125.75 per share</p>
          <p><strong>Total:</strong> $1,257,500.00</p>
        </body>
      </html>
    `,
    text: `
      Trade Confirmation
      Account: Margin
      Action: Sold 10,000 shares of XYZ
      Price: $125.75 per share
      Total: $1,257,500.00
    `
  },

  foreignCurrency: {
    subject: "International Stock Purchase - ASML",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Trade Executed</h2>
          <p><strong>Account:</strong> RRSP</p>
          <p><strong>Action:</strong> Bought 15 shares of ASML</p>
          <p><strong>Price:</strong> €725.30 per share</p>
          <p><strong>Total:</strong> €10,879.50</p>
          <p><strong>CAD Equivalent:</strong> $15,892.45</p>
        </body>
      </html>
    `,
    text: `
      Trade Executed
      Account: RRSP
      Action: Bought 15 shares of ASML
      Price: €725.30 per share
      Total: €10,879.50
      CAD Equivalent: $15,892.45
    `
  },

  multipleAccountTypes: {
    subject: "Multiple Transactions Summary",
    from: "notifications@wealthsimple.com",
    html: `
      <html>
        <body>
          <h2>Daily Transaction Summary</h2>
          
          <div class="tfsa-trades">
            <h3>TFSA Transactions</h3>
            <p>Bought 50 shares of TD.TO at $82.50</p>
          </div>
          
          <div class="rrsp-trades">
            <h3>RRSP Transactions</h3>
            <p>Sold 25 shares of SHOP.TO at $95.25</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Daily Transaction Summary
      
      TFSA Transactions:
      Bought 50 shares of TD.TO at $82.50
      
      RRSP Transactions:
      Sold 25 shares of SHOP.TO at $95.25
    `
  }
};
