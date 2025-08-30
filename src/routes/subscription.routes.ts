import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { subscriptionLimiter, endpointSpamProtection } from '../middleware/rate-limit.middleware'
import SubscriptionController from '../controllers/subscription.controller'

const router = Router()

// ✅ ROTAS PÚBLICAS COM RATE LIMITING
router.get('/plans', SubscriptionController.getPlans)

// ✅ WEBHOOK DO STRIPE - SEM RATE LIMITING
router.post('/webhook', SubscriptionController.handleStripeWebhook)

// ✅ ENDPOINT DE EMERGÊNCIA - SÓ DEV (sem autenticação)
router.post('/emergency-user-fix', SubscriptionController.emergencyUserFix)

// ✅ DEBUG ENDPOINTS - SÓ DESENVOLVIMENTO (removido por enquanto)
// router.get('/debug/cache-stats', SubscriptionController.getCacheStats)

// ✅ MIDDLEWARE DE AUTENTICAÇÃO
router.use(authenticateToken)

// ✅ ROTAS DE ASSINATURA SEM RATE LIMITING PARA DESENVOLVIMENTO
router.get('/current', 
  // subscriptionLimiter, // Removido para dev
  // endpointSpamProtection(10, 60000), // Removido para dev
  SubscriptionController.getCurrentSubscription
)

router.get('/credits', 
  // subscriptionLimiter, // Removido para dev
  // endpointSpamProtection(10, 60000), // Removido para dev
  SubscriptionController.getCurrentCredits
)

// ✅ NOVA ROTA - Obter uso mensal detalhado
router.get('/monthly-usage',
  // subscriptionLimiter, // Removido para dev
  // endpointSpamProtection(10, 60000), // Removido para dev
  SubscriptionController.getMonthlyUsage
)

// ✅ NOVA ROTA - Obter histórico de uso
router.get('/usage-history',
  // subscriptionLimiter, // Removido para dev
  // endpointSpamProtection(5, 60000), // Removido para dev
  SubscriptionController.getUsageHistory
)

// ✅ NOVA ROTA - Verificar limite antes de consumir
router.get('/check-limit',
  // subscriptionLimiter, // Removido para dev
  // endpointSpamProtection(15, 60000), // Removido para dev
  SubscriptionController.checkLimit
)

router.post('/consume-credits', 
  subscriptionLimiter,
  SubscriptionController.consumeCredits
)

router.post('/sync', 
  subscriptionLimiter,
  SubscriptionController.syncUserSubscription
)

// ✅ NOVA ROTA: Forçar inicialização de usuário (para debug/correção)
router.post('/force-init',
  subscriptionLimiter,
  endpointSpamProtection(3, 300000), // 3 tentativas a cada 5 minutos
  SubscriptionController.forceUserInitialization
)

// ✅ NOVA ROTA: Simular pagamento em DEV
router.post('/simulate-payment',
  subscriptionLimiter,
  endpointSpamProtection(5, 60000), // 5 tentativas por minuto
  SubscriptionController.simulatePayment
)

// ✅ ROTAS DE CHECKOUT E PAGAMENTO (menos restritivas)
router.post('/checkout', SubscriptionController.createCheckoutSession)
router.post('/portal', SubscriptionController.createPortalSession)
router.get('/verify-payment', SubscriptionController.verifyPayment)

// ✅ ROTAS DE GERENCIAMENTO DE ASSINATURA
router.post('/update', SubscriptionController.updateSubscription)
router.post('/cancel', SubscriptionController.cancelSubscription)
router.post('/check-upgrade', SubscriptionController.checkUpgradeRequired)

export default router
