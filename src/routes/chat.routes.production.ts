import { Router } from 'express'
import { body, param } from 'express-validator'
import ChatController from '../controllers/chat.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// Middleware global
router.use(authenticateToken)

// Validações
const projectIdValidation = [
  param('projectId').isMongoId().withMessage('Project ID inválido')
]

const conversationIdValidation = [
  param('id').isMongoId().withMessage('Conversation ID inválido')
]

const sendMessageValidation = [
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Conteúdo deve ter entre 1 e 10.000 caracteres')
]

// Rotas principais (sem as problemáticas)
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

export default router