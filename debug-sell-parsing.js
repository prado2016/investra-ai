#!/usr/bin/env node

/**
 * Debug Stock Sell Parsing - Dev Environment
 * Quick debug to fix the sell parsing issue
 */

console.log('🔍 Debugging Stock Sell Parsing Issue');
console.log('=====================================');

// Mock sell email data
const sellEmail = {
  subject: 'Your sell order has been filled',
  from: 'noreply@wealthsimple.com',
  html: `
    <html>
      <body>
        <h2>Trade Confirmation</h2>
        <p>Account: RRSP</p>
        <p>Type: Market Sell</p>
        <p>Symbol: TSLA</p>
        <p>Shares: 50</p>
        <p>Average price: $200.00</p>
        <p>Total proceeds: $10,000.00</p>
        <p>Time: June 17, 2025 11:15 EDT</p>
      </body>
    </html>
  `,
  text: 'You sold 50 shares of TSLA at $200.00 per share in your RRSP account.'
};

console.log('Email Content:');
console.log('Subject:', sellEmail.subject);
console.log('HTML:', sellEmail.html);
console.log('Text:', sellEmail.text);
console.log('');

// Test patterns
const sellPatterns = [
  /Symbol:\s*([A-Z]{1,5})[\s\S]*?Shares:\s*(\d+(?:\.\d+)?)/i,
  /Market Sell[\s\S]*?Symbol:\s*([A-Z]{1,5})[\s\S]*?Shares:\s*(\d+(?:\.\d+)?)/i,
  /(?:sold|sell)[\s\S]*?(\d+(?:\.\d+)?)\s*(?:shares?\s*(?:of\s*)?)?([A-Z]{1,5})/i
];

console.log('🧪 Testing Sell Patterns:');
console.log('==========================');

const content = sellEmail.html + ' ' + sellEmail.text;

sellPatterns.forEach((pattern, index) => {
  console.log(`\nPattern ${index + 1}: ${pattern.source}`);
  const match = content.match(pattern);
  
  if (match) {
    console.log('✅ MATCH FOUND!');
    console.log('Full match:', match[0]);
    console.log('Capture groups:', match.slice(1));
    
    let symbol, quantity;
    if (pattern.source.includes('Symbol:')) {
      symbol = match[1];
      quantity = match[2];
    } else {
      symbol = match[2];
      quantity = match[1];
    }
    
    console.log('Extracted Symbol:', symbol);
    console.log('Extracted Quantity:', quantity);
  } else {
    console.log('❌ No match');
  }
});

// Test price extraction
console.log('\n💰 Testing Price Extraction:');
console.log('=============================');

const pricePatterns = [
  /(?:Average price|price):\s*(?:US)?[\$]?([\d,]+\.?\d*)/i,
  /[\$]([\d,]+\.?\d*)/
];

pricePatterns.forEach((pattern, index) => {
  console.log(`\nPrice Pattern ${index + 1}: ${pattern.source}`);
  const match = content.match(pattern);
  
  if (match) {
    console.log('✅ PRICE MATCH!');
    console.log('Full match:', match[0]);
    console.log('Price value:', match[1]);
    console.log('Parsed price:', parseFloat(match[1].replace(/,/g, '')));
  } else {
    console.log('❌ No price match');
  }
});

console.log('\n🎯 Fix Recommendation:');
console.log('======================');

// Test if the issue is in the validation logic
function extractAccountType(content) {
  const accountMatch = content.match(/Account:\s*([A-Z]+)/i);
  return accountMatch ? accountMatch[1] : 'Unknown';
}

const symbol = 'TSLA';
const quantity = 50;
const price = 200.00;
const account = extractAccountType(content);

const result = {
  symbol: symbol,
  transactionType: 'sell',
  quantity: quantity,
  price: price,
  totalAmount: quantity * price,
  accountType: account
};

console.log('Expected result:', JSON.stringify(result, null, 2));
