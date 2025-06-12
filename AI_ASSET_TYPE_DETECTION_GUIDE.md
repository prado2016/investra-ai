# AI Asset Type Detection Testing Guide

## 🎯 **Feature Overview**
The TransactionForm now automatically detects and sets the asset type when a symbol is entered using AI-powered parsing.

## 🧪 **How to Test**

### **1. Navigate to Transaction Form**
- Go to http://localhost:5173 in your browser
- Navigate to any page with a Transaction Form (e.g., add new transaction)

### **2. Test Stock Detection**
Try these inputs in the Symbol field:

| **Input** | **Expected Behavior** |
|-----------|----------------------|
| `AAPL` | Auto-sets to "Stock" |
| `apple stock` | AI converts to "AAPL" + sets to "Stock" |
| `tesla stock` | AI converts to "TSLA" + sets to "Stock" |
| `microsoft` | AI converts to "MSFT" + sets to "Stock" |

### **3. Test Option Detection**
Try these inputs in the Symbol field:

| **Input** | **Expected Behavior** |
|-----------|----------------------|
| `soxl jun 6 $17 call` | AI converts to "SOXL250606C00017000" + sets to "Option" |
| `aapl june 21 $200 call` | AI converts to "AAPL250621C00200000" + sets to "Option" |
| `tsla put $250 july 18` | AI converts to "TSLA250718P00250000" + sets to "Option" |
| `AAPL240315C00150000` | Pattern detection sets to "Option" |

### **4. Test ETF Detection**
Try these inputs in the Symbol field:

| **Input** | **Expected Behavior** |
|-----------|----------------------|
| `spy etf` | AI converts to "SPY" + sets to "ETF" (won't auto-set in form) |
| `qqq etf` | AI converts to "QQQ" + sets to "ETF" (won't auto-set in form) |

## 🔍 **What to Look For**

### **✅ Success Indicators:**
1. **Symbol converts correctly** (e.g., "apple stock" → "AAPL")
2. **Asset Type auto-sets** for Stock and Option only
3. **AI processing message appears** (e.g., "✨ Converted 'apple stock' → AAPL")
4. **No unnecessary updates** when type is already correct

### **🎯 Key Behaviors:**
- **Only Stock and Option auto-set** (as requested by user)
- **ETF, Crypto, etc. are detected but don't auto-set**
- **AI metadata takes priority** over pattern detection
- **Fallback to pattern detection** when AI fails

## 🛠 **Debug Console Test**

Open browser console and paste this for detailed testing:

```javascript
// Test the AI parser directly
import('/src/services/ai/enhancedSymbolParser.ts').then(({ EnhancedAISymbolParser }) => {
  const testCases = [
    'AAPL',
    'apple stock', 
    'soxl jun 6 $17 call',
    'AAPL240315C00150000'
  ];
  
  testCases.forEach(async (input) => {
    const result = await EnhancedAISymbolParser.parseQuery(input);
    console.log(`"${input}" → ${result.parsedSymbol} (${result.type})`);
  });
});
```

## 🎉 **Expected Results**

When working correctly, you should see:

1. **Natural language inputs** get converted to proper symbols
2. **Asset types auto-detect and set** for stocks and options
3. **AI processing indicators** show the conversion process
4. **Smooth user experience** with intelligent form filling

The feature combines AI-powered symbol parsing with smart asset type detection to streamline the transaction entry process!
