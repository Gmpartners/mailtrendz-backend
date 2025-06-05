import { Router } from 'express'
import AIController from '../controllers/ai.controller'
import { authenticateToken, checkAPILimits, adminOnly } from '../middleware/auth.middleware'
import { aiLimiter } from '../middleware/rate-limit.middleware'

const router = Router()

// Rotas públicas
router.get('/health', AIController.healthCheck)
router.get('/models', AIController.getAvailableModels)
router.get('/config', AIController.getAIConfig)

// Rotas protegidas
router.use(authenticateToken)

// Endpoints de teste/debug (desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.post(
    '/test/email-generation',
    aiLimiter,
    checkAPILimits,
    AIController.testEmailGeneration
  )

  router.post(
    '/test/email-improvement',
    aiLimiter,
    checkAPILimits,
    AIController.testEmailImprovement
  )

  router.post(
    '/test/chat',
    aiLimiter,
    checkAPILimits,
    AIController.testAIChat
  )
}

// Rotas administrativas
router.get('/stats', adminOnly, AIController.getAIUsageStats)
router.get('/validate-config', adminOnly, AIController.validateAIConfig)

export default router