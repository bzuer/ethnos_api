# Environment Configuration Guide

## Overview

This project uses different environment files for different deployment scenarios. **NEVER commit files containing real credentials to version control**.

## Environment Files Structure

### 📁 Available Files:

| File | Purpose | Contains Credentials | Committed to Git |
|------|---------|---------------------|------------------|
| `.env.example` | Template for development | ❌ No (placeholders) | ✅ Yes |
| `.env.production.example` | Template for production | ❌ No (placeholders) | ✅ Yes |
| `.env` | Development environment | ⚠️ **YES** - Real dev credentials | ❌ **NO** |
| `.env.test` | Testing environment | ⚠️ **NO** - Test placeholders | ❌ **NO** |
| `.env.production` | Production environment | 🔴 **YES** - Real prod credentials | ❌ **NO** |

## 🛠️ Setup Instructions

### For Development:
1. Copy the example file: `cp .env.example .env`
2. Edit `.env` with your development database credentials
3. Start development: `./server.sh start`

### For Production:
1. Copy the production template: `cp .env.production.example .env.production`
2. Edit `.env.production` with secure production credentials
3. Set `NODE_ENV=production` 
4. Use strong passwords and secure secrets

### For Testing:
- `.env.test` is already configured with safe test values
- Tests automatically load this file via `tests/setup.js`
- **DO NOT** put real credentials in test files

## 🔒 Security Best Practices

### ✅ DO:
- Use strong, unique passwords for production
- Use environment variables for all sensitive data
- Set appropriate rate limits for production
- Enable SSL/HTTPS in production
- Use different databases for dev/test/production
- Rotate credentials regularly

### ❌ DON'T:
- Commit `.env`, `.env.production`, or any file with real credentials
- Use production credentials in development or testing
- Put credentials in source code
- Use weak or default passwords
- Share environment files via email or chat

## 🗂️ Key Configuration Sections

### Database Configuration
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_secure_password
```

### Security Configuration
```env
RATE_LIMIT_GENERAL=100      # Production: strict limits
ENABLE_RATE_LIMITING=true   # Production: always enabled
ENABLE_HTTPS=true          # Production: required
```

### Cache Configuration
```env
CACHE_TTL_SEARCH=1800      # Production: longer TTL
CACHE_TTL_STATISTICS=3600  # Production: optimize for performance
```

## 🚀 Environment-Specific Differences

### Development (`.env`)
- Relaxed rate limits
- Detailed logging
- Local database
- HTTP allowed

### Production (`.env.production`)
- Strict security settings
- Minimal logging
- Remote/clustered database
- HTTPS required
- Strong authentication

### Testing (`.env.test`)
- No rate limiting
- Error-only logging  
- Test database or mocks
- Fast cache expiry

## 🔧 Scripts Integration

All management scripts automatically load environment variables:
- `./server.sh` - Main server management
- `./scripts/db-cleanup.sh` - Database maintenance
- `./scripts/cron-manager.sh` - Cron job management
- `./scripts/sphinx-manager.sh` - Search engine management

## 🏥 Health Monitoring

The system monitors configuration health:
- Database connectivity
- Redis connectivity  
- Environment variable validation
- Security settings verification

Check status: `curl http://localhost:3000/health`

## ⚠️ Troubleshooting

### Common Issues:
1. **"Environment file not found"** - Copy from `.env.example`
2. **"Database connection failed"** - Check credentials in `.env`
3. **"Redis not available"** - Verify Redis configuration
4. **"API not responding"** - Check port conflicts and environment

### Security Issues:
1. **Hardcoded credentials found** - Use environment variables
2. **Weak passwords** - Generate secure passwords
3. **Missing HTTPS** - Enable SSL for production

## 📚 Related Documentation

- [Script Management Guide](../CLAUDE.md)
- [Database Configuration](../database/README.md)
- [Security Setup](../notes/SECURITY_AUDIT.md)
- [API Documentation](http://localhost:3000/docs)

---

**⚠️ SECURITY REMINDER:** Always protect your environment files and never commit real credentials to version control!