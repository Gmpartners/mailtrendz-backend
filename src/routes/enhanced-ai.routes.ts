import { Router } from 'express'
import EnhancedAIController from '../controllers/enhanced-ai.controller'
import { auth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { rateLimitAI } from '../middleware/rate-limit.middleware'
import { body } from 'express-validator'

// ===========================================
// ROTAS PARA IA MELHORADA - MailTrendz
// ===========================================

const router = Router()

// Schemas de validação para IA melhorada
const smartEmailGenerationSchema = [
  body('prompt')
    .isString()
    .isLength({ min: 5, max: 2000 })
    .withMessage('Prompt deve ter entre 5 e 2000 caracteres')
    .trim(),
  
  body('projectContext')
    .isObject()
    .withMessage('Contexto do projeto é obrigatório'),
  
  body('projectContext.type')
    .isIn(['welcome', 'newsletter', 'campaign', 'promotional', 'announcement', 'follow-up'])
    .withMessage('Tipo de projeto inválido'),
  
  body('projectContext.industry')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Indústria deve ter no máximo 100 caracteres'),
  
  body('projectContext.tone')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Tom deve ter no máximo 50 caracteres'),
  
  body('useEnhanced')
    .optional()
    .isBoolean()
    .withMessage('useEnhanced deve ser um boolean'),
  
  body('userHistory')
    .optional()
    .isObject()
    .withMessage('userHistory deve ser um objeto')
]

const smartChatSchema = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Mensagem deve ter entre 1 e 1000 caracteres')
    .trim(),
  
  body('chatHistory')
    .optional()
    .isArray()
    .withMessage('Histórico do chat deve ser um array'),
  
  body('projectContext')
    .isObject()
    .withMessage('Contexto do projeto é obrigatório'),
  
  body('userHistory')
    .optional()
    .isObject()
    .withMessage('userHistory deve ser um objeto')
]

const promptAnalysisSchema = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Prompt deve ter entre 1 e 2000 caracteres')
    .trim(),
  
  body('projectContext')
    .optional()
    .isObject()
    .withMessage('Contexto do projeto deve ser um objeto'),
  
  body('userHistory')
    .optional()
    .isObject()
    .withMessage('userHistory deve ser um objeto')
]

// =================
// ROTAS PRINCIPAIS
// =================

// 🚀 POST /api/v1/ai/enhanced/generate
// Geração inteligente de emails
router.post('/generate', [
  auth,
  rateLimitAI,
  validate(smartEmailGenerationSchema)
], EnhancedAIController.generateSmartEmail)

// 🚀 POST /api/v1/ai/enhanced/chat
// Chat inteligente com IA
router.post('/chat', [
  auth,
  rateLimitAI,
  validate(smartChatSchema)
], EnhancedAIController.smartChat)

// 🚀 POST /api/v1/ai/enhanced/analyze
// Análise de prompts
router.post('/analyze', [
  auth,
  rateLimitAI,
  validate(promptAnalysisSchema)
], EnhancedAIController.analyzePrompt)

// 🚀 GET /api/v1/ai/enhanced/status
// Status da IA melhorada
router.get('/status', [
  auth
], EnhancedAIController.getEnhancedStatus)

// 🚀 POST /api/v1/ai/enhanced/compare
// Comparar modos de IA
router.post('/compare', [
  auth,
  rateLimitAI,
  validate([
    body('prompt')
      .isString()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Prompt deve ter entre 5 e 1000 caracteres')
      .trim(),
    
    body('projectContext')
      .optional()
      .isObject()
      .withMessage('Contexto do projeto deve ser um objeto')
  ])
], EnhancedAIController.compareAIModes)

// =================
// ROTAS DE UTILITÁRIOS
// =================

// 🚀 GET /api/v1/ai/enhanced/health
// Health check específico para IA melhorada
router.get('/health', EnhancedAIController.healthCheck)

// =================
// ROTAS DE DEBUG (apenas em desenvolvimento)
// =================

if (process.env.NODE_ENV === 'development') {
  
  // Debug: Testar analisador de prompts diretamente
  router.post('/debug/analyzer', [
    auth,
    body('prompt').isString().trim(),
    body('context').optional().isObject()
  ], async (req, res) => {
    try {
      const { SmartPromptAnalyzer } = await import('../services/ai/analyzers/SmartPromptAnalyzer')
      const analyzer = new SmartPromptAnalyzer()
      
      const analysis = await analyzer.analyzePrompt(
        req.body.prompt,
        req.body.context || {
          userId: req.user!.id,
          projectName: 'Debug Test',
          type: 'campaign',
          industry: 'geral',
          tone: 'profissional',
          status: 'ativo'
        }
      )
      
      res.json({
        success: true,
        message: 'Análise de debug concluída',
        data: analysis
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro no debug: ' + error.message
      })
    }
  })

  // Debug: Testar serviço melhorado diretamente
  router.post('/debug/enhanced-service', [
    auth,
    body('request').isObject()
  ], async (req, res) => {
    try {
      const { default: EnhancedAIService } = await import('../services/ai/enhanced/EnhancedAIService')
      
      const request = {
        ...req.body.request,
        projectContext: {
          ...req.body.request.projectContext,
          userId: req.user!.id
        }
      }
      
      const result = await EnhancedAIService.generateSmartEmail(request)
      
      res.json({
        success: true,
        message: 'Teste do serviço melhorado concluído',
        data: result
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Erro no teste: ' + error.message
      })
    }
  })

  // Debug: Verificar imports e dependências
  router.get('/debug/dependencies', auth, async (req, res) => {
    const dependencies = {
      enhancedService: false,
      promptAnalyzer: false,
      baseAI: false
    }

    try {
      await import('../services/ai/enhanced/EnhancedAIService')
      dependencies.enhancedService = true
    } catch (error) {
      console.log('Enhanced service import failed:', error.message)
    }

    try {
      await import('../services/ai/analyzers/SmartPromptAnalyzer')
      dependencies.promptAnalyzer = true
    } catch (error) {
      console.log('Prompt analyzer import failed:', error.message)
    }

    try {
      const AIService = (await import('../services/ai.service')).default
      const health = await AIService.healthCheck()
      dependencies.baseAI = health.status === 'available'
    } catch (error) {
      console.log('Base AI check failed:', error.message)
    }

    res.json({
      success: true,
      message: 'Verificação de dependências concluída',
      data: {
        dependencies,
        environment: process.env.NODE_ENV,
        timestamp: new Date()
      }
    })
  })
}

export default router
