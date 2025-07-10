import { Router } from 'express'
import { body } from 'express-validator'
import CreditsController from '../controllers/credits.controller'
import { authenticateToken, adminOnly } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticateToken)

const initializePlanValidation = [
  body('planType').isIn(['free', 'starter', 'enterprise', 'unlimited']).withMessage('Tipo de plano inválido')
]

router.get('/info', CreditsController.getUserCreditsInfo)

router.post('/reset', CreditsController.resetUserCredits)

router.post('/initialize', initializePlanValidation, CreditsController.initializeUserPlan)

router.get('/stats', adminOnly, CreditsController.getSubscriptionStats)

export default router