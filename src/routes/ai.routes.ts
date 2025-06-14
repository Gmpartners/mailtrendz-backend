import { Router } from 'express'
import { body } from 'express-validator'
import AIController from '../controllers/ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// Validações mais flexíveis
const generateEmailValidation = [
  body('prompt').trim().isLength({ min: 1, max: 5000 }).withMessage('Prompt é obrigatório e deve ter até 5000 caracteres'),
  body('industry').optional().isString().withMessage('Indústria deve ser uma string'),
  body('tone').optional().isString().withMessage('Tom deve ser uma string'),
  body('urgency').optional().isString().withMessage('Urgência deve ser uma string'),
  body('context').optional().isObject().withMessage('Context deve ser um objeto'),
  body('style_preferences').optional().isObject().withMessage('Style preferences deve ser um objeto')
]

// ===== ROTAS PÚBLICAS (sem autenticação) =====
router.get('/health', AIController.getHealthStatus)
router.get('/test-connection', AIController.testConnection)

router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    message: 'AI metrics service',
    data: {
      service: 'node-ai-service',
      status: 'operational',
      endpoints: {
        generate: '/api/v1/ai/generate',
        health: '/api/v1/ai/health',
        testConnection: '/api/v1/ai/test-connection'
      }
    }
  })
})

// ===== ROTAS PROTEGIDAS (com autenticação) =====
router.post('/generate', authenticateToken, generateEmailValidation, AIController.generateEmail)

// Rotas stub para compatibilidade
router.post('/improve', authenticateToken, (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /modify instead',
    redirectTo: '/python-ai/modify'
  })
})

router.post('/validate', authenticateToken, (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /validate instead',
    redirectTo: '/python-ai/validate'
  })
})

router.post('/optimize-css', authenticateToken, (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /optimize-css instead',
    redirectTo: '/python-ai/optimize-css'
  })
})

export default router