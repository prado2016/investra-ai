# 📧 Email Processing Testing Guide - Step by Step

## 🎯 Testing Your Email System at root@10.0.0.83

### **Prerequisites Setup**

1. **Install Dependencies** (if not already installed):
   ```bash
   cd /Users/eduardo/investra-ai
   npm install imapflow mailparser
   ```

2. **Basic Connection Test**:
   ```bash
   # First, test basic connectivity
   telnet 10.0.0.83 993
   # Should connect if IMAPS is working
   
   # Test SMTP if needed
   telnet 10.0.0.83 25
   telnet 10.0.0.83 587
   ```

3. **Run Connection Test**:
   ```bash
   node test-email-connection.js
   ```

---

## 📋 **Phase 1: Infrastructure Testing**

### **1.1 Email Server Status Check**
- [ ] **Server Connectivity**: Can reach 10.0.0.83
- [ ] **IMAP Port (993)**: SSL/TLS connection works  
- [ ] **IMAP Port (143)**: Plain/STARTTLS connection works
- [ ] **SMTP Ports**: 25, 587 accessible
- [ ] **Authentication**: Login credentials work

**How to Test**:
```bash
# Test each port
nc -zv 10.0.0.83 993    # IMAPS
nc -zv 10.0.0.83 143    # IMAP  
nc -zv 10.0.0.83 587    # SMTP Submission
nc -zv 10.0.0.83 25     # SMTP

# Run comprehensive connection test
node test-email-connection.js
```

### **1.2 Application Configuration**
- [ ] **IMAP Settings**: Configure in app to use 10.0.0.83
- [ ] **Account Details**: Email address and password
- [ ] **Portfolio Mapping**: Default portfolio for imported transactions
- [ ] **Processing Interval**: Set to reasonable frequency (30 seconds)

**Configuration Location**: 
- UI: Navigate to Email Import → Overview → Configure IMAP Settings
- Code: Update `src/services/email/imapProcessorService.ts`

---

## 📋 **Phase 2: UI Component Testing**

### **2.1 Email Processing Dashboard**
**Location**: `/dashboard` or Email Import section

**Test Cases**:
- [ ] **Service Status Indicator**: 
  - Green = Connected and processing
  - Orange = Connected but paused  
  - Red = Connection error
- [ ] **Processing Metrics Display**:
  - Total emails processed
  - Success/failure counts
  - Processing time averages
- [ ] **Real-time Updates**: Status changes automatically
- [ ] **Control Buttons**: Start/Stop/Restart service
- [ ] **Processing Queue**: View pending emails

**Testing Steps**:
1. Open your development server: `npm run dev`
2. Navigate to Email Import dashboard
3. Check that all status boxes display correctly
4. Test service control buttons
5. Verify real-time updates work

### **2.2 Failed Import Resolution**
**Location**: Email Import → Failed Imports tab

**Test Cases**:
- [ ] **Error List Display**: Shows failed email imports
- [ ] **Error Details**: Click to see detailed error info
- [ ] **Filter Options**: Filter by error type, date, status
- [ ] **Resolution Actions**: Retry, manual fix, skip, delete
- [ ] **Bulk Operations**: Select multiple items for batch processing

### **2.3 Manual Review Queue**
**Location**: Email Import → Manual Review tab

**Test Cases**:
- [ ] **Queue Display**: Shows emails requiring manual review
- [ ] **Item Details**: View email content and parsing results
- [ ] **Review Actions**: Approve, reject, modify transaction details
- [ ] **Priority Sorting**: Most important items first

---

## 📋 **Phase 3: End-to-End Processing Tests**

### **3.1 Test Email Processing Workflow**

**Step 1: Prepare Test Emails**
Create sample Wealthsimple-style emails to test with:

```html
Subject: Trade Confirmation - AAPL Purchase
From: noreply@wealthsimple.com

<html>
<body>
<h2>Trade Confirmation</h2>
<p>Account: TFSA</p>
<p>Transaction: Buy</p>
<p>Symbol: AAPL</p> 
<p>Quantity: 10 shares</p>
<p>Price: $150.00</p>
<p>Total: $1,500.00</p>
<p>Date: June 17, 2025 10:30 AM EST</p>
</body>
</html>
```

**Step 2: Email Reception Test**
- [ ] Send test email to your configured email address
- [ ] Verify email appears in IMAP server
- [ ] Check that processing service detects new email
- [ ] Monitor processing status in real-time

**Step 3: Email Parsing Test**  
- [ ] Confirm email content extracted correctly
- [ ] Verify transaction details identified:
  - Account type (TFSA, RRSP, etc.)
  - Transaction type (buy, sell, dividend)
  - Symbol (AAPL, etc.)
  - Quantity and price
  - Date and time
- [ ] Check symbol lookup succeeds
- [ ] Validate amount and date parsing

**Step 4: Transaction Creation Test**
- [ ] Verify transaction appears in correct portfolio
- [ ] Check all transaction fields populated correctly:
  - Symbol matches
  - Quantity and price correct
  - Date/time accurate
  - Portfolio assignment correct
- [ ] Confirm portfolio statistics update
- [ ] Validate position calculations

**Step 5: Completion Verification**
- [ ] Receive success notification
- [ ] Check notification contains correct details
- [ ] Verify email marked as processed
- [ ] Confirm no duplicate processing occurs

---

## 📋 **Phase 4: Error Handling Tests**

### **4.1 Duplicate Detection**
**Test Scenario**: Process same email twice

**Steps**:
1. **Initial Processing**:
   - [ ] Process first email successfully
   - [ ] Verify transaction created

2. **Duplicate Test**:
   - [ ] Send identical email
   - [ ] Confirm duplicate detection triggers
   - [ ] Verify email goes to manual review queue
   - [ ] Check no duplicate transaction created

3. **Resolution Test**:
   - [ ] Review duplicate in queue
   - [ ] Test approve/reject actions
   - [ ] Confirm final transaction state

### **4.2 Error Conditions**
**Test Various Error Scenarios**:

1. **Unknown Symbol**:
   - [ ] Email with non-existent stock symbol
   - [ ] Verify error captured correctly
   - [ ] Check manual resolution options

2. **Malformed Email**:
   - [ ] Email missing required data
   - [ ] Corrupted HTML content
   - [ ] Verify graceful error handling

3. **Network Issues**:
   - [ ] Simulate connection timeout
   - [ ] Test retry mechanisms
   - [ ] Verify error logging

---

## 📋 **Phase 5: Performance Testing**

### **5.1 Processing Speed**
**Metrics to Monitor**:
- [ ] **Email Processing Time**: < 30 seconds per email
- [ ] **UI Response Time**: Dashboard updates within 5 seconds
- [ ] **Notification Delivery**: Alerts sent within 1 minute
- [ ] **System Resource Usage**: Monitor CPU/memory

**Testing Method**:
```bash
# Send multiple test emails
for i in {1..10}; do
  # Send test email via your method
  echo "Sent test email $i"
  sleep 2
done

# Monitor processing in dashboard
# Check logs for timing info
```

### **5.2 Load Testing**
**Test Cases**:
- [ ] **Multiple Emails**: Process 5-10 emails simultaneously
- [ ] **Large Email Size**: Test with emails containing attachments
- [ ] **Extended Operation**: Run for several hours

---

## 📋 **Phase 6: Integration Testing**

### **6.1 Portfolio Integration**
- [ ] **Multi-Portfolio Support**: Test routing to different portfolios
- [ ] **Portfolio Creation**: Verify new portfolios created as needed
- [ ] **Analytics Updates**: Confirm dashboard reflects imported data
- [ ] **Position Calculations**: Check quantity and value updates

### **6.2 Notification System**
- [ ] **Success Notifications**: Verify import success alerts
- [ ] **Failure Notifications**: Check error notifications sent
- [ ] **Review Required**: Test manual review notifications
- [ ] **Multi-Channel**: Test email, in-app, SMS if configured

---

## 🛠 **Troubleshooting Common Issues**

### **Connection Problems**
```bash
# Test basic connectivity
ping 10.0.0.83

# Test specific ports
telnet 10.0.0.83 993
nc -zv 10.0.0.83 993

# Check firewall
# On your server at 10.0.0.83:
sudo ufw status
sudo iptables -L
```

### **Authentication Issues**
- Check email account exists on server
- Verify password is correct
- Test with email client (Thunderbird, Outlook)
- Check server logs for authentication failures

### **Processing Failures**
- Review email format matches expected pattern
- Check symbol lookup service is working
- Verify portfolio mapping configuration
- Review application logs for specific errors

---

## 📊 **Success Criteria Checklist**

### **Functional Requirements**
- [ ] Email server connection established
- [ ] Emails processed automatically every 30 seconds
- [ ] Transaction data extracted accurately (>95% success rate)
- [ ] Transactions created in correct portfolios
- [ ] Duplicate detection working
- [ ] Manual review queue functional
- [ ] Notifications sent appropriately

### **Performance Requirements**
- [ ] Processing time < 30 seconds per email
- [ ] UI responsive (< 5 second updates)
- [ ] System handles 10+ emails without issues
- [ ] Error recovery works correctly

### **User Experience**
- [ ] Dashboard provides clear status information
- [ ] Error messages are informative
- [ ] Manual review process is intuitive
- [ ] Notifications are timely and accurate

---

## 🚀 **Next Steps After Testing**

1. **Production Deployment**: Configure with real Wealthsimple emails
2. **User Training**: Document setup process for end users
3. **Monitoring Setup**: Configure alerts and logging
4. **Backup Strategy**: Implement data backup procedures
5. **Maintenance Plan**: Schedule regular system checks

Remember to test with mock data first before using real financial emails!
