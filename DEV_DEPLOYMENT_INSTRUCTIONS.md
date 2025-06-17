# Manual Deployment Instructions for Dev Environment (10.0.0.89)

## 🚀 Quick Deployment Steps

Since SSH works for you, here's exactly what to do:

### 1. SSH into your dev server
```bash
ssh root@10.0.0.89
```

### 2. Create project directory and setup
```bash
# Create directory
mkdir -p /opt/investra-email-tests
cd /opt/investra-email-tests

# Check if Node.js is installed
node --version
npm --version

# If Node.js is not installed, install it:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs build-essential
```

### 3. Copy the test file to your server
From your local machine, copy the standalone test file:

```bash
# Copy the test file to your dev server
scp /Users/eduardo/investra-ai/email-parsing-test-standalone.js root@10.0.0.89:/opt/investra-email-tests/
```

### 4. Run the email parsing tests
On your dev server:

```bash
cd /opt/investra-email-tests
node email-parsing-test-standalone.js
```

## 🎯 Expected Results

You should see output like:
```
🧪 Email Parsing Test Suite - Dev Environment (10.0.0.89)
==========================================================

📧 PHASE 1: Basic Email Parser Tests
====================================
🧪 Testing: Basic stock purchase parsing
Subject: Your order has been filled
From: noreply@wealthsimple.com
✅ PASS: Basic parsing successful
   Symbol: AAPL
   Type: buy
   Quantity: 100
   Price: $150
   Account: TFSA
   Confidence: 0.90

📧 PHASE 2: Multiple Email Type Tests
=====================================
🧪 Testing: Stock Buy
✅ PASS: Stock Buy - AAPL buy
🧪 Testing: Stock Sell  
✅ PASS: Stock Sell - TSLA sell
🧪 Testing: Dividend
✅ PASS: Dividend - MSFT dividend
🧪 Testing: Option Trade
✅ PASS: Option Trade - TSLL option_expired

📊 Results: 4/4 tests passed

📧 PHASE 3: Performance Test
=============================
🧪 Testing: Parsing 1000 emails
⏱️ Performance Results:
   Total Time: 45ms
   Average Time per Email: 0.045ms
   Emails per Second: 22222

📧 PHASE 4: Data Validation Test
=================================
✅ PASS: Data validation successful

📊 FINAL TEST SUMMARY
=====================
Total Test Phases: 4
Phases Passed: 4
Success Rate: 100%

🎉 ALL TESTS PASSED!
✅ Email parsing is working correctly on dev environment
✅ Ready for integration with email server
```

## 🔧 If You Encounter Issues

### Node.js not found:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
```

### Permission issues:
```bash
# Fix permissions
chmod +x email-parsing-test-standalone.js
```

### Test specific email:
```bash
# You can modify the test file to test with your own email content
# Edit the MOCK_WEALTHSIMPLE_EMAILS object in the file
```

## ✅ Success Criteria

✅ All 4 test phases pass  
✅ Performance test shows reasonable speed (< 50ms per email)  
✅ Data validation passes  
✅ No parsing errors  

## 🎯 After Tests Pass

Once the email parsing tests pass on your dev environment, you can:

1. **Test with real emails** - Copy actual Wealthsimple email content into the test
2. **Set up email server** - Configure IMAP/SMTP to receive emails
3. **Integrate with your app** - Connect the parser to your main application
4. **Deploy to production** - Move the working solution to production

## 📞 Quick Help

If tests fail, check:
- Is the email from a Wealthsimple domain?
- Does the email contain transaction information?
- Are the regex patterns matching your email format?

The standalone test file includes everything needed and doesn't depend on external modules, so it should work immediately on your dev server!
