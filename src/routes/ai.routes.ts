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

const improveEmailValidation = [
  body('project_id').isMongoId().withMessage('Project ID inválido'),
  body('instructions').trim().isLength({ min: 3, max: 1000 }).withMessage('Instruções devem ter entre 3 e 1000 caracteres'),
  body('preserve_structure').optional().isBoolean().withMessage('preserve_structure deve ser boolean')
]

const validateHTMLValidation = [
  body('html').trim().isLength({ min: 10 }).withMessage('HTML é obrigatório')
]

const optimizeCSSValidation = [
  body('html').trim().isLength({ min: 10 }).withMessage('HTML é obrigatório'),
  body('target_clients').optional().isArray().withMessage('target_clients deve ser array'),
  body('enable_dark_mode').optional().isBoolean().withMessage('enable_dark_mode deve ser boolean'),
  body('mobile_first').optional().isBoolean().withMessage('mobile_first deve ser boolean')
]

// Rotas principais
router.post('/generate', generateEmailValidation, AIController.generateEmail)
router.post('/improve', improveEmailValidation, AIController.improveEmail)
router.post('/validate', validateHTMLValidation, AIController.validateEmailHTML)
router.post('/optimize-css', optimizeCSSValidation, AIController.optimizeCSS)

// Rotas de status e monitoramento
router.get('/health', AIController.getHealthStatus)
router.get('/metrics', AIController.getMetrics)
router.get('/test-connection', AIController.testConnection)

export default router