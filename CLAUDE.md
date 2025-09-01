# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with hot reload (runs on port 8000)
- `npm run dev:clean` - Kill any existing process on port and start fresh
- `npm run build` - Compile TypeScript to JavaScript (outputs to dist/)
- `npm run start` - Run compiled production server
- `npm run start:production` - Build and start production server
- `npm run typecheck` - Type check without emitting files
- `npm run lint` - Lint TypeScript files in src/

### Utility Commands
- `npm run check` - Run startup health checks
- `npm run kill-port` - Kill process running on default port
- `node scripts/kill-port.js 8000` - Kill specific process on port 8000
- `npm run clean` - Remove dist directory
- `npm run fix` - Run common issue fixes
- `npm run fix:auto` - Run fixes and restart dev server

### Test & Debug Commands
- `node debug-user-folders.js <USER_ID>` - Debug folder visibility for specific user
- `node debug-organization-error.js <USER_ID>` - Debug organization 500 errors
- `node test-folder-fix.js` - Test if folder authentication fix is working
- `node test-frontend-folders.js` - Test frontend folder requests

### 🚨 EXECUTE AGORA:
1. **Inicie o backend**: `npm run dev`
2. **Teste organizações**: `node debug-organization-error.js e0ebd2e9-5e5c-49cb-a804-f9db7878e135`
3. **Teste pastas**: `node test-frontend-folders.js`

### Database & Migration Commands
- `npm run migrate:monthly-usage` - Run monthly usage system migration
- `npm run reset-user-usage` - Reset user usage data
- `npm run initialize-credits` - Initialize credits system

### Stripe Integration Commands
- `npm run test:stripe` - Test Stripe integration
- `npm run setup:stripe` - Setup Stripe configuration

## Architecture Overview

### Application Structure
This is a Node.js/Express/TypeScript backend API for MailTrendz, an AI-powered email marketing platform. The application uses:

- **Database**: Supabase (PostgreSQL with built-in auth and real-time capabilities)
- **Payments**: Stripe integration for subscriptions and billing
- **AI Services**: OpenRouter integration for AI content generation
- **Storage**: Supabase Storage for file uploads
- **Caching**: Memory-based caching service
- **Authentication**: Supabase Auth with JWT tokens

### Key Architectural Patterns

#### Multi-Tenant Organization System
The application supports multi-user organizations with:
- Organization-based project isolation
- Member invitations and role management
- Credits shared within organizations
- Admin controls and activity logging

#### Credits & Subscription System
- **Unified subscription system** using Stripe as source of truth
- **Atomic credit consumption** via database functions
- **Automatic period management** with triggers
- **Three tiers**: Free (3 credits), Pro (50 credits), Enterprise (unlimited)
- **Monthly usage tracking** with automatic resets

#### Database Views & Functions
- `subscription_state` view - Consolidated subscription data
- `consume_credit()` function - Atomic credit consumption
- `ensure_current_period()` function - Period management
- Automatic triggers for Stripe webhook synchronization

### Service Layer Architecture

#### Core Services
- **ai.service.ts** - AI content generation via OpenRouter
- **auth.service.ts** - Authentication and user management
- **project.service.ts** - Project creation and management
- **subscription.service.ts** - Unified subscription and credits handling
- **stripe.service.ts** - Stripe payment processing
- **organization.service.ts** - Multi-tenant organization management

#### Middleware Stack
- **auth.middleware.ts** - JWT token validation and user context
- **credits.middleware.ts** - Credit consumption checks
- **organization.middleware.ts** - Organization access control
- **rate-limit.middleware.ts** - API rate limiting (endpoint-specific)
- **subscription.middleware.ts** - Subscription status validation

### API Structure
All routes are prefixed with `/api/v1/` and include:
- `/auth` - Authentication (rate limited)
- `/projects` - Project management
- `/ai` - AI generation (heavily rate limited)
- `/subscriptions` - Stripe billing and plans
- `/organizations` - Multi-tenant organization management
- `/credits` - Credits information and consumption
- `/folders` - Project organization
- `/upload` - File upload handling

### Configuration Management
- **TypeScript paths** configured with @ aliases for clean imports
- **Environment variables** managed via .env (Supabase, Stripe, AI keys)
- **CORS configuration** in separate config file
- **Logging** via Winston with multiple transports

### Important Implementation Notes

#### Database Access Patterns
- Use `supabaseAdmin` for admin operations (bypasses RLS)
- Use `getSupabaseWithAuth(token)` for user-scoped operations
- Always respect Row Level Security (RLS) policies
- Use database functions for atomic operations

#### Error Handling
- Centralized error handling middleware
- Request ID tracking for debugging
- Comprehensive logging with Winston
- Graceful degradation for external service failures

#### Performance Optimizations
- Memory-based caching for frequent queries
- Endpoint-specific rate limiting
- Connection pooling for database
- Conditional webhook rate limiting exclusions

#### Security Measures
- Helmet.js for security headers
- Input validation with express-validator and Joi
- JWT token validation on protected routes
- Rate limiting for abuse prevention
- CORS properly configured

## Critical Integration Points

### Stripe Webhook Handling
The `/api/v1/subscriptions/webhook` endpoint processes Stripe events and must:
- Be excluded from JSON parsing middleware
- Be excluded from rate limiting
- Handle subscription lifecycle events
- Maintain synchronization with local database

### AI Service Integration
AI generation through OpenRouter requires:
- Credit validation before processing
- Usage tracking and consumption
- Error handling for API failures
- Response caching for performance

### Supabase Integration
- Proper client initialization with service roles
- RLS policy compliance
- Real-time subscriptions where needed
- Storage integration for file uploads

## Development Workflow

1. **Always run `npm run typecheck`** before committing
2. **Use `npm run lint`** to maintain code quality  
3. **Test Stripe integration** with `npm run test:stripe`
4. **Monitor health** via `/health` endpoint
5. **Check migration status** before major changes

## Testing & Debugging

### Health Checks
- Main health endpoint: `/health`
- API health endpoint: `/api/v1/health`
- Database connection test via `testConnection()`
- Cache statistics via debug routes

### Debug Tools
- `/api/v1/debug/cache/stats` - Cache performance
- `/api/v1/debug/performance` - Performance metrics
- Memory usage monitoring in health endpoints
- Winston logging with multiple levels

## Environment Configuration

Required environment variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `OPENROUTER_API_KEY` for AI services
- `JWT_SECRET` for additional token signing
- `NODE_ENV`, `PORT`, `APP_URL`

## 🚀 Deploy & Production

### Server Access (SSH)
```bash
# Acessar servidor de produção
ssh root@213.199.35.254
# Senha: mc/xB37WemUf
```

### Estrutura do Servidor
```
/root/mailtrendz-backend/     # Backend (Node.js + PM2)
/root/mailtrendz-frontend/    # Frontend (React build)
/var/www/mailtrendz/         # Arquivos servidos pelo Nginx
```

### Processo de Deploy Completo

#### 1. Deploy do Backend
```bash
# No servidor (SSH)
cd /root/mailtrendz-backend

# Resolver conflitos se houver
git stash

# Atualizar código
git pull origin master

# Reiniciar serviço
pm2 restart backend-mailtrendz

# Verificar status
pm2 status
pm2 logs backend-mailtrendz --lines 20
```

#### 2. Deploy do Frontend
```bash
# No servidor (SSH)
cd /root/mailtrendz-frontend

# Atualizar código
git pull origin main

# Build para produção
npm run build

# Backup da versão atual
cp -r /var/www/mailtrendz /var/www/mailtrendz-backup-$(date +%Y%m%d_%H%M%S)

# Copiar novos arquivos
cp -r /root/mailtrendz-frontend/dist/* /var/www/mailtrendz/

# Ajustar permissões
chown -R www-data:www-data /var/www/mailtrendz/
chmod -R 755 /var/www/mailtrendz/

# Testar e recarregar Nginx
nginx -t
systemctl reload nginx
```

#### 3. Verificação Pós-Deploy
```bash
# Verificar status dos serviços
pm2 status
systemctl status nginx

# Verificar logs
pm2 logs backend-mailtrendz --lines 10
tail -f /var/log/nginx/access.log

# Testar endpoints
curl -X GET http://localhost:8000/health
curl -X GET http://localhost/health
```

### Configurações de Produção

#### Nginx Configuration
- **Frontend**: Servido via Nginx em `/var/www/mailtrendz/`
- **Backend**: Proxy reverso para `localhost:8000`
- **SSL**: Configurado com certificados (se aplicável)

#### PM2 Configuration
- **Processo**: `backend-mailtrendz`
- **Modo**: `cluster` 
- **Porta**: `8000`
- **Arquivo de configuração**: `.env.production`

#### Stripe Webhooks (Produção)
- **URL**: `https://api.mailtrendz.com/api/v1/webhooks/stripe`
- **Secret**: `whsec_YEfQYA6bJ9k9QibPjUPokZf0z35vYvlO`
- **Webhook ID**: `we_1S2ZcKLIDpwN7e9FSytV9UDg`

**Eventos configurados:**
- `checkout.session.completed`
- `customer.subscription.created/updated/deleted`  
- `invoice.payment_succeeded/failed/paid/created/finalized`
- `customer.created/updated`
- `charge.succeeded`
- `payment_intent.succeeded`
- `payment_method.attached`

### Comandos de Manutenção

#### Monitoramento
```bash
# Status geral do sistema
pm2 monit

# Uso de recursos
htop
df -h
free -h

# Logs em tempo real
pm2 logs backend-mailtrendz --follow
tail -f /var/log/nginx/error.log
```

#### Backup
```bash
# Backup automático antes de deploy
cp -r /var/www/mailtrendz /var/www/mailtrendz-backup-$(date +%Y%m%d_%H%M%S)

# Backup do banco (via Supabase Dashboard)
# Backup dos .env files
cp /root/mailtrendz-backend/.env.production /root/backups/env-backend-$(date +%Y%m%d).backup
```

#### Rollback
```bash
# Se algo der errado, fazer rollback
# Backend
cd /root/mailtrendz-backend
git reset --hard HEAD~1
pm2 restart backend-mailtrendz

# Frontend
cp -r /var/www/mailtrendz-backup-YYYYMMDD_HHMMSS/* /var/www/mailtrendz/
systemctl reload nginx
```

### URLs de Produção
- **Frontend**: https://mailtrendz.com
- **API Backend**: https://api.mailtrendz.com
- **Health Check**: https://mailtrendz.com/health
- **API Health**: https://api.mailtrendz.com/health

### Troubleshooting

#### Backend não inicia
```bash
# Verificar logs
pm2 logs backend-mailtrendz
pm2 describe backend-mailtrendz

# Verificar porta
netstat -tlnp | grep :8000
lsof -i :8000

# Reiniciar forçado
pm2 delete backend-mailtrendz
pm2 start ecosystem.config.js
```

#### Frontend não carrega
```bash
# Verificar Nginx
nginx -t
systemctl status nginx
systemctl restart nginx

# Verificar arquivos
ls -la /var/www/mailtrendz/
cat /var/www/mailtrendz/index.html
```

#### Webhooks não funcionam
```bash
# Testar conectividade
curl -X POST https://api.mailtrendz.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs de webhook
pm2 logs backend-mailtrendz | grep webhook
```

### 🔒 Segurança
- Sempre usar HTTPS em produção
- Manter secrets seguros nos arquivos .env
- Backup regular de dados críticos
- Monitoramento de logs para atividades suspeitas
- Atualizações regulares de dependências

### ⚡ Performance
- Cache invalidation automático implementado
- Otimização de build do frontend
- Compressão Gzip no Nginx
- PM2 cluster mode para melhor performance