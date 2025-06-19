# Email Management System Troubleshooting Guide

## Table of Contents
1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [Connection Issues](#connection-issues)
3. [Processing Issues](#processing-issues)
4. [Performance Problems](#performance-problems)
5. [Configuration Issues](#configuration-issues)
6. [Error Messages Reference](#error-messages-reference)
7. [Log Analysis](#log-analysis)
8. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostic Checklist

Before diving into detailed troubleshooting, run through this quick checklist:

### System Status Check
- [ ] Is the email processing service running?
- [ ] Are there any error indicators in the dashboard?
- [ ] When was the last successful email processed?
- [ ] Are there items in the manual review queue?

### Configuration Check
- [ ] Can you connect to your email account from an email client?
- [ ] Is your API key valid and has remaining quota?
- [ ] Are your database connections working?
- [ ] Have you made any recent configuration changes?

### Network Check
- [ ] Is your internet connection stable?
- [ ] Are there any firewall or proxy issues?
- [ ] Can you access external services (Google AI, Supabase)?

### Recent Changes
- [ ] Have you changed your email password recently?
- [ ] Did you enable two-factor authentication?
- [ ] Have there been any system updates?
- [ ] Did you modify any settings recently?

## Connection Issues

### IMAP Connection Problems

#### "Authentication Failed" Error

**Symptoms:**
- Cannot connect to email server
- "Invalid credentials" message
- Service shows "Error" status

**Common Causes & Solutions:**

1. **Wrong Password**
   ```
   Solution: Verify your email password
   - Try logging into your email account manually
   - Update password in settings if it changed
   ```

2. **App Password Required (Gmail)**
   ```
   Solution: Create Gmail App Password
   1. Go to Google Account settings
   2. Enable 2-Step Verification
   3. Generate App Password for "Mail"
   4. Use App Password instead of account password
   ```

3. **IMAP Not Enabled**
   ```
   Solution: Enable IMAP in email settings
   - Gmail: Settings > Forwarding and POP/IMAP > Enable IMAP
   - Outlook: Settings > Mail > Sync email > Enable IMAP
   ```

4. **Account Locked/Suspended**
   ```
   Solution: Check account status
   - Log into email account directly
   - Check for security alerts
   - Follow provider's unlock procedures
   ```

#### "Connection Timeout" Error

**Symptoms:**
- Connection attempts hang
- Timeout after 30-60 seconds
- Intermittent connection issues

**Solutions:**

1. **Check Server Settings**
   ```
   Verify correct IMAP settings:
   - Gmail: imap.gmail.com:993 (SSL)
   - Outlook: outlook.office365.com:993 (SSL)
   - Yahoo: imap.mail.yahoo.com:993 (SSL)
   ```

2. **Firewall/Network Issues**
   ```
   Check network connectivity:
   - Test from different network
   - Verify port 993 is not blocked
   - Check corporate firewall settings
   ```

3. **Server Overload**
   ```
   Reduce connection frequency:
   - Increase processing interval
   - Reduce batch size
   - Try connecting during off-peak hours
   ```

#### "SSL/TLS Certificate Error"

**Symptoms:**
- Certificate validation failures
- SSL handshake errors
- Secure connection warnings

**Solutions:**

1. **Update Security Settings**
   ```
   In email server configuration:
   - Ensure "Secure Connection" is enabled
   - Try different SSL/TLS versions
   - Check certificate validity dates
   ```

2. **Clock Synchronization**
   ```
   Verify system time:
   - Ensure server time is correct
   - Check timezone settings
   - Sync with time servers if needed
   ```

### API Connection Issues

#### "AI Service Unavailable" Error

**Symptoms:**
- Symbol resolution failures
- "Service temporarily unavailable" messages
- Processing stops at AI step

**Solutions:**

1. **Check API Key**
   ```
   Verify Google AI API key:
   - Key format: AIza... (39 characters)
   - Check quotas in Google Cloud Console
   - Verify Generative AI API is enabled
   ```

2. **Rate Limiting**
   ```
   Reduce API usage:
   - Lower rate limit in settings
   - Increase processing intervals
   - Process emails in smaller batches
   ```

3. **Service Status**
   ```
   Check external service status:
   - Google AI status page
   - Try API calls manually
   - Wait and retry if service is down
   ```

#### "Database Connection Failed"

**Symptoms:**
- Cannot save configurations
- Transaction creation fails
- "Database error" messages

**Solutions:**

1. **Check Supabase Settings**
   ```
   Verify database configuration:
   - Supabase URL format: https://xxx.supabase.co
   - Anonymous key starts with "eyJ"
   - Service role key (if used) is correct
   ```

2. **Database Status**
   ```
   Check Supabase project:
   - Project is active (not paused)
   - Database is accessible
   - No ongoing maintenance
   ```

## Processing Issues

### No Emails Being Processed

#### "No New Emails Found"

**Symptoms:**
- Processing runs but finds 0 emails
- Last processed date doesn't update
- No activity in logs

**Diagnostic Steps:**

1. **Check Email Folder**
   ```
   Verify folder configuration:
   - Default: INBOX
   - Check if emails are in different folder
   - Verify folder name spelling
   ```

2. **Email Filters**
   ```
   Check for email filtering:
   - Look for transaction emails in Spam
   - Check email rules/filters
   - Verify emails aren't auto-deleted
   ```

3. **Date Range**
   ```
   Verify processing date range:
   - Check "last processed" timestamp
   - Look for recent transaction emails
   - Verify system timezone settings
   ```

4. **Sender Filtering**
   ```
   Check sender whitelist:
   - Default: @wealthsimple.com
   - Verify sender addresses match
   - Check for domain variations
   ```

#### "Emails Found But Not Processed"

**Symptoms:**
- Emails detected but processing fails
- Items appear in manual review queue
- Processing errors in logs

**Solutions:**

1. **Review Queue Processing**
   ```
   Check manual review queue:
   - Navigate to Manual Review tab
   - Review pending items
   - Process or reject as appropriate
   ```

2. **Content Issues**
   ```
   Common email content problems:
   - Malformed transaction data
   - Missing required fields
   - Unsupported transaction types
   ```

3. **Symbol Resolution**
   ```
   AI service problems:
   - Check AI service status
   - Verify API quotas
   - Review confidence thresholds
   ```

### Duplicate Transactions

#### "Duplicate Transaction Detected"

**Symptoms:**
- Same transaction appears multiple times
- Warnings about duplicate processing
- Incorrect portfolio balances

**Solutions:**

1. **Duplicate Detection Settings**
   ```
   Adjust duplicate detection:
   - Check detection sensitivity
   - Review date/time windows
   - Verify transaction matching logic
   ```

2. **Email Processing History**
   ```
   Check processing history:
   - Review processed email log
   - Look for reprocessing of same emails
   - Verify email UID tracking
   ```

3. **Manual Cleanup**
   ```
   Clean up duplicates:
   - Identify duplicate transactions
   - Delete or merge as appropriate
   - Update portfolio calculations
   ```

### Incorrect Symbol Resolution

#### "Wrong Stock Symbol Detected"

**Symptoms:**
- AI picks wrong symbol
- Transactions created with incorrect symbols
- Portfolio contains unknown assets

**Solutions:**

1. **Review Confidence Thresholds**
   ```
   Adjust AI settings:
   - Increase confidence threshold
   - Enable manual review for low confidence
   - Review AI model settings
   ```

2. **Manual Symbol Mapping**
   ```
   Create symbol mappings:
   - Map common variations to correct symbols
   - Create custom resolution rules
   - Maintain symbol dictionary
   ```

3. **Training Data**
   ```
   Improve AI accuracy:
   - Provide feedback on incorrect symbols
   - Add context examples
   - Review and correct past mistakes
   ```

## Performance Problems

### Slow Processing

#### "Processing Takes Too Long"

**Symptoms:**
- Email processing exceeds normal timeframes
- Timeouts during processing
- Poor system responsiveness

**Diagnostic Steps:**

1. **Check Processing Load**
   ```
   Review current load:
   - Number of emails in queue
   - Batch size settings
   - Processing intervals
   ```

2. **Resource Usage**
   ```
   Monitor system resources:
   - CPU usage during processing
   - Memory consumption
   - Network bandwidth
   ```

3. **External Service Latency**
   ```
   Check external dependencies:
   - AI service response times
   - Database query performance
   - Email server response times
   ```

**Solutions:**

1. **Optimize Batch Processing**
   ```
   Adjust processing settings:
   - Reduce batch size (try 5-10 emails)
   - Increase processing interval
   - Process during off-peak hours
   ```

2. **Improve Configuration**
   ```
   Optimize settings:
   - Reduce AI timeout values
   - Lower confidence thresholds
   - Enable result caching
   ```

### High Memory Usage

#### "Memory Consumption Too High"

**Symptoms:**
- System slowdown during processing
- Out of memory errors
- Browser becomes unresponsive

**Solutions:**

1. **Reduce Batch Size**
   ```
   Process fewer emails at once:
   - Set batch size to 5-10
   - Add delays between batches
   - Monitor memory usage
   ```

2. **Clear Cache**
   ```
   Reset application cache:
   - Clear browser cache
   - Restart processing service
   - Reset configuration cache
   ```

### Rate Limiting Issues

#### "API Rate Limit Exceeded"

**Symptoms:**
- "Rate limit exceeded" errors
- Processing pauses frequently
- API quota warnings

**Solutions:**

1. **Reduce API Usage**
   ```
   Lower API call frequency:
   - Increase processing intervals
   - Reduce batch sizes
   - Cache AI responses
   ```

2. **Upgrade API Quotas**
   ```
   Increase limits:
   - Upgrade Google AI quota
   - Request quota increases
   - Implement backoff strategies
   ```

## Configuration Issues

### Settings Not Saving

#### "Configuration Changes Not Persisted"

**Symptoms:**
- Settings revert after page reload
- "Save failed" error messages
- Changes don't take effect

**Solutions:**

1. **Check Authentication**
   ```
   Verify user session:
   - Ensure you're logged in
   - Check session hasn't expired
   - Re-authenticate if needed
   ```

2. **Browser Issues**
   ```
   Clear browser data:
   - Clear cookies and cache
   - Disable browser extensions
   - Try incognito/private mode
   ```

3. **Database Connectivity**
   ```
   Verify database access:
   - Check database connection
   - Verify write permissions
   - Check storage quotas
   ```

### Import/Export Problems

#### "Configuration Import Failed"

**Symptoms:**
- Import process fails with errors
- Partial imports with missing data
- Configuration format errors

**Solutions:**

1. **Validate File Format**
   ```
   Check configuration file:
   - Valid JSON format
   - Correct version field
   - All required sections present
   ```

2. **Fix Format Issues**
   ```
   Common format problems:
   - Missing version field
   - Invalid JSON syntax
   - Incorrect data types
   ```

3. **Permissions Check**
   ```
   Verify import permissions:
   - User has write access
   - File size within limits
   - Content passes validation
   ```

## Error Messages Reference

### Common Error Codes

#### CONFIG_001: Invalid Configuration
```
Error: CONFIG_001 - Invalid configuration format
Cause: Configuration data doesn't match expected schema
Solution: Check configuration format and required fields
```

#### AUTH_002: Authentication Failed
```
Error: AUTH_002 - IMAP authentication failed
Cause: Invalid email credentials or connection settings
Solution: Verify email settings and password
```

#### API_003: Service Unavailable
```
Error: API_003 - AI service temporarily unavailable
Cause: External API service is down or rate limited
Solution: Wait and retry, or check service status
```

#### DB_004: Database Error
```
Error: DB_004 - Database connection failed
Cause: Cannot connect to or write to database
Solution: Check database configuration and connectivity
```

#### PROC_005: Processing Failed
```
Error: PROC_005 - Email processing failed
Cause: Error during email parsing or transaction creation
Solution: Check email content and processing logs
```

### Warning Messages

#### WARN_001: Low Confidence
```
Warning: WARN_001 - Symbol resolution low confidence
Meaning: AI is uncertain about detected symbol
Action: Review in manual queue or adjust thresholds
```

#### WARN_002: Rate Limit Approaching
```
Warning: WARN_002 - API rate limit 80% consumed
Meaning: Approaching API usage limits
Action: Reduce processing frequency or upgrade quota
```

#### WARN_003: Queue Backlog
```
Warning: WARN_003 - Manual review queue is growing
Meaning: Items need manual attention
Action: Process pending reviews or adjust automation
```

## Log Analysis

### Understanding Log Levels

#### INFO Level
- Normal operations
- Processing statistics
- Configuration changes
- Service starts/stops

#### WARN Level
- Potential issues
- Performance concerns
- Rate limiting warnings
- Configuration problems

#### ERROR Level
- Processing failures
- Connection errors
- Authentication problems
- System errors

### Log Message Patterns

#### Connection Logs
```
[INFO] IMAP connection established: imap.gmail.com:993
[WARN] IMAP connection slow: 5000ms response time
[ERROR] IMAP authentication failed: Invalid credentials
```

#### Processing Logs
```
[INFO] Processing batch: 10 emails found
[INFO] Email processed: AAPL transaction created
[WARN] Low confidence symbol: XYZZ (0.65)
[ERROR] Processing failed: Invalid email format
```

#### API Logs
```
[INFO] AI API call successful: 250ms response
[WARN] AI API rate limit: 80% quota used
[ERROR] AI API error: Service temporarily unavailable
```

### Log Analysis Tips

1. **Search by Timestamp**
   - Focus on time when issue occurred
   - Look for patterns around that time
   - Check for related events

2. **Filter by Level**
   - Start with ERROR level for problems
   - Check WARN for potential issues
   - Use INFO for normal operations

3. **Track Request IDs**
   - Follow specific requests through logs
   - Correlate across different services
   - Understand complete flow

## Emergency Procedures

### Service Recovery

#### If Email Processing Stops Working

1. **Immediate Response**
   ```
   Quick recovery steps:
   1. Stop email processing service
   2. Check for obvious errors in logs
   3. Verify basic connectivity (email, API, database)
   4. Restart service if no issues found
   ```

2. **Extended Outage**
   ```
   For longer outages:
   1. Enable manual email processing mode
   2. Export configuration as backup
   3. Contact support with error details
   4. Document issue for future prevention
   ```

#### If Configuration Is Lost

1. **Recovery Steps**
   ```
   Restore configuration:
   1. Check for recent export files
   2. Restore from backup if available
   3. Reconfigure from scratch if needed
   4. Test each configuration section
   ```

2. **Prevention**
   ```
   Backup procedures:
   1. Regular configuration exports
   2. Document critical settings
   3. Store backups securely
   4. Test restore procedures
   ```

### Data Recovery

#### If Transactions Are Missing

1. **Verification**
   ```
   Check transaction status:
   1. Look in manual review queue
   2. Check failed imports section
   3. Review processing logs
   4. Verify email presence
   ```

2. **Recovery Options**
   ```
   Restore missing transactions:
   1. Reprocess specific emails
   2. Manual transaction creation
   3. Batch import from backup
   4. Contact support for assistance
   ```

### Support Escalation

#### When to Contact Support

- Authentication issues after following all troubleshooting steps
- Data corruption or loss
- Performance issues affecting normal operations
- Security concerns or suspected breaches
- Configuration problems that can't be resolved

#### Information to Provide

1. **Error Details**
   - Exact error messages
   - Screenshots of issues
   - Timestamps when problems occurred
   - Steps to reproduce

2. **System Information**
   - Browser and version
   - Operating system
   - Network configuration
   - Recent changes made

3. **Log Excerpts**
   - Relevant log entries
   - Error stack traces
   - Request IDs if available
   - Performance metrics

---

**Last Updated**: March 2024  
**Version**: 2.0.0  
**Support**: For additional help, contact support through the application or at support@investra.ai