# Email Setup Guide - Using Your Own Domain

## Option 1: Self-Hosted Email Server with Your Domain

### Prerequisites:
- Own a domain (e.g., `yourdomain.com`)
- VPS/Server with static IP
- DNS management access

### Steps:

1. **Update Configuration:**
   ```bash
   # Edit environment variables
   cp .env.example .env
   
   # Update these values:
   DOMAIN=yourdomain.com
   EMAIL_USER=transactions@yourdomain.com
   IMAP_HOST=mail.yourdomain.com
   IMAP_USER=transactions@yourdomain.com
   IMAP_PASSWORD=your_secure_password
   ```

2. **Set Up DNS Records:**
   ```
   A Record:     mail.yourdomain.com → YOUR_SERVER_IP
   MX Record:    yourdomain.com → mail.yourdomain.com (Priority: 10)
   TXT Record:   yourdomain.com → "v=spf1 mx ip4:YOUR_SERVER_IP ~all"
   ```

3. **Deploy Email Server:**
   ```bash
   cd email-server
   ./setup.sh
   docker-compose up -d
   ```

4. **Create Email Account:**
   ```bash
   # Inside the mailserver container
   docker exec -it emailserver_mailserver_1 setup email add transactions@yourdomain.com password123
   ```

5. **Configure Wealthsimple Email Forwarding:**
   - Log into your Wealthsimple account
   - Update notification email to: `transactions@yourdomain.com`
   - Or set up forwarding from your current email

---

## Option 2: Use External Email Provider (Easier Setup)

### Using Gmail/Outlook with App Passwords:

1. **Create a dedicated Gmail account:**
   - Create: `yourusername.investra@gmail.com`
   - Enable 2FA
   - Generate App Password

2. **Update Application Configuration:**
   ```bash
   # Edit .env file:
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USER=yourusername.investra@gmail.com
   IMAP_PASSWORD=your_app_password
   IMAP_SECURE=true
   ```

3. **Update the Email Management Page:**
