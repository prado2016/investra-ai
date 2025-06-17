# Security Configuration for Investra AI Email Server

## Overview
This document outlines security measures implemented in the email server setup.

## Security Features Implemented

### 1. TLS/SSL Encryption
- **IMAPS (Port 993)**: SSL/TLS encrypted IMAP
- **SMTP Submission (Port 587)**: STARTTLS encryption
- **Modern TLS**: Only secure cipher suites enabled

### 2. Authentication Security
- **SASL Authentication**: Required for SMTP submission
- **Strong Passwords**: Minimum complexity requirements
- **Account Isolation**: Separate mail accounts for different purposes

### 3. Spam and Abuse Protection
- **SpamAssassin**: Content-based spam filtering
- **Fail2Ban**: IP-based intrusion detection
- **Rate Limiting**: Connection and message rate limits
- **Postgrey**: Greylisting for spam reduction

### 4. Network Security
- **Firewall Ready**: Specific ports exposed only
- **Docker Network Isolation**: Container isolation
- **Connection Limits**: Max connections per IP

## Configuration Details

### Fail2Ban Configuration
```bash
# Jail settings for email services
[postfix]
enabled = true
port = smtp,465,submission
filter = postfix
logpath = /var/log/mail/mail.log
maxretry = 3
bantime = 600

[dovecot]
enabled = true
port = pop3,pop3s,imap,imaps,submission,465,sieve
filter = dovecot
logpath = /var/log/mail/mail.log
maxretry = 3
bantime = 600
```

### SpamAssassin Rules
```bash
# Custom SpamAssassin configuration
required_score 5.0
report_safe 0
rewrite_header Subject [SPAM]

# Wealthsimple whitelist
whitelist_from *@wealthsimple.com
whitelist_from *@notifications.wealthsimple.com
```

### TLS Configuration
```bash
# Modern TLS configuration
ssl_protocols = !SSLv3 !TLSv1 !TLSv1.1
ssl_cipher_list = ECDHE+AESGCM:ECDHE+AES256:ECDHE+AES128:RSA+AES:!aNULL:!MD5:!DSS
ssl_prefer_server_ciphers = yes
ssl_dh_parameters_length = 2048
```

## Security Checklist

### Pre-Deployment
- [ ] Change default passwords
- [ ] Configure firewall rules  
- [ ] Set up SSL certificates
- [ ] Configure DNS security records
- [ ] Review and test backup procedures

### Regular Maintenance
- [ ] Monitor failed login attempts
- [ ] Review spam filter effectiveness
- [ ] Update container images
- [ ] Check SSL certificate expiration
- [ ] Monitor disk space and logs

### Incident Response
- [ ] Log monitoring and alerting
- [ ] Backup and recovery procedures
- [ ] Contact information for emergencies
- [ ] Documentation of security procedures

## Monitoring and Alerts

### Log Files to Monitor
```bash
# Key log files for security monitoring
/var/log/mail/mail.log          # General mail server logs
/var/log/mail/mail.err          # Mail server errors  
/var/log/fail2ban.log           # Intrusion attempts
/var/log/mail/mail.warn         # Warnings and issues
```

### Alert Conditions
- Multiple failed login attempts
- Unusual connection patterns
- High spam volume
- Disk space warnings
- SSL certificate expiration

## Access Control

### Email Account Management
```bash
# Add new email account
echo "newuser@investra.com|{PLAIN}SecurePassword123!" >> docker-data/dms/config/postfix-accounts.cf

# Remove email account  
sed -i '/unwanted@investra.com/d' docker-data/dms/config/postfix-accounts.cf

# Restart to apply changes
docker-compose restart mailserver
```

### IMAP Access Control
```bash
# Restrict IMAP access by IP (if needed)
# Add to dovecot.cf:
remote {
  disable_plaintext_auth = yes
}
```

## Backup Security

### What to Backup
- Email data: `docker-data/dms/mail-data/`
- Configuration: `docker-data/dms/config/`
- Certificates: `docker-data/dms/certs/`
- Logs: `docker-data/dms/mail-logs/`

### Backup Script Example
```bash
#!/bin/bash
# Secure backup script
BACKUP_DIR="/secure/backups/email-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Stop services for consistent backup
docker-compose stop mailserver

# Create encrypted backup
tar -czf - docker-data/ | gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output "$BACKUP_DIR/email-backup.tar.gz.gpg"

# Restart services
docker-compose start mailserver

# Remove old backups (keep 30 days)
find /secure/backups/ -name "email-*" -mtime +30 -delete
```

## Production Security Enhancements

### Additional Measures for Production
1. **Web Application Firewall (WAF)**: If using web interface
2. **Intrusion Detection System (IDS)**: Network-level monitoring
3. **Security Scanning**: Regular vulnerability assessments
4. **Certificate Transparency Monitoring**: SSL cert monitoring
5. **SIEM Integration**: Central security monitoring

### Compliance Considerations
- **Data Retention**: Configure email retention policies
- **Encryption at Rest**: Encrypt mail storage volumes
- **Audit Logging**: Comprehensive access logging
- **Access Reviews**: Regular permission audits

## Emergency Procedures

### Security Incident Response
1. **Isolate**: Disconnect affected systems
2. **Assess**: Determine scope of incident
3. **Contain**: Stop ongoing threats
4. **Investigate**: Analyze logs and evidence
5. **Recover**: Restore from clean backups
6. **Report**: Document incident and lessons learned

### Contact Information
```bash
# Emergency contacts
Security Team: security@investra.com
System Admin: admin@investra.com
Hosting Provider: [Provider support contact]
```

## Security Testing

### Regular Security Tests
```bash
# Test email security
./test-email-security.sh

# Check for vulnerable services
nmap -sV localhost

# Test authentication
curl -u test:wrong https://localhost:993

# Check SSL configuration  
sslscan localhost:993
```

---

**Note**: This is a baseline security configuration. Additional measures may be required based on specific compliance requirements and threat models.
