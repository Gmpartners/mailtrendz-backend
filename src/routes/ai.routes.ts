import { Router } from 'express'
import { body, param } from 'express-validator'
import aiController from '../controllers/ai.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware'

const router = Router()

/**
 * ✅ ROTAS AI ATUALIZADAS - PYTHON AI SERVICE
 * Todas as rotas agora usam o microserviço Python
 */

// ================================
// MIDDLEWARE APLICADO A TODAS AS ROTAS
// ================================
router.use(authMiddleware)
router.use(rateLimitMiddleware('AI'))

// ================================
// GERAÇÃO DE EMAIL
// ================================

/**
 * @route POST /api/v1/ai/generate
 * @desc Gerar email usando Python AI Service
 * @access Private
 */
router.post('/generate',
  [
    body('prompt')
      .isString()
      .isLength({ min: 5, max: 2000 })
      .withMessage('Prompt deve ter entre 5 e 2000 caracteres')
      .trim(),
    body('context')
      .optional()
      .isObject()
      .withMessage('Contexto deve ser um objeto válido'),
    body('context.industry')
      .optional()
      .isIn(['saude', 'tecnologia', 'educacao', 'ecommerce', 'financas', 'geral'])
      .withMessage('Indústria inválida'),
    body('context.tone')
      .optional()
      .isIn(['professional', 'friendly', 'urgent', 'casual', 'formal'])
      .withMessage('Tom inválido'),
    body('context.type')
      .optional()
      .isIn(['welcome', 'newsletter', 'campaign', 'promotional', 'announcement'])
      .withMessage('Tipo de email inválido')
  ],
  aiController.generateEmail
)

// ================================
// MELHORIA DE EMAIL
// ================================

/**
 * @route POST /api/v1/ai/improve
 * @desc Melhorar email existente usando Python AI Service
 * @access Private
 */
router.post('/improve',
  [
    body('currentContent')
      .isObject()
      .withMessage('Conteúdo atual é obrigatório'),
    body('currentContent.html')
      .isString()
      .isLength({ min: 10 })
      .withMessage('HTML do email é obrigatório'),
    body('feedback')
      .isString()
      .isLength({ min: 3, max: 1000 })
      .withMessage('Feedback deve ter entre 3 e 1000 caracteres')
      .trim(),
    body('context')
      .optional()
      .isObject()
      .withMessage('Contexto deve ser um objeto válido')
  ],
  aiController.improveEmail
)

// ================================
// CHAT COM IA
// ================================

/**
 * @route POST /api/v1/ai/chat
 * @desc Conversar com IA usando Python AI Service
 * @access Private
 */
router.post('/chat',
  [
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
      .optional()
      .isObject()
      .withMessage('Contexto do projeto deve ser um objeto')
  ],
  aiController.chatWithAI
)

// ================================
// STATUS E MONITORAMENTO
// ================================

/**
 * @route GET /api/v1/ai/status
 * @desc Verificar status do Python AI Service
 * @access Private
 */
router.get('/status', aiController.getAIServiceStatus)

/**
 * @route GET /api/v1/ai/metrics
 * @desc Obter métricas do Python AI Service
 * @access Private
 */
router.get('/metrics', aiController.getAIMetrics)

/**
 * @route GET /api/v1/ai/test
 * @desc Testar conectividade com Python AI Service
 * @access Private
 */
router.get('/test', aiController.testConnection)

// ================================
// VALIDAÇÃO E OTIMIZAÇÃO
// ================================

/**
 * @route POST /api/v1/ai/validate
 * @desc Validar HTML de email usando Python AI Service
 * @access Private
 */
router.post('/validate',
  [
    body('html')
      .isString()
      .isLength({ min: 10 })
      .withMessage('HTML é obrigatório e deve ter pelo menos 10 caracteres')
  ],
  aiController.validateEmailHTML
)

/**
 * @route POST /api/v1/ai/optimize-css
 * @desc Otimizar CSS para email clients usando Python AI Service
 * @access Private
 */
router.post('/optimize-css',
  [
    body('html')
      .isString()
      .isLength({ min: 10 })
      .withMessage('HTML é obrigatório'),
    body('targetClients')
      .optional()
      .isArray()
      .withMessage('Target clients deve ser um array'),
    body('enableDarkMode')
      .optional()
      .isBoolean()
      .withMessage('enableDarkMode deve ser boolean')
  ],
  aiController.optimizeCSS
)

// ================================
// ROTAS ESPECÍFICAS PARA DESENVOLVIMENTO
// ================================

if (process.env.NODE_ENV === 'development') {
  /**
   * @route POST /api/v1/ai/dev/test-generation
   * @desc Teste rápido de geração (apenas desenvolvimento)
   * @access Private
   */
  router.post('/dev/test-generation',
    [
      body('prompt')
        .optional()
        .isString()
        .withMessage('Prompt deve ser string')
    ],
    async (req, res) => {
      try {
        const { prompt = 'Crie um email de newsletter sobre tecnologia' } = req.body
        
        // Usar o controller padrão com dados de teste
        req.body = {
          prompt,
          context: {
            industry: 'tecnologia',
            tone: 'professional',
            type: 'newsletter'
          }
        }
        
        await aiController.generateEmail(req, res)
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Erro no teste de geração',
          error: error.message
        })
      }
    }
  )

  /**
   * @route GET /api/v1/ai/dev/health-detailed
   * @desc Health check detalhado (apenas desenvolvimento)
   * @access Private
   */
  router.get('/dev/health-detailed',
    async (req, res) => {
      try {
        // Combinar informações de status e métricas
        const [statusResponse, metricsResponse] = await Promise.allSettled([
          aiController.getAIServiceStatus(req, {} as any),
          aiController.getAIMetrics(req, {} as any)
        ])

        res.json({
          success: true,
          timestamp: new Date(),
          detailed_check: {
            status: statusResponse.status === 'fulfilled' ? 'ok' : 'error',
            metrics: metricsResponse.status === 'fulfilled' ? 'ok' : 'error'
          },
          environment: process.env.NODE_ENV,
          python_ai_url: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:5000'
        })
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message
        })
      }
    }
  )
}

export default router
