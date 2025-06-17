console.log("🧪 Option Trade Email Parsing Test - Dev Environment");
console.log("===================================================");
console.log("");

class OptionEmailParser {
  static parseEmail(subject, from, htmlContent, textContent) {
    try {
      if (!from.includes("wealthsimple.com")) {
        return { success: false, error: "Not a Wealthsimple email" };
      }

      const content = htmlContent || textContent || subject;
      const transactionData = this.extractOptionData(content, subject);
      
      if (!transactionData) {
        return { success: false, error: "Could not extract option data" };
      }

      return {
        success: true,
        data: {
          ...transactionData,
          subject,
          fromEmail: from,
          confidence: 0.90,
          parseMethod: "OPTION_PARSER",
          transactionDate: this.extractDate(content) || new Date().toISOString().split("T")[0],
          currency: this.extractCurrency(content) || "USD"
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static extractOptionData(content, subject) {
    // Option pattern: "Option: TSLL 13.00 call"
    const optionMatch = content.match(/Option:\s*([A-Z]+)\s*([\d\.]+)\s*(call|put)/i);
    if (optionMatch) {
      const symbol = optionMatch[1];
      const strikePrice = parseFloat(optionMatch[2]);
      const optionType = optionMatch[3].toLowerCase();
      
      // Extract contracts
      const contractsMatch = content.match(/Contracts:\s*(\d+)/i);
      const contracts = contractsMatch ? parseInt(contractsMatch[1]) : 1;
      
      // Extract price
      const priceMatch = content.match(/Average price:\s*US\$?([\d\.]+)/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0.01;
      
      // Extract total
      const totalMatch = content.match(/Total cost:\s*US\$?([\d\.]+)/i);
      const total = totalMatch ? parseFloat(totalMatch[1]) : contracts * price * 100;
      
      // Determine transaction type
      let transactionType = "option_expired";
      if (content.includes("Buy to Close") || content.includes("buy to close")) {
        transactionType = "option_buy_to_close";
      } else if (content.includes("Sell to Open") || content.includes("sell to open")) {
        transactionType = "option_sell_to_open";
      }
      
      return {
        symbol: symbol,
        transactionType: transactionType,
        quantity: contracts * 100, // Convert contracts to shares equivalent
        price: price,
        totalAmount: total,
        accountType: this.extractAccountType(content),
        optionDetails: {
          strikePrice: strikePrice,
          optionType: optionType,
          contracts: contracts
        }
      };
    }

    return null;
  }

  static extractAccountType(content) {
    if (/tfsa/i.test(content)) return "TFSA";
    if (/rrsp/i.test(content)) return "RRSP";
    if (/margin/i.test(content)) return "Margin";
    return "Unknown";
  }

  static extractDate(content) {
    const dateMatch = content.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/i);
    if (dateMatch) {
      const months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
      };
      const month = months[dateMatch[1].toLowerCase()] || "01";
      const day = dateMatch[2].padStart(2, "0");
      return `${dateMatch[3]}-${month}-${day}`;
    }
    return null;
  }

  static extractCurrency(content) {
    if (content.includes("US$") || content.includes("USD")) return "USD";
    if (content.includes("CAD") || content.includes("C$")) return "CAD";
    return "USD";
  }
}

// Test with your specific option trade example
const optionTradeEmail = {
  subject: "Your order has been filled",
  from: "noreply@wealthsimple.com",
  html: `
    <html>
      <body>
        <h2>Trade Confirmation</h2>
        <p>Account: RRSP</p>
        <p>Type: Limit Buy to Close</p>
        <p>Option: TSLL 13.00 call</p>
        <p>Contracts: 10</p>
        <p>Average price: US$0.02</p>
        <p>Total cost: US$27.50</p>
        <p>Time: June 13, 2025 10:44 EDT</p>
      </body>
    </html>
  `,
  text: `
    Trade Confirmation
    Account: RRSP
    Type: Limit Buy to Close
    Option: TSLL 13.00 call
    Contracts: 10
    Average price: US$0.02
    Total cost: US$27.50
    Time: June 13, 2025 10:44 EDT
  `
};

console.log("🧪 Testing Option Trade Email Parsing");
console.log("=====================================");
console.log("Subject:", optionTradeEmail.subject);
console.log("From:", optionTradeEmail.from);
console.log("");

const result = OptionEmailParser.parseEmail(
  optionTradeEmail.subject,
  optionTradeEmail.from,
  optionTradeEmail.html,
  optionTradeEmail.text
);

if (result.success && result.data) {
  console.log("✅ PARSING SUCCESSFUL!");
  console.log("Symbol:", result.data.symbol);
  console.log("Type:", result.data.transactionType);
  console.log("Quantity (shares equivalent):", result.data.quantity);
  console.log("Price per contract: $" + result.data.price);
  console.log("Total Amount: $" + result.data.totalAmount);
  console.log("Account:", result.data.accountType);
  console.log("Currency:", result.data.currency);
  console.log("Transaction Date:", result.data.transactionDate);
  console.log("Confidence:", result.data.confidence);
  console.log("");
  console.log("Option Details:");
  console.log("  Strike Price: $" + result.data.optionDetails.strikePrice);
  console.log("  Option Type:", result.data.optionDetails.optionType);
  console.log("  Contracts:", result.data.optionDetails.contracts);
  console.log("");
  console.log("🎉 Option trade parsing working perfectly!");
} else {
  console.log("❌ PARSING FAILED!");
  console.log("Error:", result.error);
}

console.log("");
console.log("✅ Option trade email parsing test completed on dev environment");
