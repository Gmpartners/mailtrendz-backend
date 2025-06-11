import { Router } from 'express'
import EnhancedAIController from '../controllers/enhanced-ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { aiLimiter } from '../middleware/rate-limit.middleware'

const router = Router()

router.post('/generate', [authenticateToken, aiLimiter], EnhancedAIController.generateSmartEmail)
router.post('/chat', [authenticateToken, aiLimiter], EnhancedAIController.smartChat)
router.post('/analyze', [authenticateToken, aiLimiter], EnhancedAIController.analyzePrompt)
router.get('/status', [authenticateToken], EnhancedAIController.getEnhancedStatus)
router.post('/compare', [authenticateToken, aiLimiter], EnhancedAIController.compareAIModes)
router.get('/health', EnhancedAIController.healthCheck)

export default router
