import { Router } from 'express'
import { body, param } from 'express-validator'
import ChatController from '../controllers/chat.controller'
import { 
  authenticateToken, 
  logAPIUsage 
} from '../middleware/auth.middleware'
import { checkAICredits, consumeAICredit } from '../middleware/credits.middleware'
import { requireAIImageAnalysis } from '../middleware/subscription.middleware'  // ✅ NOVO IMPORT
import { ensureUniqueChat, validateChatAccess } from '../middleware/chat.middleware'

const router = Router()

// Middleware global
router.use(authenticateToken)

// Validações
const projectIdValidation = [
  param('projectId').isUUID().withMessage('Project ID inválido')
]

const conversationIdValidation = [
  param('id').isUUID().withMessage('Conversation ID inválido')
]

const sendMessageValidation = [
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Conteúdo deve ter entre 1 e 10.000 caracteres')
]

const createChatValidation = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Título deve ter entre 1 e 200 caracteres'),
  body('projectId').optional().isUUID().withMessage('Project ID deve ser um UUID válido')
]

// ✅ ROTA ATUALIZADA COM VALIDAÇÃO DE AI IMAGE ANALYSIS
const processChatMessageValidation = [
  body('message').trim().isLength({ min: 1, max: 5000 }).withMessage('Mensagem deve ter entre 1 e 5.000 caracteres'),
  body('chat_id').trim().isLength({ min: 1 }).withMessage('Chat ID é obrigatório'),
  body('project_id').optional().isString().withMessage('Project ID deve ser uma string')
]

router.post(
  '/process-ai-message',
  validateChatAccess,
  requireAIImageAnalysis,  // ✅ NOVO: Verificar se pode usar IA com imagens
  checkAICredits,          // ✅ VERIFICAR CRÉDITOS ANTES
  consumeAICredit('chat_ai_processing'),  // ✅ CONSUMIR CRÉDITO APÓS SUCESSO
  logAPIUsage('chat_process_ai_message', 1),
  processChatMessageValidation,
  ChatController.processMessageWithAI
)

// ✅ ROTA QUE ESTAVA FALTANDO - CRIAR CHAT
router.post(
  '/',
  ensureUniqueChat, // ✅ NOVO MIDDLEWARE
  createChatValidation,
  ChatController.createChat
)

// Rotas principais
router.post(
  '/project/:projectId/messages',
  projectIdValidation,
  sendMessageValidation,
  ChatController.sendMessage
)

router.get(
  '/project/:projectId',
  projectIdValidation,
  ChatController.getConversationByProject
)

router.get(
  '/conversation/:id',
  conversationIdValidation,
  ChatController.getConversationById
)

router.get(
  '/user/conversations',
  ChatController.getUserConversations
)

router.put(
  '/conversation/:id',
  conversationIdValidation,
  ChatController.updateConversation
)

router.delete(
  '/conversation/:id',
  conversationIdValidation,
  ChatController.deleteConversation
)

// ✅ ROTAS ADICIONAIS ÚTEIS
router.get(
  '/',
  ChatController.getUserChats
)

router.get(
  '/:id',
  conversationIdValidation,
  ChatController.getChatById
)

router.put(
  '/:id',
  conversationIdValidation,
  ChatController.updateChatTitle
)

router.delete(
  '/:id',
  conversationIdValidation,
  ChatController.deleteChat
)

// ✅ NOVA ROTA - Health Check
router.get(
  '/health',
  ChatController.getChatHealth
)

// ✅ NOVA ROTA - Buscar último HTML do chat
router.get(
  '/:chatId/latest-html',
  param('chatId').isUUID().withMessage('Chat ID inválido'),
  ChatController.getLatestHTML
)

export default router