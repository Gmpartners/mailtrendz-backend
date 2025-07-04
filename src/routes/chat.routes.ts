import { Router } from 'express'
import { body, param } from 'express-validator'
import ChatController from '../controllers/chat.controller'
import { authenticateToken } from '../middleware/auth.middleware'

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

// ✅ ROTA QUE ESTAVA FALTANDO - CRIAR CHAT
router.post(
  '/',
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

export default router