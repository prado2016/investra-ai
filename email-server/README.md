# Investra AI Email Server

This directory contains the complete email server infrastructure for receiving and processing Wealthsimple transaction confirmation emails.

## Quick Start

1. **Setup the email server:**
   ```bash
   cd email-server
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Start the server:**
   ```bash
   ./start-mailserver.sh
   ```

3. **Configure DNS** (see DNS_SETUP.md for details)

4. **Test the setup:**
   ```bash
   ./test-email.sh
   ```

## Architecture

```
Wealthsimple → Internet → Your Email Server → IMAP → Email Processing Service → API
```

### Components

- **Docker Mailserver**: Core email receiving infrastructure
- **Postfix**: SMTP server for receiving emails
- **Dovecot**: IMAP server for email access
- **Roundcube**: Web-based email client (optional)
- **Fail2Ban**: Security protection
- **SpamAssassin**: Spam filtering

## Files Overview

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main container configuration |
| `setup.sh` | Initial setup script |
| `start-mailserver.sh` | Start the email server |
| `stop-mailserver.sh` | Stop the email server |
| `test-email.sh` | Test server functionality |
| `DNS_SETUP.md` | DNS configuration guide |
| `.env` | Environment variables |

## Configuration

### Email Account
- **Email**: transactions@investra.com
- **Password**: InvestraSecure2025!
- **IMAP Host**: localhost (or your server IP)
- **IMAP Port**: 993 (SSL)
- **SMTP Host**: localhost (or your server IP)
- **SMTP Port**: 587 (STARTTLS)

### Ports Used
- **25**: SMTP (incoming mail)
- **587**: SMTP Submission (authenticated)
- **993**: IMAPS (secure IMAP)
- **143**: IMAP (plain)
- **8080**: Roundcube webmail (optional)

## Security Features

1. **TLS/SSL Encryption**: All connections encrypted
2. **Fail2Ban**: Automatic IP blocking for failed attempts
3. **SpamAssassin**: Spam filtering
4. **Rate Limiting**: Prevents abuse
5. **Authentication Required**: SMTP auth required for sending

## Monitoring

### Check Server Status
```bash
docker-compose ps
```

### View Logs
```bash
# All logs
docker-compose logs

# Specific service
docker-compose logs mailserver

# Follow logs
docker-compose logs -f mailserver
```

### Check Email Queue
```bash
docker-compose exec mailserver postqueue -p
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :25
   
   # Stop conflicting service
   sudo systemctl stop postfix
   ```

2. **Permission denied**
   ```bash
   # Fix permissions
   chmod +x *.sh
   ```

3. **DNS not configured**
   - See DNS_SETUP.md for detailed instructions
   - Use nslookup to verify records

4. **Emails not being received**
   ```bash
   # Check logs
   docker-compose logs mailserver | grep -i error
   
   # Check firewall
   sudo ufw status
   ```

### Useful Commands

```bash
# Restart specific service
docker-compose restart mailserver

# Update containers
docker-compose pull
docker-compose up -d

# Access container shell
docker-compose exec mailserver bash

# Test SMTP locally
telnet localhost 25
```

## Production Deployment

For production use, consider:

1. **SSL Certificates**: Use Let's Encrypt
2. **Backup Strategy**: Regular backups of mail data
3. **Monitoring**: Set up alerts and monitoring
4. **Security Hardening**: Additional security measures
5. **Scaling**: Consider load balancing for high volume

## Integration with Investra AI

The email server integrates with the main application through:

1. **IMAP Client Service**: Fetches emails (Task 7)
2. **Email Parser**: Processes Wealthsimple emails (Task 3)
3. **API Endpoints**: Manages email processing (Task 6)

## Environment Variables

Key configuration options in `.env`:

```bash
HOSTNAME=mail.investra.com
DOMAINNAME=investra.com
MAILSERVER_USER=transactions@investra.com
MAILSERVER_PASS=InvestraSecure2025!
IMAP_HOST=localhost
IMAP_PORT=993
IMAP_TLS=true
```

## Support

For issues or questions:
1. Check the logs first
2. Review DNS configuration
3. Test network connectivity
4. Consult docker-mailserver documentation

## Related Tasks

- **Task 3**: Wealthsimple Email Parser
- **Task 6**: Email Processing API Endpoints  
- **Task 7**: IMAP Email Processor Service

---

**Status**: Ready for testing and integration
**Last Updated**: January 2025
