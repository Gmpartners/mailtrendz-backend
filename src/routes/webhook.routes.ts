import { Router } from 'express'
import webhookController from '../controllers/webhook.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { 
  validateWebhookRequest, 
  webhookTimeout, 
  webhookRateLimit, 
  webhookLogger,
  webhookErrorHandler
} from '../middleware/webhook.middleware'

const router = Router()

// ===================================================================
// MIDDLEWARE GLOBAL PARA WEBHOOKS
// ===================================================================

// Aplicar logging em todas as rotas de webhook
router.use(webhookLogger)

// Aplicar timeout para evitar requests pendentes
router.use(webhookTimeout(30000)) // 30 segundos

// ===================================================================
// ROTA PRINCIPAL DO WEBHOOK STRIPE
// ===================================================================

/**
 * Endpoint principal para receber webhooks do Stripe
 * 
 * IMPORTANTE:
 * - Esta rota deve ser configurada no Dashboard do Stripe
 * - URL: https://sua-api.com/api/v1/webhooks/stripe
 * - Eventos: invoice.payment_succeeded, invoice.payment_failed, 
 *           customer.subscription.*, checkout.session.completed
 * - Esta rota NÃO deve ter autenticação JWT
 * - Esta rota NÃO deve ter rate limiting normal (tem próprio rate limiting)
 */
router.post('/stripe',
  webhookRateLimit(200, 60000), // 200 requests por minuto
  validateWebhookRequest,
  webhookController.handleStripeWebhook
)

// ===================================================================
// HEALTH CHECK DE WEBHOOKS
// ===================================================================

/**
 * Health check específico para webhooks
 * Verifica configuração e status dos webhooks
 */
router.get('/health', webhookController.webhookHealthCheck)

// ===================================================================
// ROTAS AUTENTICADAS PARA CONSULTA
// ===================================================================

// Middleware de autenticação para rotas protegidas
router.use(authenticateToken)

/**
 * Consultar status de cobrança do usuário atual
 * Inclui informações sobre pagamentos em atraso, falhas, etc.
 */
router.get('/billing-status', webhookController.getUserBillingStatus)

/**
 * Consultar histórico de pagamentos do usuário atual
 * Query params:
 * - limit: número máximo de registros (default: 10, max: 50)
 */
router.get('/payment-history', webhookController.getUserPaymentHistory)

// ===================================================================
// ROTAS ADMINISTRATIVAS
// ===================================================================

/**
 * Consultar eventos de webhook recentes (Admin only)
 * 
 * TODO: Implementar middleware de verificação de role de admin
 * Por enquanto, qualquer usuário autenticado pode acessar
 */
router.get('/recent-events', webhookController.getRecentWebhookEvents)

// ===================================================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ===================================================================

router.use(webhookErrorHandler)

export default router

/**
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 
 * 1. No Dashboard do Stripe (https://dashboard.stripe.com/webhooks):
 *    - Adicionar endpoint: https://sua-api.com/api/v1/webhooks/stripe
 *    - Selecionar eventos:
 *      ✓ checkout.session.completed
 *      ✓ customer.subscription.created
 *      ✓ customer.subscription.updated
 *      ✓ customer.subscription.deleted
 *      ✓ invoice.payment_succeeded
 *      ✓ invoice.payment_failed
 *      ✓ invoice.upcoming
 *      ✓ customer.subscription.trial_will_end
 * 
 * 2. Copiar o webhook secret e definir em STRIPE_WEBHOOK_SECRET
 * 
 * 3. Para desenvolvimento local:
 *    - Instalar Stripe CLI: https://stripe.com/docs/stripe-cli
 *    - Executar: stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
 *    - Copiar o webhook secret exibido para .env local
 * 
 * 4. Testar webhook:
 *    - stripe trigger invoice.payment_succeeded
 *    - stripe trigger invoice.payment_failed
 *    - stripe trigger customer.subscription.created
 * 
 * 5. Monitorar logs:
 *    - Verificar logs da aplicação
 *    - Verificar Dashboard do Stripe > Webhooks > Tentativas
 *    - Usar endpoint /api/v1/webhooks/health para status
 */