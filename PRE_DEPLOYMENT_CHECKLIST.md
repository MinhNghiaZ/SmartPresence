# ✅ Pre-Deployment Checklist

## 📋 Quick Checklist (15 minutes)

### 1. Environment Setup
```powershell
# Navigate to backend
cd C:\Users\Maytinh\Desktop\SmartPresence\backend

# Check .env file exists and has correct values
notepad .env

# Required variables:
# - NODE_ENV=production
# - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET
```
- [ ] .env file configured
- [ ] NODE_ENV=production set

### 2. MySQL Configuration
```sql
-- Connect to MySQL
mysql -u root -p

-- Check max_connections (should be >= 100)
SHOW VARIABLES LIKE 'max_connections';
```
- [ ] MySQL max_connections >= 100
- [ ] MySQL server is running

### 3. Build & Test
```powershell
# Clean previous build
npx tsc --build --clean

# Build TypeScript
npm run build

# Check for compilation errors
npx tsc --noEmit
```
- [ ] Build succeeds without errors
- [ ] No TypeScript compilation errors

### 4. Quick Functionality Test
```powershell
# Start server
npm start

# In another terminal, test endpoints:
# Test 1: Try login (should work)
curl http://localhost:3000/api/auth/login -Method POST -Body '{"userId":"test","password":"test"}' -ContentType "application/json"

# Test 2: Try 11 failed logins (should block after 10)
# Test 3: Check logs (should be minimal in production)
```
- [ ] Server starts without errors
- [ ] Login endpoint responds
- [ ] Rate limiting works (blocks after 10 attempts)
- [ ] Logs are minimal (no debug messages in production)

### 5. Monitoring Check (Admin Token Required)
```powershell
# Get admin token first by logging in as admin
$token = "YOUR_ADMIN_TOKEN"

# Check pool stats
Invoke-RestMethod http://localhost:3000/api/auth/admin/db-pool-stats -Headers @{"Authorization"="Bearer $token"}

# Check pool health
Invoke-RestMethod http://localhost:3000/api/auth/admin/db-pool-health -Headers @{"Authorization"="Bearer $token"}

# Check rate limiter stats
Invoke-RestMethod http://localhost:3000/api/auth/admin/rate-limit-stats -Headers @{"Authorization"="Bearer $token"}
```
- [ ] Pool stats endpoint works
- [ ] Pool health shows "healthy: true"
- [ ] Rate limiter stats endpoint works

---

## 🚀 Deployment (5 minutes)

### Production Deployment
```powershell
# Set environment
$env:NODE_ENV="production"

# Option 1: Direct start (for testing)
npm start

# Option 2: PM2 (recommended for production)
npm install -g pm2
pm2 start npm --name "smartpresence-backend" -- start
pm2 save
pm2 startup

# Option 3: Windows Service (for permanent deployment)
# Use pm2-windows-service or NSSM
```
- [ ] Production mode enabled
- [ ] Server running in background
- [ ] Auto-restart configured (PM2 or service)

---

## ⚠️ Critical Checks Before Going Live

### Security
- [ ] No passwords/tokens in logs (check log files)
- [ ] Rate limiting is working (test with multiple failed logins)
- [ ] Admin endpoints require authentication

### Performance
- [ ] Connection pool is 50 (check db-pool-stats)
- [ ] Queries are optimized (check MySQL query log - should see UNION)
- [ ] Response times < 500ms for login

### Monitoring
- [ ] Admin can access monitoring endpoints
- [ ] Pool health check works
- [ ] Rate limiter stats accessible

---

## 🧪 Optional: Load Testing

### If you want to be extra sure (recommended):

```powershell
# Install k6
choco install k6

# Create test file (see DEPLOYMENT_GUIDE.md for script)
# Run load test
k6 run load-test.js
```

Expected results:
- [ ] 95% requests < 500ms
- [ ] No connection errors
- [ ] Server handles 200 concurrent users
- [ ] Rate limiting kicks in properly

---

## ✅ Go/No-Go Decision

### ✅ GO if:
- All checklist items above are checked
- No errors in compilation
- Rate limiting works
- Pool health is "healthy"
- Server responds in < 500ms

### ❌ NO-GO if:
- Compilation errors exist
- MySQL max_connections < 100
- Rate limiting not working
- Pool health shows warnings
- Response times > 1s

---

## 📞 If Issues Occur

### Common Issues & Quick Fixes

**Issue: "Cannot find module"**
```powershell
npm install
npm run build
```

**Issue: "Too many connections"**
```sql
SET GLOBAL max_connections = 151;
```

**Issue: Rate limiter not blocking**
- Check if loginRateLimitMiddleware is in authRoutes.ts
- Restart server

**Issue: Logs showing debug messages**
```powershell
$env:NODE_ENV="production"
npm start
```

---

## 📊 Post-Deployment Monitoring

### First Hour
- [ ] Check server logs (should be minimal)
- [ ] Monitor `/admin/db-pool-health` every 15 minutes
- [ ] Check for any user-reported issues

### First Day
- [ ] Review `/admin/rate-limit-stats` (any blocks?)
- [ ] Check `/admin/db-pool-stats` (utilization?)
- [ ] Monitor error logs

### First Week
- [ ] Collect performance metrics
- [ ] Review user feedback
- [ ] Adjust pool size if needed (based on stats)

---

## 🎉 Success Criteria

Your deployment is successful if:

✅ No compilation errors  
✅ Server runs in production mode  
✅ Rate limiting blocks after 10 attempts  
✅ Database pool shows "healthy"  
✅ Response times < 500ms  
✅ No sensitive data in logs  
✅ 200 concurrent users work smoothly  

---

## 📝 Deployment Log Template

```
Date: ________________
Time: ________________
Deployed by: ________________

Pre-checks:
[ ] Environment configured
[ ] MySQL ready
[ ] Build successful
[ ] Tests passed

Deployment:
[ ] Production mode enabled
[ ] Server started
[ ] Monitoring verified

Post-deployment:
[ ] No errors in logs
[ ] Users can login
[ ] Performance is good

Notes:
_________________________________
_________________________________
_________________________________

Status: [ ] Success  [ ] Issues found
```

---

**Time to Complete: ~20 minutes**  
**Ready to deploy!** 🚀
