import { Router } from 'express'
import AIController from '../controllers/ai.controller'
import EnhancedAIController from '../controllers/enhanced-ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { aiLimiter } from '../middleware/rate-limit.middleware'

const router = Router()

// Rotas originais mantidas
router.post('/generate', [authenticateToken, aiLimiter], AIController.generateEmail)
router.post('/improve', [authenticateToken, aiLimiter], AIController.improveEmail)
router.get('/health', AIController.healthCheck)

// ✅ NOVO: Rota smart-email que o frontend espera
router.post('/smart-email', [authenticateToken, aiLimiter], EnhancedAIController.generateSmartEmail)

// ✅ NOVO: Rotas complementares para compatibilidade
router.post('/smart-chat', [authenticateToken, aiLimiter], EnhancedAIController.smartChat)
router.post('/analyze-prompt', [authenticateToken, aiLimiter], EnhancedAIController.analyzePrompt)

export default router