import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { adminOnly } from '../middleware/admin.middleware'
import CreditsController from '../controllers/credits.controller'

const router = Router()

// Rotas protegidas por autenticação
router.use(authenticateToken)

// Rotas de créditos do usuário
router.get('/info', CreditsController.getUserCreditsInfo)
router.post('/consume', CreditsController.consumeUserCredits)
router.post('/reset', CreditsController.resetUserCredits)
router.get('/stats', CreditsController.getUserUsageStats)


// Rotas administrativas (apenas admin)
router.get('/subscription-stats', adminOnly, CreditsController.getSubscriptionStats)

export default router
