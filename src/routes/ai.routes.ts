import { Router } from 'express'
import AIController from '../controllers/ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { aiLimiter } from '../middleware/rate-limit.middleware'

const router = Router()

router.post('/generate', [authenticateToken, aiLimiter], AIController.generateEmail)
router.post('/improve', [authenticateToken, aiLimiter], AIController.improveEmail)
router.get('/health', AIController.healthCheck)

export default router
