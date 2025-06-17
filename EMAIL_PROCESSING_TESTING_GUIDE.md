# 📧 Email Processing System Testing Guide

This guide provides a comprehensive testing plan for the completed email processing system in Investra AI.

## 🎯 Overview

The email processing system includes:
- **IMAP Email Processor** - Automatically fetches and processes emails
- **Wealthsimple Email Parser** - Extracts transaction data from emails  
- **Manual Review Queue** - Handles emails requiring human review
- **Failed Import Resolution** - Manages and fixes failed email processing
- **Notification System** - Real-time alerts for processing events
- **Portfolio Integration** - Automatic transaction creation

---

## 📋 Phase 1: UI Component Testing

### 1.1 Email Processing Status Dashboard
**Location**: Main dashboard or dedicated email section

**Test Cases**:
- [ ] **IMAP Service Status** - Check connection status indicators
- [ ] **Processing Metrics** - Verify success/failure counters
- [ ] **Real-time Updates** - Confirm status updates automatically
- [ ] **Service Controls** - Test start/stop/restart buttons
- [ ] **Processing Queue** - View pending emails in queue

**Expected Behavior**:
- Green status = connected and processing
- Orange status = connected but not processing
- Red status = connection error or service down
- Metrics should update as emails are processed

### 1.2 Portfolio Management Integration
**Location**: Portfolio dashboard

**Test Cases**:
- [ ] **Multi-Portfolio Selector** - Switch between portfolios
- [ ] **Transaction List** - View imported transactions
- [ ] **Portfolio Statistics** - Check updated metrics
- [ ] **Recent Activity** - See latest email imports

**Expected Behavior**:
- Portfolios load correctly with email-imported transactions
- Statistics reflect imported transaction data
- Recent activity shows email processing events

### 1.3 Failed Import Resolution Interface
**Location**: Email management section

**Test Cases**:
- [ ] **Error List** - View failed email imports
- [ ] **Error Details** - Inspect detailed error information
- [ ] **Filtering** - Filter by error type, status, priority
- [ ] **Resolution Actions** - Retry, manual fix, skip, delete
- [ ] **Bulk Operations** - Process multiple failed imports

**Expected Behavior**:
- Failed imports display with clear error messages
- Filters work correctly to narrow down issues
- Resolution actions complete successfully
- Bulk operations handle multiple items efficiently

### 1.4 Manual Review Queue
**Location**: Review management section

**Test Cases**:
- [ ] **Queue Display** - View items requiring review
- [ ] **Item Details** - Inspect flagged email content
- [ ] **Review Actions** - Approve, reject, modify
- [ ] **Assignment System** - Assign reviews to team members
- [ ] **Priority Handling** - Sort by urgency/importance

**Expected Behavior**:
- Queue items display with clear review reasons
- Review actions complete successfully
- Assignments route to correct team members
- Priority sorting helps focus on urgent items

---

## 🔄 Phase 2: Email Processing Workflow Testing

### 2.1 End-to-End Email Processing
**Prerequisites**: IMAP connection configured

**Test Workflow**:
1. **Email Reception**
   - [ ] Send test Wealthsimple email to configured inbox
   - [ ] Verify email appears in processing queue
   - [ ] Check processing status updates in real-time

2. **Email Parsing**
   - [ ] Confirm email content is extracted correctly
   - [ ] Verify transaction details are identified
   - [ ] Check symbol lookup succeeds
   - [ ] Validate amount and date parsing

3. **Transaction Creation**
   - [ ] Verify transaction appears in portfolio
   - [ ] Check all transaction fields are populated
   - [ ] Confirm portfolio statistics update
   - [ ] Validate position calculations

4. **Completion Notification**
   - [ ] Receive success notification
   - [ ] Check notification contains correct details
   - [ ] Verify notification appears in all configured channels

### 2.2 Duplicate Detection Testing
**Test Scenario**: Process duplicate emails

**Steps**:
1. **Initial Transaction**
   - [ ] Process first email successfully
   - [ ] Verify transaction is created

2. **Duplicate Email**
   - [ ] Send identical or similar email
   - [ ] Confirm duplicate detection triggers
   - [ ] Verify email goes to manual review queue

3. **Duplicate Resolution**
   - [ ] Review duplicate in queue
   - [ ] Test approve/reject actions
   - [ ] Confirm final transaction state

### 2.3 Error Handling Testing
**Test Scenarios**: Various error conditions

**Test Cases**:
1. **Symbol Not Found**
   - [ ] Email with unknown stock symbol
   - [ ] Verify error is captured correctly
   - [ ] Check manual fix options available

2. **Parsing Failures**
   - [ ] Malformed email content
   - [ ] Missing required transaction data
   - [ ] Verify graceful error handling

3. **Network Issues**
   - [ ] Simulate connection timeouts
   - [ ] Test retry mechanisms
   - [ ] Verify error logging

---

## 🔔 Phase 3: Notification System Testing

### 3.1 Real-time Notifications
**Test Cases**:
- [ ] **Import Success** - Verify success notifications appear
- [ ] **Import Failure** - Check failure alerts are sent
- [ ] **Duplicate Detection** - Confirm duplicate notifications
- [ ] **Manual Review** - Test review assignment alerts
- [ ] **System Status** - Check service status notifications

### 3.2 Notification Preferences
**Location**: Notification settings

**Test Cases**:
- [ ] **Channel Configuration** - Set up email, SMS, Slack
- [ ] **Rule Creation** - Create custom notification rules
- [ ] **Quiet Hours** - Configure do-not-disturb periods
- [ ] **Severity Filtering** - Set minimum alert levels
- [ ] **Test Notifications** - Send test alerts to all channels

### 3.3 Notification Delivery
**Test Cases**:
- [ ] **In-App Notifications** - Check real-time UI updates
- [ ] **Email Notifications** - Verify email delivery
- [ ] **SMS Notifications** - Test SMS alerts (if configured)
- [ ] **Slack Integration** - Check Slack channel messages
- [ ] **Webhook Delivery** - Test custom webhook endpoints

---

## 🧪 Phase 4: Integration Testing

### 4.1 Portfolio Analytics Integration
**Test Cases**:
- [ ] **Performance Calculations** - Verify imported transactions affect analytics
- [ ] **Position Updates** - Check position quantities and values
- [ ] **Return Calculations** - Confirm total return metrics
- [ ] **Chart Updates** - Verify portfolio charts reflect new data

### 4.2 Multi-Portfolio Testing
**Test Cases**:
- [ ] **Portfolio Isolation** - Emails route to correct portfolios
- [ ] **Cross-Portfolio Views** - Check consolidated views
- [ ] **Portfolio-Specific Rules** - Test different processing rules per portfolio

### 4.3 Database Consistency
**Test Cases**:
- [ ] **Transaction Integrity** - Verify transaction data consistency
- [ ] **Position Synchronization** - Check position calculations
- [ ] **Audit Trail** - Confirm processing history is maintained

---

## 🚨 Phase 5: Error Recovery Testing

### 5.1 Service Recovery
**Test Scenarios**:
- [ ] **IMAP Disconnection** - Test automatic reconnection
- [ ] **Processing Interruption** - Verify queue persistence
- [ ] **Database Errors** - Check transaction rollback

### 5.2 Data Recovery
**Test Scenarios**:
- [ ] **Failed Transaction Creation** - Test rollback mechanisms
- [ ] **Partial Processing** - Check recovery from incomplete operations
- [ ] **Corrupt Email Data** - Verify error handling

---

## 📊 Phase 6: Performance Testing

### 6.1 Load Testing
**Test Cases**:
- [ ] **High Email Volume** - Process multiple emails simultaneously
- [ ] **Large Email Size** - Handle emails with attachments
- [ ] **Concurrent Users** - Multiple users processing emails

### 6.2 Response Time Testing
**Metrics to Check**:
- [ ] **Email Processing Time** - Measure end-to-end processing
- [ ] **UI Response Time** - Check interface responsiveness
- [ ] **Notification Delivery Time** - Measure alert delays

---

## ✅ Testing Checklist Summary

### Core Functionality
- [ ] Email reception and processing
- [ ] Transaction creation and portfolio updates
- [ ] Manual review queue management
- [ ] Failed import resolution
- [ ] Real-time notifications

### Error Handling
- [ ] Duplicate detection and resolution
- [ ] Symbol lookup failures
- [ ] Network and service errors
- [ ] Data validation errors

### Integration
- [ ] Portfolio management integration
- [ ] Analytics system updates
- [ ] Notification system delivery
- [ ] Multi-user and multi-portfolio support

### Performance
- [ ] High volume email processing
- [ ] Real-time UI updates
- [ ] Notification delivery times
- [ ] System resource usage

---

## 🐛 Common Issues and Troubleshooting

### Email Not Processing
1. Check IMAP connection status
2. Verify email server configuration
3. Check processing queue for errors
4. Review service logs for issues

### Transaction Not Created
1. Verify email parsing succeeded
2. Check for duplicate detection
3. Review symbol lookup results
4. Check portfolio configuration

### Notifications Not Received
1. Verify notification channel configuration
2. Check notification rules and filters
3. Test notification channels individually
4. Review quiet hours and preferences

### Performance Issues
1. Check email processing queue size
2. Monitor system resource usage
3. Review database query performance
4. Check notification delivery logs

---

## 📞 Support and Documentation

- **Technical Issues**: Check browser console for errors
- **Email Configuration**: Review IMAP settings
- **Notification Setup**: Test each channel individually
- **Performance Problems**: Monitor system metrics

Remember to test in a controlled environment with test emails before processing real financial data!