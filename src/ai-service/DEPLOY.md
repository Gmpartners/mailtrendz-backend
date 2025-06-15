# 🚀 DEPLOY INSTRUCTIONS - RAILWAY

## Current Issue: Railway using cached version

### IMMEDIATE SOLUTION:

1. **Go to Railway Dashboard**
2. **Find your Python AI Service project**
3. **Go to Settings > Environment**
4. **Add new variable to force redeploy:**
   - Name: `FORCE_REDEPLOY`
   - Value: `2025-06-15-with-generate-endpoint`
5. **Click "Redeploy"**

### OR Use Railway CLI:

```bash
# Install Railway CLI if not installed
npm install -g @railway/cli

# Login to Railway
railway login

# Force redeploy
railway up --service python-ai-service
```

### Verify Deployment:

After redeploy, test these endpoints:

```bash
# 1. Basic health check
curl https://mailtrendz-backend-production.up.railway.app/health

# 2. Check if /generate endpoint exists
curl -X POST https://mailtrendz-backend-production.up.railway.app/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test","industry":"tecnologia","tone":"professional"}'

# 3. Test /status endpoint
curl https://mailtrendz-backend-production.up.railway.app/status
```

### Expected Response from /generate:

```json
{
  "success": true,
  "data": {
    "id": "email_xxx",
    "content": {
      "html": "...",
      "subject": "🔥 Inovações Tecnológicas em Destaque"
    }
  },
  "metadata": {
    "service": "python-ai-ultra-simple"
  }
}
```

### If still 404:

1. Check Railway logs
2. Verify the correct service is selected
3. Check if there are multiple deployments
4. Manual redeploy from dashboard
