# DNS Configuration for Investra AI Email Server

## Overview
This document outlines the DNS records required for the Investra AI email server to receive emails from Wealthsimple and other sources.

## Required DNS Records

### 1. A Record (Required)
Points your mail subdomain to your server's IP address.

```
Type: A
Name: mail.investra.com
Value: YOUR_SERVER_IP
TTL: 3600
```

### 2. MX Record (Required)
Tells other email servers where to deliver mail for your domain.

```
Type: MX
Name: investra.com (or @)
Value: mail.investra.com
Priority: 10
TTL: 3600
```

### 3. SPF Record (Required)
Specifies which servers are authorized to send email from your domain.

```
Type: TXT
Name: investra.com (or @)
Value: "v=spf1 mx ip4:YOUR_SERVER_IP ~all"
TTL: 3600
```

### 4. DKIM Record (Recommended)
Provides email authentication and integrity verification.

```
Type: TXT
Name: mail._domainkey.investra.com
Value: "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"
TTL: 3600
```

**Note**: The DKIM public key will be generated after the mail server is running.

### 5. DMARC Record (Recommended)
Provides policy instructions for handling emails that fail SPF/DKIM checks.

```
Type: TXT
Name: _dmarc.investra.com
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@investra.com"
TTL: 3600
```

### 6. Reverse DNS / PTR Record (Important)
Maps your server IP back to your domain name.

```
Type: PTR
Name: YOUR_SERVER_IP
Value: mail.investra.com
```

**Note**: This is usually configured through your hosting provider or VPS dashboard.

## Example DNS Configuration

### For CloudFlare
```
# A Record
mail.investra.com → YOUR_SERVER_IP

# MX Record  
investra.com → mail.investra.com (Priority: 10)

# TXT Records
investra.com → "v=spf1 mx ip4:YOUR_SERVER_IP ~all"
_dmarc.investra.com → "v=DMARC1; p=quarantine; rua=mailto:dmarc@investra.com"
```

### For AWS Route 53
```json
{
  "Type": "A",
  "Name": "mail.investra.com",
  "Value": "YOUR_SERVER_IP",
  "TTL": 3600
},
{
  "Type": "MX", 
  "Name": "investra.com",
  "Value": "10 mail.investra.com",
  "TTL": 3600
},
{
  "Type": "TXT",
  "Name": "investra.com", 
  "Value": "v=spf1 mx ip4:YOUR_SERVER_IP ~all",
  "TTL": 3600
}
```

## Verification Commands

### 1. Check A Record
```bash
nslookup mail.investra.com
# Should return your server IP
```

### 2. Check MX Record
```bash
nslookup -type=MX investra.com
# Should return: mail.investra.com with priority 10
```

### 3. Check SPF Record
```bash
nslookup -type=TXT investra.com
# Should include your SPF record
```

### 4. Test Email Delivery
```bash
# Send test email
echo "Test email" | mail -s "Test Subject" transactions@investra.com
```

## Development vs Production

### Development Setup
For local development, you can use:
- Local DNS entries in `/etc/hosts`
- Port forwarding if behind NAT
- Services like ngrok for external access

### Production Setup
For production deployment:
- Use real domain with proper DNS
- Configure SSL certificates (Let's Encrypt)
- Set up monitoring and logging
- Implement security hardening

## Troubleshooting

### Common Issues

1. **Emails not being received**
   - Check MX record configuration
   - Verify firewall ports (25, 587, 993)
   - Check mail server logs

2. **Emails going to spam**
   - Verify SPF record
   - Set up DKIM signing
   - Configure DMARC policy
   - Check server reputation

3. **IMAP connection issues**
   - Verify port 993 is open
   - Check SSL certificate
   - Verify authentication credentials

### Useful Tools

- **MX Toolbox**: https://mxtoolbox.com/
- **Mail Tester**: https://www.mail-tester.com/
- **DNS Checker**: https://dnschecker.org/

## Security Considerations

1. **Rate Limiting**: Configure to prevent abuse
2. **Fail2Ban**: Monitor for brute force attempts  
3. **SSL/TLS**: Always use encrypted connections
4. **Regular Updates**: Keep mail server software updated
5. **Monitoring**: Set up alerts for unusual activity

## Next Steps

After DNS configuration:
1. Start the mail server: `./start-mailserver.sh`
2. Test email reception: `./test-email.sh`
3. Verify all DNS records are working
4. Set up SSL certificates
5. Configure email processing service
