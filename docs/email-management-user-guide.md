# Email Management System User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Configuration Management](#configuration-management)
4. [Email Processing](#email-processing)
5. [Transaction Management](#transaction-management)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Advanced Features](#advanced-features)
8. [Security and Privacy](#security-and-privacy)

## Introduction

The Email Management System automatically processes financial transaction emails from supported brokerages (currently Wealthsimple) and creates corresponding transactions in your portfolio. The system provides:

- **Automated Email Processing**: Automatically fetch and parse transaction emails
- **Intelligent Symbol Resolution**: AI-powered stock symbol detection and validation
- **Manual Review Queue**: Human oversight for uncertain transactions
- **Real-time Monitoring**: Live status updates and processing metrics
- **Secure Configuration**: Encrypted storage of sensitive credentials

## Getting Started

### Prerequisites
- Active Investra AI account
- Email account with transaction emails (Gmail, Outlook, etc.)
- Valid API keys for AI services (Google Gemini)

### Initial Setup

1. **Navigate to Settings**
   - Click on "Settings" in the main navigation
   - You'll see six configuration categories

2. **Configure Email Server**
   - Select the "Email Server" tab
   - Enter your IMAP credentials:
     - **Host**: Your email provider's IMAP server (e.g., `imap.gmail.com`)
     - **Port**: Usually 993 for secure connections
     - **Username**: Your email address
     - **Password**: App-specific password (recommended) or account password
     - **Secure Connection**: Enable SSL/TLS (recommended)

3. **Test Connection**
   - Click "Test Connection" to verify your settings
   - Wait for the test result - it should show "Connection Successful"

4. **Configure AI Services**
   - Select the "AI Services" tab
   - Enter your Google API key for Gemini
   - Adjust processing parameters as needed

5. **Save Configuration**
   - Click "Save All Changes"
   - You'll see a confirmation message

## Configuration Management

### Email Server Configuration

#### Required Settings
- **IMAP Host**: Your email provider's IMAP server
- **IMAP Port**: Port number (usually 993 for SSL)
- **Username**: Your email address
- **Password**: Your email password or app password

#### Optional Settings
- **Folder**: Email folder to monitor (default: INBOX)
- **Batch Size**: Number of emails to process at once (1-100)
- **Processing Interval**: How often to check for new emails (minutes)
- **Auto Start**: Whether to start processing automatically

#### Email Provider Settings

**Gmail**
- Host: `imap.gmail.com`
- Port: `993`
- Secure: Yes
- Note: Use App Password instead of account password

**Outlook/Hotmail**
- Host: `outlook.office365.com`
- Port: `993`
- Secure: Yes

**Yahoo Mail**
- Host: `imap.mail.yahoo.com`
- Port: `993`
- Secure: Yes

### AI Services Configuration

#### Google Gemini Settings
- **API Key**: Your Google Cloud API key with Generative AI access
- **Model**: AI model to use (default: gemini-pro)
- **Max Tokens**: Maximum response length (100-8000)
- **Temperature**: Creativity level (0.0-1.0, default: 0.3)
- **Confidence Threshold**: Minimum confidence for auto-processing (0.1-1.0)

#### Performance Settings
- **Rate Limit**: Requests per minute (1-300)
- **Timeout**: Request timeout in milliseconds
- **Retry Attempts**: Number of retries on failure

### Database Configuration

Configure your Supabase database connection:
- **Supabase URL**: Your project URL (https://xxx.supabase.co)
- **Anonymous Key**: Public API key for client connections
- **Service Role Key**: Admin key for server operations (optional)

### Security Configuration

Configure security policies:
- **Encryption Algorithm**: Method for encrypting sensitive data
- **Session Timeout**: How long sessions remain active
- **Password Policy**: Minimum requirements for passwords
- **Two-Factor Authentication**: Enable 2FA (if available)

### Monitoring Configuration

Set up monitoring and alerting:
- **Health Check Interval**: How often to check system health
- **Error Thresholds**: When to trigger alerts
- **Alert Email**: Where to send notifications
- **Log Level**: Detail level for system logs

### API Configuration

Configure server and API settings:
- **Server Port**: Port for the API server
- **Rate Limiting**: Request limits for API endpoints
- **CORS Settings**: Cross-origin request policies
- **Request Timeouts**: Maximum time for API requests

## Email Processing

### Starting Email Processing

1. **Navigate to Email Management**
   - Click "Email Management" in the main navigation

2. **Start Processing**
   - Click the "Start Processing" button
   - Status should change to "Running"

3. **Monitor Progress**
   - View real-time statistics in the dashboard
   - Check processing logs for details

### Processing Workflow

1. **Email Fetching**
   - System connects to your email account
   - Searches for emails from supported senders
   - Downloads new emails since last check

2. **Email Parsing**
   - Extracts transaction details from email content
   - Identifies symbols, quantities, prices, and dates
   - Validates extracted information

3. **Symbol Resolution**
   - Uses AI to enhance and validate stock symbols
   - Resolves ambiguous or incomplete symbols
   - Checks against market data sources

4. **Transaction Creation**
   - Creates transaction records in your portfolio
   - Links to original email for reference
   - Updates portfolio calculations

### Manual Processing

For immediate processing without waiting for the scheduled interval:

1. Click "Process Now" in the Email Management dashboard
2. System will immediately check for new emails
3. View results in the processing log

### Processing Status

The system shows several status indicators:

- **Stopped**: Processing is not active
- **Starting**: Service is initializing
- **Running**: Actively processing emails
- **Error**: Service encountered an issue

## Transaction Management

### Viewing Processed Transactions

1. **Navigate to Transactions**
   - Click "Transactions" in the main navigation

2. **Filter by Source**
   - Filter transactions by "Email" source
   - View original email content by clicking transaction details

3. **Verify Accuracy**
   - Check that extracted details match email content
   - Verify stock symbols are correct
   - Confirm quantities and prices

### Manual Review Queue

Some emails may require manual review:

1. **Navigate to Review Queue**
   - Click "Manual Review" tab in Email Management

2. **Review Pending Items**
   - View emails that couldn't be automatically processed
   - See why manual review is needed

3. **Take Action**
   - **Approve**: Create transaction as-is
   - **Edit**: Modify details before creating transaction
   - **Reject**: Skip this email

4. **Bulk Actions**
   - Process multiple items at once
   - Apply same action to similar emails

### Failed Imports

Handle emails that failed to process:

1. **View Failed Items**
   - Click "Failed Imports" in Email Management

2. **Understand Failures**
   - Review error messages
   - Check original email content

3. **Retry Processing**
   - Fix configuration issues
   - Retry failed emails
   - Contact support if needed

## Monitoring and Troubleshooting

### System Health

Monitor overall system health:

1. **Dashboard Overview**
   - View processing statistics
   - Check service status
   - Monitor error rates

2. **Performance Metrics**
   - Processing speed
   - Success/failure rates
   - Queue depths

3. **Resource Usage**
   - Memory consumption
   - API usage
   - Database connections

### Troubleshooting Common Issues

#### Connection Issues

**"IMAP Connection Failed"**
- Verify host, port, and credentials
- Check if email provider requires app passwords
- Ensure firewall allows outbound connections
- Test with email client to confirm settings

**"Authentication Failed"**
- Double-check username and password
- Use app-specific password for Gmail
- Verify account isn't locked or suspended
- Check for two-factor authentication requirements

#### Processing Issues

**"No Emails Found"**
- Verify email folder setting (INBOX vs others)
- Check email filters and rules
- Confirm transaction emails are being received
- Verify date range for email search

**"Symbol Resolution Failed"**
- Check AI service configuration
- Verify API key is valid and has quota
- Review email content for clear symbol information
- Consider manual review for complex cases

#### Performance Issues

**"Slow Processing"**
- Reduce batch size
- Increase processing interval
- Check API rate limits
- Monitor system resources

**"High Error Rate"**
- Review error logs
- Check configuration settings
- Verify external service availability
- Consider reducing processing load

### Log Analysis

Access detailed logs for troubleshooting:

1. **View Processing Logs**
   - Click "View Logs" in Email Management
   - Filter by date and log level

2. **Understanding Log Entries**
   - Timestamps show when events occurred
   - Log levels indicate severity (Info, Warning, Error)
   - Messages provide detailed context

3. **Common Log Messages**
   - Connection events
   - Processing results
   - Error conditions
   - Performance metrics

## Advanced Features

### Configuration Export/Import

#### Exporting Configuration

1. Go to Settings
2. Click "Export Configuration"
3. Select categories to export
4. Download the configuration file

#### Importing Configuration

1. Go to Settings
2. Click "Import Configuration"
3. Select your configuration file
4. Choose whether to overwrite existing settings
5. Review changes before confirming

### API Integration

The system provides REST APIs for advanced integration:

#### Authentication
```
Authorization: Bearer <your-jwt-token>
```

#### Get Configuration
```
GET /api/configuration/email_server
```

#### Update Configuration
```
POST /api/configuration/email_server
Content-Type: application/json

{
  "configuration": {
    "imap_host": "imap.gmail.com",
    "imap_port": 993
  }
}
```

#### Test Connection
```
POST /api/configuration/email_server/test
Content-Type: application/json

{
  "configuration": {
    "imap_host": "imap.gmail.com",
    "imap_port": 993,
    "imap_username": "user@gmail.com",
    "imap_password": "password"
  }
}
```

### Webhook Integration

Set up webhooks for real-time notifications:

1. Configure webhook URL in monitoring settings
2. Choose events to notify about
3. Set up your endpoint to receive POST requests

### Custom Email Filters

Create custom filters for email processing:

1. Define sender patterns
2. Set subject line filters
3. Configure content matching rules
4. Specify processing priorities

## Security and Privacy

### Data Protection

- **Encryption**: All sensitive data is encrypted at rest and in transit
- **Access Control**: Role-based permissions control who can access what
- **Audit Logging**: All configuration changes are logged for security
- **Data Isolation**: User data is completely isolated between accounts

### Best Practices

1. **Use App Passwords**
   - Create app-specific passwords instead of using main account password
   - Rotate passwords regularly

2. **Monitor Access**
   - Review login logs regularly
   - Set up alerts for unusual activity
   - Use strong, unique passwords

3. **Limit Permissions**
   - Only grant necessary access to team members
   - Regularly review and update permissions
   - Remove access for inactive users

4. **Backup Configuration**
   - Export configuration regularly
   - Store backups securely
   - Test restore procedures

### Privacy Considerations

- Email content is processed locally or through encrypted connections
- No email content is stored permanently after processing
- Transaction data is derived from emails but emails themselves are not retained
- All data processing complies with relevant privacy regulations

### Security Features

- **Encryption**: AES-256-GCM encryption for sensitive configuration data
- **Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: All inputs are validated and sanitized
- **Secure Headers**: Proper security headers on all responses

## Support and Resources

### Getting Help

1. **Documentation**: Review this guide and other documentation
2. **Troubleshooting**: Check the troubleshooting guide
3. **Support**: Contact support through the application
4. **Community**: Join the user community for tips and discussions

### Resources

- [API Documentation](./api-documentation.md)
- [Troubleshooting Guide](./email-management-troubleshooting.md)
- [Security Best Practices](./security-guide.md)
- [Configuration Templates](./configuration-templates.md)

### Updates and Maintenance

- System updates are applied automatically
- Configuration changes take effect immediately
- Maintenance windows are announced in advance
- Backup your configuration before major updates

---

**Last Updated**: March 2024  
**Version**: 2.0.0