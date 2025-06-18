# Production Runbook
## Investra AI - Email Processing System

**Version:** 1.0  
**Last Updated:** June 18, 2025  
**Maintained By:** System Administration Team  
**Emergency Contact:** [Your Contact Information]  

---

## 🚀 **SYSTEM OVERVIEW**

### **Architecture Components**
- **Frontend Application:** React 19 + TypeScript (Vite development server)
- **Backend API:** Node.js + Express.js (Production server)
- **Database:** Supabase PostgreSQL
- **Email Processing:** IMAP integration with Wealthsimple email parsing
- **Monitoring:** Winston logging with structured JSON output

### **Service Dependencies**
- **External Services:** Supabase, Google AI Services, Yahoo Finance API
- **Network Requirements:** HTTPS/SSL, IMAP (port 993), HTTP (ports 3001, 5173)
- **Storage Requirements:** Database storage, log file storage

---

## 🔧 **DEPLOYMENT PROCEDURES**

### **Pre-Deployment Checklist**
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates valid
- [ ] Backup procedures tested
- [ ] Monitoring systems active
- [ ] Health checks passing

### **Standard Deployment Process**

#### **1. Frontend Deployment**
```bash
# Navigate to project directory
cd /path/to/investra-ai

# Install dependencies
npm install

# Build production version
npm run build

# Start development server (for testing)
npm run dev
# Access: http://localhost:5173
```

#### **2. Backend API Deployment**
```bash
# Navigate to server directory
cd /path/to/investra-ai/server

# Install server dependencies
npm install

# Compile TypeScript (if needed)
npm run build

# Start production server
node dist/simple-production-server.js
# Access: http://localhost:3001
```

#### **3. Environment Configuration**
```bash
# Required environment variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:3001

# Optional email configuration
IMAP_HOST=your-email-server.com
IMAP_PORT=993
IMAP_USERNAME=transactions@yourdomain.com
IMAP_PASSWORD=your-secure-password
```

---

## 🔍 **MONITORING AND HEALTH CHECKS**

### **Health Check Endpoints**
| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | System health status | 200 OK with system metrics |
| `GET /api/status` | Service operational status | 200 OK with feature status |

### **Health Check Commands**
```bash
# Check API health
curl -s http://localhost:3001/health | jq .

# Check service status
curl -s http://localhost:3001/api/status | jq .

# Check frontend accessibility
curl -s http://localhost:5173 | head -10
```

### **Key Metrics to Monitor**
- **Response Time:** API endpoints should respond within 1 second
- **Memory Usage:** Should remain under 100MB for normal operations
- **Error Rate:** Should be <1% for valid requests
- **Uptime:** Target 99.9% availability

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues and Solutions**

#### **Issue: Frontend Not Loading**
**Symptoms:** Browser shows connection refused or timeout
**Diagnosis:**
```bash
# Check if development server is running
ps aux | grep vite
curl -s http://localhost:5173
```
**Solution:**
```bash
# Restart development server
cd /path/to/investra-ai
npm run dev
```

#### **Issue: API Server Not Responding**
**Symptoms:** API calls return connection errors
**Diagnosis:**
```bash
# Check if API server is running
ps aux | grep node
curl -s http://localhost:3001/health
```
**Solution:**
```bash
# Restart API server
cd /path/to/investra-ai/server
node dist/simple-production-server.js
```

#### **Issue: Database Connection Errors**
**Symptoms:** API returns database connection errors
**Diagnosis:**
- Check Supabase service status
- Verify environment variables
- Test database connectivity
**Solution:**
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Check Supabase project status
- Restart services after fixing configuration

#### **Issue: Email Processing Failures**
**Symptoms:** Email processing returns validation errors
**Diagnosis:**
```bash
# Test email processing endpoint
curl -X POST http://localhost:3001/api/email/process \
  -H "Content-Type: application/json" \
  -d '{"subject":"test","fromEmail":"test@example.com","htmlContent":"test"}'
```
**Solution:**
- Verify request format includes required fields
- Check server logs for detailed error messages
- Validate email content format

---

## 📊 **PERFORMANCE OPTIMIZATION**

### **Performance Benchmarks**
- **Frontend Load Time:** <3 seconds
- **API Response Time:** <1 second
- **Email Processing:** <10 seconds per email
- **Database Queries:** <500ms

### **Optimization Strategies**
1. **Frontend Optimization**
   - Enable production build optimizations
   - Implement code splitting
   - Use CDN for static assets

2. **Backend Optimization**
   - Implement response caching
   - Optimize database queries
   - Use connection pooling

3. **Database Optimization**
   - Index frequently queried fields
   - Implement query optimization
   - Monitor slow queries

---

## 🔐 **SECURITY PROCEDURES**

### **Security Checklist**
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] HTTPS/SSL certificates valid
- [ ] Database access restricted
- [ ] Input validation implemented
- [ ] Error messages sanitized

### **Security Monitoring**
- Monitor failed authentication attempts
- Track unusual API usage patterns
- Review access logs regularly
- Validate SSL certificate expiration

---

## 💾 **BACKUP AND RECOVERY**

### **Backup Procedures**
1. **Database Backup**
   - Supabase automatic backups enabled
   - Manual backup procedures documented
   - Recovery testing performed monthly

2. **Application Backup**
   - Source code in version control (Git)
   - Configuration files backed up
   - Environment variables documented

3. **Log Backup**
   - Application logs rotated daily
   - Critical logs archived monthly
   - Log retention policy: 90 days

### **Recovery Procedures**
1. **Service Recovery**
   - Restart failed services
   - Verify health checks
   - Monitor for stability

2. **Database Recovery**
   - Use Supabase backup restoration
   - Verify data integrity
   - Test application functionality

3. **Full System Recovery**
   - Redeploy from source control
   - Restore configuration
   - Validate all services

---

## 📞 **ESCALATION PROCEDURES**

### **Incident Severity Levels**

#### **Severity 1: Critical (System Down)**
- **Response Time:** Immediate (15 minutes)
- **Examples:** Complete system outage, data loss
- **Actions:** Immediate escalation to on-call engineer

#### **Severity 2: High (Major Functionality Impaired)**
- **Response Time:** 1 hour
- **Examples:** Email processing failures, API errors
- **Actions:** Assign to development team

#### **Severity 3: Medium (Minor Issues)**
- **Response Time:** 4 hours
- **Examples:** Performance degradation, UI issues
- **Actions:** Standard support queue

#### **Severity 4: Low (Enhancement Requests)**
- **Response Time:** Next business day
- **Examples:** Feature requests, documentation updates
- **Actions:** Product backlog

### **Contact Information**
- **Primary On-Call:** [Phone/Email]
- **Secondary On-Call:** [Phone/Email]
- **Development Team Lead:** [Phone/Email]
- **Product Owner:** [Phone/Email]

---

## 📋 **MAINTENANCE PROCEDURES**

### **Regular Maintenance Tasks**

#### **Daily**
- [ ] Check system health status
- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion

#### **Weekly**
- [ ] Review security logs
- [ ] Update system documentation
- [ ] Test backup recovery procedures
- [ ] Performance trend analysis

#### **Monthly**
- [ ] Security patch updates
- [ ] SSL certificate renewal check
- [ ] Capacity planning review
- [ ] Disaster recovery testing

#### **Quarterly**
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Documentation updates
- [ ] Training updates

---

## 📚 **REFERENCE INFORMATION**

### **Important File Locations**
- **Application Code:** `/path/to/investra-ai/`
- **Server Code:** `/path/to/investra-ai/server/`
- **Configuration Files:** `.env`, `.env.production`
- **Log Files:** `server/logs/`, `server/combined.log`

### **Key Commands Reference**
```bash
# Start services
npm run dev                    # Frontend development server
node dist/simple-production-server.js  # Backend API server

# Health checks
curl http://localhost:5173     # Frontend check
curl http://localhost:3001/health      # API health check

# Log monitoring
tail -f server/logs/email-api-*.log    # Real-time logs
grep ERROR server/combined.log         # Error log search
```

### **Configuration Files**
- **Frontend Config:** `vite.config.ts`, `package.json`
- **Backend Config:** `server/package.json`, `server/tsconfig.json`
- **Environment:** `.env`, `.env.production`

---

**Document Version:** 1.0  
**Last Review:** June 18, 2025  
**Next Review:** July 18, 2025  
**Approval:** System Administrator
