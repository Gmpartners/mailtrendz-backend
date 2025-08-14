# Guia Completo: Sistema de Webhooks Stripe Robusto - MailTrendz

## 🎯 Visão Geral

Este documento fornece um guia completo para implementar e usar o sistema robusto de webhooks Stripe no MailTrendz. O sistema foi projetado para ser **production-ready** com todas as funcionalidades necessárias para um ambiente comercial.

## 🚀 Funcionalidades Implementadas

### ✅ Recursos Principais

- **Validação de Assinatura**: Verificação criptográfica de todos os webhooks
- **Idempotência**: Prevenção de processamento duplicado de eventos
- **Sistema de Retry**: Retry automático com backoff exponencial
- **Tracking Completo**: Auditoria detalhada de todos os eventos
- **Renovação Inteligente**: Créditos renovados APENAS após confirmação de pagamento
- **Health Monitoring**: Monitoramento em tempo real do sistema
- **Rate Limiting**: Proteção contra abuso de endpoints
- **Logs Detalhados**: Sistema completo de logging para debugging

### 🔧 Componentes Implementados

1. **Database Schema** (`004_webhook_tracking_system.sql`)
2. **Webhook Service** (`webhook.service.ts`)
3. **Webhook Controller** (`webhook.controller.ts`)
4. **Webhook Middleware** (`webhook.middleware.ts`)
5. **Routes** (`webhook.routes.ts`)
6. **Scripts de Teste** (múltiplos)
7. **Documentação Completa**

---

## 🛠️ Instalação e Configuração

### 1. Executar Migration do Banco de Dados

```sql
-- Execute a migration 004 no Supabase
-- Arquivo: src/database/migrations/004_webhook_tracking_system.sql
```

### 2. Configurar Variáveis de Ambiente

```bash
# .env
STRIPE_WEBHOOK_SECRET=whsec_...  # Obtido do Dashboard Stripe ou Stripe CLI
STRIPE_SECRET_KEY=sk_...         # Chave secreta do Stripe
```

### 3. Instalar Stripe CLI (Para Desenvolvimento)

```bash
# Windows (Chocolatey)
choco install stripe-cli

# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Linux (Snap)
sudo snap install stripe
```

### 4. Configuração Automática

```bash
# Execute o script de setup
node scripts/setup-stripe-dev.js
```

---

## 🔄 Desenvolvimento Local

### 1. Iniciar Backend

```bash
npm run dev
```

### 2. Configurar Webhook Local

```bash
# Login no Stripe CLI
stripe login

# Iniciar listener (manual)
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe

# OU usar o script automatizado
node scripts/test-stripe-webhooks.js
```

### 3. Testar Webhooks

```bash
# Teste completo
node scripts/test-stripe-webhooks.js

# Cenários específicos
node scripts/test-payment-scenarios.js

# Teste de pagamento bem-sucedido
stripe trigger invoice.payment_succeeded

# Teste de falha de pagamento
stripe trigger invoice.payment_failed
```

---

## 🌐 Configuração para Produção

### 1. Criar Webhook no Dashboard Stripe

1. Acesse [Dashboard Stripe > Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. URL: `https://sua-api.com/api/v1/webhooks/stripe`
4. Selecionar eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.upcoming`
   - ✅ `customer.subscription.trial_will_end`

### 2. Configurar Webhook Secret

1. Copie o **webhook secret** do dashboard
2. Configure `STRIPE_WEBHOOK_SECRET` no seu ambiente de produção

### 3. Testar em Produção

```bash
# Teste de conectividade
curl https://sua-api.com/api/v1/webhooks/health

# Ver eventos recentes (requer autenticação)
curl -H "Authorization: Bearer TOKEN" https://sua-api.com/api/v1/webhooks/recent-events
```

---

## 📊 Endpoints Disponíveis

### Webhook Principal
- **POST** `/api/v1/webhooks/stripe` - Receber webhooks do Stripe
- **GET** `/api/v1/webhooks/health` - Health check do sistema

### Endpoints Autenticados
- **GET** `/api/v1/webhooks/billing-status` - Status de cobrança do usuário
- **GET** `/api/v1/webhooks/payment-history` - Histórico de pagamentos
- **GET** `/api/v1/webhooks/recent-events` - Eventos recentes (Admin)

---

## 🔍 Monitoramento e Debugging

### 1. Health Check

```bash
curl http://localhost:8000/api/v1/webhooks/health
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "webhookSecretConfigured": true,
    "stripeKeyConfigured": true,
    "recentEventsCount": 15,
    "failedEventsCount": 0,
    "retryingEventsCount": 0,
    "status": "healthy"
  }
}
```

### 2. Verificar Eventos Recentes

```bash
# Eventos processados (requer token de usuário)
curl -H "Authorization: Bearer USER_TOKEN" \
     http://localhost:8000/api/v1/webhooks/recent-events
```

### 3. Logs do Sistema

```bash
# Ver logs da aplicação
tail -f logs/app.log | grep webhook

# Ver logs específicos do Stripe
stripe logs tail --filter-event-type invoice.payment_succeeded
```

### 4. Dashboard do Stripe

1. Acesse [Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique no seu endpoint
3. Veja tentativas, sucessos e falhas
4. Reenvie eventos se necessário

---

## 🔒 Segurança Implementada

### 1. Validação de Assinatura

```typescript
// Toda requisição de webhook é validada
const event = await webhookService.validateSignature(payload, signature)
```

### 2. Idempotência

```typescript
// Eventos duplicados são ignorados automaticamente
const existingEvent = await this.getWebhookEvent(event.id)
if (existingEvent?.status === 'completed') {
  return // Já processado
}
```

### 3. Rate Limiting

```typescript
// Proteção contra spam (200 requests/minuto)
webhookRateLimit(200, 60000)
```

### 4. Timeout Protection

```typescript
// Timeout de 30 segundos para evitar requests pendentes
webhookTimeout(30000)
```

---

## 💳 Lógica de Renovação de Créditos

### ⚠️ CRÍTICO: Créditos São Renovados APENAS Após Confirmação de Pagamento

```typescript
// ✅ CORRETO: Renovação apenas com pagamento confirmado
if (invoice.status !== 'paid') {
  logger.warn('Invoice status is not paid, skipping credit renewal')
  return
}

// Só então renovar créditos
await supabaseAdmin.rpc('initialize_user_credits', {
  p_user_id: userId,
  p_plan_type: planType
})
```

### Estados de Cobrança

- **`active`**: Pagamento em dia, créditos disponíveis
- **`past_due`**: Pagamento atrasado, créditos NÃO renovados
- **`unpaid`**: Múltiplas falhas, requires atenção
- **`canceled`**: Assinatura cancelada, volta ao plano free

---

## 🧪 Cenários de Teste

### 1. Pagamento Bem-Sucedido

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

**Resultado Esperado:**
- ✅ Assinatura ativada
- ✅ Créditos renovados
- ✅ Status de cobrança = `active`

### 2. Falha de Pagamento

```bash
stripe trigger invoice.payment_failed
```

**Resultado Esperado:**
- ❌ Créditos NÃO renovados
- ⚠️ Status de cobrança = `past_due`
- 📧 Notificação enviada

### 3. Upgrade de Plano

```bash
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

**Resultado Esperado:**
- ✅ Plano atualizado
- ✅ Créditos renovados conforme novo plano
- ✅ Pagamento proporcional processado

---

## 📈 Métricas e Analytics

### 1. Eventos por Status

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM webhook_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### 2. Taxa de Sucesso

```sql
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*),
    2
  ) as success_rate
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '7 days';
```

### 3. Pagamentos por Status

```sql
SELECT 
  status,
  COUNT(*) as transactions,
  SUM(amount_cents) as total_amount
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## 🚨 Troubleshooting

### Problema: Webhook Secret Inválido

**Sintomas:**
```
❌ Webhook signature validation failed
```

**Solução:**
1. Verificar `STRIPE_WEBHOOK_SECRET` no .env
2. Regenerar secret no Dashboard Stripe
3. Atualizar variável de ambiente
4. Reiniciar aplicação

### Problema: Créditos Não Renovados

**Sintomas:**
- Pagamento processado mas créditos não atualizados

**Debug:**
```sql
-- Verificar logs de renovação
SELECT * FROM credit_renewal_logs 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;

-- Verificar eventos de webhook
SELECT * FROM webhook_events 
WHERE event_type = 'invoice.payment_succeeded'
ORDER BY created_at DESC;
```

**Solução:**
1. Verificar status do invoice no Stripe
2. Confirmar que `invoice.status = 'paid'`
3. Verificar logs de erro no webhook
4. Reprocessar evento se necessário

### Problema: Eventos Duplicados

**Sintomas:**
- Múltiplos processamentos do mesmo evento

**Verificação:**
```sql
SELECT stripe_event_id, COUNT(*) 
FROM webhook_events 
GROUP BY stripe_event_id 
HAVING COUNT(*) > 1;
```

**Solução:**
- Sistema de idempotência deve prevenir isso automaticamente
- Verificar se função `getWebhookEvent` está funcionando

---

## 📋 Checklist de Implementação

### Desenvolvimento
- [ ] Migration executada no banco
- [ ] Stripe CLI instalado e configurado
- [ ] Backend rodando localmente
- [ ] Webhook secret configurado no .env
- [ ] Testes de webhook passando
- [ ] Health check retornando "healthy"

### Produção
- [ ] Webhook endpoint criado no Dashboard Stripe
- [ ] Webhook secret configurado no ambiente de produção
- [ ] Eventos corretos selecionados no Dashboard
- [ ] SSL/HTTPS configurado corretamente
- [ ] Monitoramento de logs ativo
- [ ] Alertas configurados para falhas

### Validação
- [ ] Pagamento bem-sucedido renova créditos
- [ ] Falha de pagamento NÃO renova créditos
- [ ] Status de cobrança atualizado corretamente
- [ ] Notificações sendo enviadas
- [ ] Sistema de retry funcionando
- [ ] Idempotência prevenindo duplicação

---

## 🤝 Suporte e Manutenção

### Scripts Úteis

```bash
# Setup completo para desenvolvimento
node scripts/setup-stripe-dev.js

# Teste completo de webhooks
node scripts/test-stripe-webhooks.js

# Teste de cenários específicos
node scripts/test-payment-scenarios.js
```

### Comandos Stripe CLI

```bash
# Ver eventos em tempo real
stripe logs tail

# Reenviar evento específico
stripe events resend evt_1234567890

# Testar webhook endpoint
stripe trigger invoice.payment_succeeded
```

### Monitoramento Contínuo

1. **Dashboard Stripe**: Monitorar tentativas de webhook
2. **Health Check**: Verificar `/api/v1/webhooks/health` regularmente
3. **Logs de Aplicação**: Monitorar erros de webhook service
4. **Métricas de Banco**: Acompanhar taxa de sucesso de eventos

---

## 📚 Recursos Adicionais

- [Documentação Oficial Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)

---

## ✅ Sistema Pronto para Produção

Este sistema de webhooks foi desenvolvido seguindo as melhores práticas da indústria e está **production-ready** com:

- ✅ **Segurança**: Validação criptográfica de assinaturas
- ✅ **Confiabilidade**: Sistema de retry e idempotência
- ✅ **Observabilidade**: Logs detalhados e health checks  
- ✅ **Performance**: Rate limiting e timeouts apropriados
- ✅ **Manutenibilidade**: Código limpo e bem documentado
- ✅ **Testabilidade**: Scripts completos de teste

O sistema está pronto para processar milhares de webhooks por dia de forma segura e confiável! 🚀