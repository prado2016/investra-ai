# Investra Email Collector

Standalone Node.js application for collecting emails from Gmail via IMAP and storing them in Supabase for processing.

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
cd email-collector
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

The email collector loads IMAP configurations from the `imap_configurations` table. Each configuration includes:

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
Stores collected emails:
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
   scp -r dist/ package.json user@server:/opt/investra/email-collector/
   ```

3. **Install production dependencies**:
   ```bash
   cd /opt/investra/email-collector
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
   pm2 start dist/imap-puller-db-config.js --name investra-email-collector
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
CMD ["node", "dist/imap-puller-db-config.js"]
```

## Operations

### Manual Sync
```bash
# Run sync once
RUN_ONCE=true node dist/imap-puller-db-config.js
```

### Check Status
```bash
# View PM2 status
pm2 status investra-email-collector

# View logs
pm2 logs investra-email-collector
```

### Stop/Start
```bash
# Stop
pm2 stop investra-email-collector

# Start  
pm2 start investra-email-collector

# Restart
pm2 restart investra-email-collector
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
LOG_LEVEL=debug node dist/imap-puller-db-config.js
```

## API Integration

The email collector can be triggered via API calls to the main Investra application:

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

## Recent Updates

- **2025-06-21**: Successfully configured production email sync with service role authentication
- IMAP connection established and 12 emails synced successfully
- Service now runs with proper Gmail app password and Supabase service role key

## License

MIT License - see main Investra project for details.