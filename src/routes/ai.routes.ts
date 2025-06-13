import { Router } from 'express'
import { body } from 'express-validator'
import AIController from '../controllers/ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// Middleware de autenticação
router.use(authenticateToken)

// Validações
const generateEmailValidation = [
  body('prompt').trim().isLength({ min: 5, max: 2000 }).withMessage('Prompt deve ter entre 5 e 2000 caracteres'),
  body('industry').optional().isIn(['saude', 'tecnologia', 'educacao', 'ecommerce', 'financas', 'geral']).withMessage('Indústria inválida'),
  body('tone').optional().isIn(['professional', 'friendly', 'urgent', 'luxury', 'casual']).withMessage('Tom inválido'),
  body('urgency').optional().isIn(['low', 'medium', 'high']).withMessage('Urgência inválida')
]

// Rotas principais
router.post('/generate', generateEmailValidation, AIController.generateEmail)

// Rotas de status e monitoramento
router.get('/health', AIController.getHealthStatus)
router.get('/test-connection', AIController.testConnection)

// Rotas stub para compatibilidade (retornam indicação para usar Python AI Service)
router.post('/improve', (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /modify instead',
    redirectTo: '/python-ai/modify'
  })
})

router.post('/validate', (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /validate instead',
    redirectTo: '/python-ai/validate'
  })
})

router.post('/optimize-css', (req, res) => {
  res.json({
    success: false,
    message: 'Use Python AI Service endpoint /optimize-css instead',
    redirectTo: '/python-ai/optimize-css'
  })
})

router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    message: 'AI metrics service',
    data: {
      service: 'node-ai-service',
      status: 'operational',
      pythonAIService: process.env.PYTHON_AI_SERVICE_URL || 'not-configured',
      endpoints: {
        generate: '/api/v1/ai/generate',
        health: '/api/v1/ai/health',
        testConnection: '/api/v1/ai/test-connection'
      }
    }
  })
})

export default router