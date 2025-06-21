# Investra Email Puller

Standalone Node.js application for pulling emails from Gmail via IMAP and storing them in Supabase for manual review.

## Features

- 🔄 **Automated Email Sync**: Connects to Gmail via IMAP and pulls recent emails
- 📧 **Gmail Integration**: Uses Gmail app passwords for secure authentication
- 🗄️ **Supabase Storage**: Stores emails in structured database tables
- ⏰ **Flexible Scheduling**: Configurable sync intervals with cron-like scheduling
- 🔒 **Secure**: Encrypts stored passwords and uses row-level security
- 📊 **Monitoring**: Built-in logging and status reporting
- 🚀 **Production Ready**: Designed for standalone deployment

## Quick Start

### 1. Install Dependencies

```bash
cd email-puller
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Build and Run

```bash
# Build TypeScript
npm run build

# Run once (for testing)
RUN_ONCE=true npm start

# Run with scheduler (production)
npm start
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Required |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Required |
| `IMAP_HOST` | IMAP server hostname | `imap.gmail.com` |
| `IMAP_PORT` | IMAP server port | `993` |
| `IMAP_SECURE` | Use secure connection | `true` |
| `SYNC_INTERVAL_MINUTES` | How often to sync | `30` |
| `MAX_EMAILS_PER_SYNC` | Max emails per sync | `50` |
| `LOG_LEVEL` | Logging level | `info` |
| `RUN_ONCE` | Run once and exit | `false` |
| `EMAIL_ENCRYPTION_KEY` | Encryption key for passwords | Change in production |

### Database Configuration

The email puller loads IMAP configurations from the `imap_configurations` table. Each configuration includes:

- Gmail email address
- Encrypted app password
- Sync settings
- User association

## Database Schema

### Tables Used

#### `imap_configurations`
Stores user IMAP settings:
```sql
{
  "id": "uuid",
  "user_id": "uuid", 
  "gmail_email": "string",
  "encrypted_app_password": "string",
  "sync_interval_minutes": "number",
  "is_active": "boolean"
}
```

#### `imap_inbox`
Stores pulled emails:
```sql
{
  "id": "uuid",
  "user_id": "uuid",
  "message_id": "string",
  "subject": "string", 
  "from_email": "string",
  "text_content": "string",
  "received_at": "timestamp",
  "status": "pending|processing|error"
}
```

## Gmail Setup

### 1. Enable 2-Factor Authentication
- Go to Google Account settings
- Enable 2-factor authentication

### 2. Generate App Password
- Go to Google Account > Security > App passwords
- Generate password for "Mail"
- Use this password in the IMAP configuration

### 3. Enable IMAP
- Go to Gmail > Settings > Forwarding and POP/IMAP
- Enable IMAP access

## Deployment

### Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Copy files to server**:
   ```bash
   # Copy dist/ and package.json to production server
   scp -r dist/ package.json user@server:/opt/investra/email-puller/
   ```

3. **Install production dependencies**:
   ```bash
   cd /opt/investra/email-puller
   npm ci --only=production
   ```

4. **Set up environment**:
   ```bash
   # Create .env file with production values
   cp .env.example .env
   # Edit .env
   ```

5. **Start with PM2**:
   ```bash
   pm2 start dist/imap-puller.js --name investra-email-puller
   pm2 save
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/imap-puller.js"]
```

## Operations

### Manual Sync
```bash
# Run sync once
RUN_ONCE=true node dist/imap-puller.js
```

### Check Status
```bash
# View PM2 status
pm2 status investra-email-puller

# View logs
pm2 logs investra-email-puller
```

### Stop/Start
```bash
# Stop
pm2 stop investra-email-puller

# Start  
pm2 start investra-email-puller

# Restart
pm2 restart investra-email-puller
```

## Monitoring

### Log Levels
- `debug`: Detailed operation info
- `info`: General operation info (default)
- `warn`: Warning conditions
- `error`: Error conditions only

### Status Logging
The application logs status updates every 10 minutes including:
- Scheduler status
- Active configurations
- Total emails synced
- Error counts

### Health Checks
The application includes built-in health checks:
- Database connectivity
- IMAP connection tests
- Configuration validation

## Security

### Password Encryption
Gmail app passwords are encrypted before storage using AES-256-CBC encryption.

### Row Level Security
Database access is restricted by Supabase RLS policies ensuring users only see their own data.

### Network Security
- All IMAP connections use TLS/SSL
- Supabase connections use HTTPS
- No sensitive data in logs

## Troubleshooting

### Common Issues

**Connection Refused**
- Check Gmail IMAP is enabled
- Verify app password is correct
- Check firewall settings

**Authentication Failed**
- Verify 2-factor authentication is enabled
- Generate new app password
- Check email address is correct

**Database Errors**
- Verify Supabase credentials
- Check table exists (run migration)
- Verify RLS policies allow access

**No Emails Synced**
- Check email already exists (duplicates skipped)
- Verify user has emails in Gmail
- Check sync interval and max count settings

### Debug Mode
```bash
LOG_LEVEL=debug node dist/imap-puller.js
```

## API Integration

The email puller can be triggered via API calls to the main Investra application:

```typescript
// Trigger manual sync
POST /api/email/trigger-sync

// Get sync status  
GET /api/email/sync-status

// Test IMAP configuration
POST /api/email/test-connection
```

## Development

### Setup
```bash
npm install
npm run build
npm run dev
```

### Testing
```bash
# Test IMAP connection
RUN_ONCE=true LOG_LEVEL=debug npm run dev

# Test with specific config
IMAP_USERNAME=test@gmail.com IMAP_PASSWORD=apppassword npm run dev
```

### Build
```bash
npm run build
```

## License

MIT License - see main Investra project for details.