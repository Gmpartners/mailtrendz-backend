import { Router } from 'express'
import { body } from 'express-validator'
import AIController from '../controllers/ai.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

const generateEmailValidation = [
  body('prompt').trim().isLength({ min: 5, max: 2000 }).withMessage('Prompt é obrigatório e deve ter entre 5 e 2000 caracteres'),
  body('industry').optional().isString().withMessage('Indústria deve ser uma string'),
  body('tone').optional().isString().withMessage('Tom deve ser uma string'),
  body('urgency').optional().isString().withMessage('Urgência deve ser uma string'),
  body('context').optional().isObject().withMessage('Context deve ser um objeto'),
  body('style_preferences').optional().isObject().withMessage('Style preferences deve ser um objeto')
]

const modifyEmailValidation = [
  body('project_id').trim().isLength({ min: 1 }).withMessage('Project ID é obrigatório'),
  body('instructions').trim().isLength({ min: 3 }).withMessage('Instruções são obrigatórias'),
  body('preserve_structure').optional().isBoolean().withMessage('Preserve structure deve ser boolean')
]

const optimizeCSSValidation = [
  body('html').trim().isLength({ min: 10 }).withMessage('HTML é obrigatório'),
  body('target_clients').optional().isArray().withMessage('Target clients deve ser um array'),
  body('enable_dark_mode').optional().isBoolean().withMessage('Enable dark mode deve ser boolean'),
  body('mobile_first').optional().isBoolean().withMessage('Mobile first deve ser boolean')
]

const validateEmailValidation = [
  body('html').trim().isLength({ min: 10 }).withMessage('HTML é obrigatório para validação')
]

const chatProcessValidation = [
  body('message').trim().isLength({ min: 1 }).withMessage('Mensagem é obrigatória'),
  body('chat_id').trim().isLength({ min: 1 }).withMessage('Chat ID é obrigatório'),
  body('project_id').optional().isString().withMessage('Project ID deve ser uma string')
]

router.get('/health', AIController.getHealthStatus)
router.get('/test-connection', AIController.testConnection)

router.post('/test-modify', modifyEmailValidation, AIController.modifyEmail)

router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    message: 'MailTrendz Python AI Service Integration',
    data: {
      service: 'python-ai-proxy',
      status: 'operational',
      version: '2.0.0-python-integration',
      endpoints: {
        generate: '/api/v1/ai/generate',
        modify: '/api/v1/ai/modify',
        testModify: '/api/v1/ai/test-modify',
        optimize: '/api/v1/ai/optimize-css',
        validate: '/api/v1/ai/validate',
        chat: '/api/v1/ai/chat/process',
        health: '/api/v1/ai/health',
        testConnection: '/api/v1/ai/test-connection'
      },
      python_ai_service: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000',
      features: [
        'ultra-modern-email-generation',
        'intelligent-email-modification',
        'advanced-css-optimization',
        'html-validation',
        'smart-chat-processing',
        'mongodb-integration',
        'multi-client-compatibility',
        'dark-mode-support'
      ]
    },
    timestamp: new Date()
  })
})

router.post('/generate', authenticateToken, generateEmailValidation, AIController.generateEmail)
router.post('/modify', authenticateToken, modifyEmailValidation, AIController.modifyEmail)
router.post('/optimize-css', authenticateToken, optimizeCSSValidation, AIController.optimizeCSS)
router.post('/validate', authenticateToken, validateEmailValidation, AIController.validateEmail)
router.post('/chat/process', authenticateToken, chatProcessValidation, AIController.processChat)

router.post('/improve', authenticateToken, modifyEmailValidation, (req, res) => {
  req.url = '/modify'
  AIController.modifyEmail(req, res)
})

router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'MailTrendz Python AI Service Integration Status',
    data: {
      integration: 'active',
      service: 'python-ai-service',
      proxy: 'nodejs-backend',
      version: '2.0.0-python-integration',
      features: {
        emailGeneration: 'python-ai-service',
        emailModification: 'python-ai-service',
        cssOptimization: 'python-ai-service',
        htmlValidation: 'python-ai-service',
        chatProcessing: 'python-ai-service'
      },
      endpoints: {
        python_service: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000',
        nodejs_proxy: '/api/v1/ai'
      }
    },
    timestamp: new Date()
  })
})

export default router