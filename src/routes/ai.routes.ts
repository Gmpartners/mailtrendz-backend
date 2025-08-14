import { Router } from 'express'
import { body } from 'express-validator'
import AIController from '../controllers/ai.controller'
import DirectEmailController from '../controllers/direct-email.controller'
import { 
  authenticateToken, 
  logAPIUsage 
} from '../middleware/auth.middleware'
import { 
  checkAICredits, 
  consumeAICredit 
} from '../middleware/credits.middleware'

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
  body('instructions').trim().isLength({ min: 3 }).withMessage('Instruções são obrigatórias'),
  body('html').optional().isString().withMessage('HTML deve ser uma string'),
  body('project_id').optional().isString().withMessage('Project ID deve ser uma string')
]

const validateEmailValidation = [
  body('html').trim().isLength({ min: 10 }).withMessage('HTML é obrigatório para validação')
]

const chatProcessValidation = [
  body('message').trim().isLength({ min: 1 }).withMessage('Mensagem é obrigatória'),
  body('chat_id').trim().isLength({ min: 1 }).withMessage('Chat ID é obrigatório'),
  body('project_id').optional().isString().withMessage('Project ID deve ser uma string')
]

const directEmailValidation = [
  body('prompt').trim().isLength({ min: 5, max: 2000 }).withMessage('Prompt é obrigatório e deve ter entre 5 e 2000 caracteres'),
  body('projectId').optional().isString().withMessage('Project ID deve ser uma string'),
  body('industry').optional().isString().withMessage('Indústria deve ser uma string'),
  body('tone').optional().isString().withMessage('Tom deve ser uma string')
]

// Endpoints sem autenticação para teste
router.get('/health', AIController.getHealthStatus)
router.get('/test-connection', AIController.testConnection)

// Endpoints de teste sem autenticação (para desenvolvimento)
router.post('/test-generate', generateEmailValidation, AIController.generateEmail)
router.post('/test-modify', modifyEmailValidation, AIController.modifyEmail)
router.post('/test-validate', validateEmailValidation, AIController.validateEmail)

router.get('/metrics', (_req, res) => {
  res.json({
    success: true,
    message: 'MailTrendz IA Service v4.0.0 - FIXED: Single Credit Consumption',
    data: {
      service: 'integrated-ia-service-credits',
      status: 'operational',
      version: '4.0.0-ia-integrated-credits-fixed',
      endpoints: {
        generate: '/api/v1/ai/generate',
        testGenerate: '/api/v1/ai/test-generate',
        modify: '/api/v1/ai/modify',
        testModify: '/api/v1/ai/test-modify',
        validate: '/api/v1/ai/validate',
        testValidate: '/api/v1/ai/test-validate',
        chat: '/api/v1/ai/chat',
        chatProcess: '/api/v1/ai/chat/process',
        health: '/api/v1/ai/health',
        testConnection: '/api/v1/ai/test-connection',
        directGenerate: '/api/v1/ai/generate-direct',
        generateToProject: '/api/v1/ai/generate-to-project/:projectId'
      },
      ia_service: 'openrouter-integrated',
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4',
      features: [
        'direct-ia-integration',
        'html-generation-with-inline-css',
        'intelligent-email-modification',
        'html-validation',
        'smart-chat-processing',
        'concurrent-user-support',
        'fallback-system',
        'credits-system',
        'usage-tracking',
        'direct-email-generation',
        'project-integration',
        'single-credit-consumption-fixed'
      ]
    },
    timestamp: new Date()
  })
})

// ✅ ENDPOINTS COM CONSUMO CORRETO DE CRÉDITOS
router.post(
  '/generate', 
  authenticateToken, 
  checkAICredits,
  consumeAICredit('ai_generation'),
  logAPIUsage('ai_generate', 1),
  generateEmailValidation, 
  AIController.generateEmail
)

router.post(
  '/modify', 
  authenticateToken, 
  checkAICredits,
  consumeAICredit('ai_modification'),
  logAPIUsage('ai_modify', 1),
  modifyEmailValidation, 
  AIController.modifyEmail
)

router.post(
  '/validate', 
  authenticateToken, 
  validateEmailValidation, 
  AIController.validateEmail
)

// ✅ NOVA ROTA CORRETA - /ai/chat (sem /process) COM CONSUMO DE CRÉDITOS
router.post(
  '/chat', 
  authenticateToken, 
  checkAICredits,
  consumeAICredit('ai_chat'),
  logAPIUsage('ai_chat', 1),
  chatProcessValidation, 
  AIController.processChat
)

router.post(
  '/chat/process', 
  authenticateToken, 
  checkAICredits,
  consumeAICredit('ai_chat'),
  logAPIUsage('ai_chat', 1),
  chatProcessValidation, 
  AIController.processChat
)

router.post(
  '/improve', 
  authenticateToken, 
  checkAICredits,
  consumeAICredit('ai_improvement'),
  logAPIUsage('ai_improve', 1),
  modifyEmailValidation, 
  (req: any, res: any) => {
    req.url = '/modify'
    AIController.modifyEmail(req, res)
  }
)

// ✅ ENDPOINTS DE GERAÇÃO DIRETA COM CONSUMO CORRETO
router.post(
  '/generate-direct',
  authenticateToken,
  checkAICredits,
  consumeAICredit('ai_direct_generation'),
  logAPIUsage('ai_generate_direct', 1),
  directEmailValidation,
  DirectEmailController.generateEmailDirect
)

router.post(
  '/generate-to-project/:projectId',
  authenticateToken,
  checkAICredits,
  consumeAICredit('ai_project_generation'),
  logAPIUsage('ai_generate_to_project', 1),
  directEmailValidation,
  DirectEmailController.generateEmailAndSaveToProject
)

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    message: 'MailTrendz IA Service v4.0.0 Status - FIXED: Single Credit Consumption',
    data: {
      integration: 'active',
      service: 'integrated-ia-service-credits',
      proxy: 'nodejs-backend',
      version: '4.0.0-ia-integrated-credits-fixed',
      features: {
        emailGeneration: 'openrouter-claude-sonnet-4',
        emailModification: 'openrouter-claude-sonnet-4',
        htmlValidation: 'nodejs-native',
        chatProcessing: 'openrouter-claude-sonnet-4',
        cssInlining: 'cheerio-native',
        concurrency: 'nodejs-native',
        creditsSystem: 'integrated-fixed',
        usageTracking: 'active',
        directGeneration: 'active',
        projectIntegration: 'active',
        singleCreditConsumption: 'fixed'
      },
      endpoints: {
        openrouter_service: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        nodejs_backend: '/api/v1/ai',
        direct_generation: '/api/v1/ai/generate-direct',
        project_generation: '/api/v1/ai/generate-to-project/:projectId'
      }
    },
    timestamp: new Date()
  })
})

export default router