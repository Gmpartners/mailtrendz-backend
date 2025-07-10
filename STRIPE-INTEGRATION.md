# 💳 Integração Stripe - MailTrendz Backend

## 📋 Visão Geral

O sistema agora suporta assinaturas via Stripe com os seguintes planos:

### Planos Disponíveis

| Plano | Preço Mensal | Preço Anual | Créditos IA | Recursos |
|-------|--------------|-------------|-------------|----------|
| **Free** | $0 | $0 | 3 (fixo) | Básico, sem preview/export |
| **Starter** | $14 | $120 | 20/mês | + Export HTML |
| **Enterprise** | $22 | $216 | 50/mês | + Pastas + Multi-usuário |
| **Unlimited** | $36 | $360 | Ilimitado | Todos os recursos |

## 🚀 Setup Inicial

### 1. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_51P5C90LIDpwN7e9Fb7N7iyiTeFMi5D6fb5qpifWo3MMrLSMZjp93RTeDBAon8kB7KEefTSDNDwiDQ6x0nFSGyPG800mFwL3dPc
STRIPE_WEBHOOK_SECRET=whsec_... # Será gerado no passo 3

# Frontend URLs
FRONTEND_URL=http://localhost:3000
STRIPE_SUCCESS_URL=${FRONTEND_URL}/dashboard?success=true
STRIPE_CANCEL_URL=${FRONTEND_URL}/pricing?canceled=true
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Webhook do Stripe

#### Em Desenvolvimento (usando Stripe CLI):

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login no Stripe
stripe login

# Escutar webhooks localmente
stripe listen --forward-to localhost:8000/api/v1/subscriptions/webhook

# Copiar o webhook secret gerado e adicionar ao .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Em Produção:

1. Acesse [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. URL do endpoint: `https://seu-backend.com/api/v1/subscriptions/webhook`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copiar o webhook secret e adicionar ao `.env`

### 4. Inicializar Créditos para Usuários Existentes

```bash
npm run initialize-credits
```

## 📡 Endpoints da API

### Planos e Assinaturas

- `GET /api/v1/subscriptions/plans` - Listar todos os planos
- `GET /api/v1/subscriptions/current` - Obter assinatura atual
- `POST /api/v1/subscriptions/checkout` - Criar sessão de checkout
- `POST /api/v1/subscriptions/portal` - Acessar portal do cliente
- `PUT /api/v1/subscriptions/update` - Atualizar plano
- `DELETE /api/v1/subscriptions/cancel` - Cancelar assinatura

### Créditos

- `GET /api/v1/users/credits` - Verificar saldo de créditos

### Pastas (Enterprise/Unlimited)

- `GET /api/v1/folders` - Listar pastas
- `POST /api/v1/folders` - Criar pasta
- `PUT /api/v1/folders/:id` - Atualizar pasta
- `DELETE /api/v1/folders/:id` - Deletar pasta
- `POST /api/v1/folders/move-project` - Mover projeto

## 🔧 Middleware de Verificação

### Verificar Créditos
```typescript
import { checkAICredits } from './middleware/credits.middleware'

router.post('/generate', authenticateToken, checkAICredits, controller.generate)
```

### Verificar Features
```typescript
import { requireFeature } from './middleware/features.middleware'

router.get('/export', requireFeature('has_html_export'), controller.export)
router.post('/folders', requireFeature('has_folders'), controller.createFolder)
```

## 📊 Jobs Agendados

### Reset Mensal de Créditos

Criar um cron job para executar todo dia 1 às 00:00:

```bash
0 0 1 * * cd /path/to/backend && npm run reset-monthly-credits
```

## 🧪 Testar Integração

### 1. Testar Conexão com Stripe

```bash
npm run test:stripe
```

### 2. Testar Checkout (Frontend)

```javascript
// Exemplo de requisição do frontend
const response = await fetch('/api/v1/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    priceId: 'price_1RgrvNLIDpwN7e9FX3bJF6kH' // Starter mensal
  })
})

const { data } = await response.json()
window.location.href = data.url // Redirecionar para Stripe
```

## 🚨 Troubleshooting

### Erro: "No credits available"
- Verificar se o usuário tem créditos: `SELECT * FROM ai_credits WHERE user_id = '...'`
- Resetar créditos manualmente: `npm run initialize-credits`

### Erro: "Feature not available"
- Verificar plano do usuário: `SELECT subscription FROM profiles WHERE id = '...'`
- Verificar features do plano: `SELECT * FROM plan_features WHERE plan_type = '...'`

### Webhook não funciona
- Verificar logs: `tail -f logs/app.log`
- Testar manualmente: `stripe trigger checkout.session.completed`

## 📝 Notas Importantes

1. **Modo Test**: Todos os IDs de preço estão em modo teste
2. **Limites**: Plano Free tem limite de 10 projetos
3. **Créditos**: São resetados automaticamente no dia 1 de cada mês
4. **Cancelamento**: Assinatura continua até o fim do período pago

## 🔗 Links Úteis

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Docs](https://docs.stripe.com)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Documentação da API](https://docs.mailtrendz.com)