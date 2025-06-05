import { Router } from 'express'
import ChatController from '../controllers/chat.controller'
import { authenticateToken, checkAPILimits } from '../middleware/auth.middleware'
import { generalLimiter, aiChatLimiter } from '../middleware/rate-limit.middleware'
import {
  validateSendMessage,
  validateUpdateChat,
  validatePagination,
  validateObjectId
} from '../middleware/validation.middleware'

const router = Router()

// Todas as rotas de chat requerem autenticação
router.use(authenticateToken)

// Rotas gerais
router.get('/health', ChatController.healthCheck)
router.get('/active', generalLimiter, ChatController.getActiveChats)
router.get('/stats', generalLimiter, ChatController.getUserChatStats)

// Buscar chats do usuário
router.get(
  '/',
  generalLimiter,
  validatePagination,
  ChatController.getUserChats
)

// Criar novo chat
router.post(
  '/',
  generalLimiter,
  ChatController.createChat
)

// Buscar chat por projeto
router.get(
  '/project/:projectId',
  generalLimiter,
  validateObjectId('projectId'),
  ChatController.getChatByProject
)

// Operações em chat específico
router.get(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  ChatController.getChatById
)

router.put(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  validateUpdateChat,
  ChatController.updateChat
)

router.delete(
  '/:id',
  generalLimiter,
  validateObjectId('id'),
  ChatController.deleteChat
)

// Operações de status
router.patch(
  '/:id/toggle-status',
  generalLimiter,
  validateObjectId('id'),
  ChatController.toggleChatStatus
)

// Mensagens
router.post(
  '/:chatId/messages',
  aiChatLimiter,
  checkAPILimits,
  validateObjectId('chatId'),
  validateSendMessage,
  ChatController.sendMessage
)

router.get(
  '/:chatId/messages',
  generalLimiter,
  validateObjectId('chatId'),
  validatePagination,
  ChatController.getChatHistory
)

router.get(
  '/:chatId/messages/recent',
  generalLimiter,
  validateObjectId('chatId'),
  ChatController.getRecentMessages
)

// Analytics
router.get(
  '/:id/analytics',
  generalLimiter,
  validateObjectId('id'),
  ChatController.getChatAnalytics
)

export default router