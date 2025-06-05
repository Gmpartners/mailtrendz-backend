import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateChatDto, SendMessageDto, UpdateChatDto, ChatFilters } from '../types/chat.types'
import ChatService from '../services/chat.service'
import { HTTP_STATUS, PAGINATION } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler, createNotFoundError } from '../middleware/error.middleware'

class ChatController {
  // Criar novo chat
  createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const createChatDto: CreateChatDto = req.body

    const chatResponse = await ChatService.createChat(userId, createChatDto)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Chat criado com sucesso!',
      data: chatResponse
    })
  })

  // Buscar chat por projeto
  getChatByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { projectId } = req.params
    const userId = req.user!.id

    const chatResponse = await ChatService.getChatByProject(projectId, userId)

    res.json({
      success: true,
      data: chatResponse
    })
  })

  // Buscar chat por ID
  getChatById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const chatResponse = await ChatService.getChatById(id, userId)

    res.json({
      success: true,
      data: chatResponse
    })
  })

  // Enviar mensagem
  sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const messageDto: SendMessageDto = req.body

    const messageResponse = await ChatService.sendMessage(chatId, userId, messageDto)

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Mensagem enviada com sucesso!',
      data: messageResponse
    })
  })

  // Buscar histórico de mensagens
  getChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const { page = 1, limit = 50 } = req.query

    const historyResponse = await ChatService.getChatHistory(
      chatId,
      userId,
      parseInt(page as string),
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: historyResponse
    })
  })

  // Atualizar chat
  updateChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    const updates: UpdateChatDto = req.body

    const chat = await ChatService.updateChat(id, userId, updates)

    if (!chat) {
      throw createNotFoundError('Chat')
    }

    res.json({
      success: true,
      message: 'Chat atualizado com sucesso!',
      data: { chat }
    })
  })

  // Deletar chat
  deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const deleted = await ChatService.deleteChat(id, userId)

    if (!deleted) {
      throw createNotFoundError('Chat')
    }

    res.json({
      success: true,
      message: 'Chat deletado com sucesso!'
    })
  })

  // Buscar chats do usuário
  getUserChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const {
      projectId,
      isActive,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query

    const filters: ChatFilters = {
      userId,
      projectId: projectId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      pagination: {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), PAGINATION.MAX_LIMIT)
      },
      sort: {
        field: sortBy as string,
        order: sortOrder as 'asc' | 'desc'
      }
    }

    const chats = await ChatService.getUserChats(userId, filters)

    res.json({
      success: true,
      data: { chats }
    })
  })

  // Buscar chats ativos
  getActiveChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    const chats = await ChatService.getActiveChats(userId)

    res.json({
      success: true,
      data: { chats }
    })
  })

  // Buscar analytics do chat
  getChatAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const analytics = await ChatService.getChatAnalytics(id, userId)

    if (!analytics) {
      throw createNotFoundError('Chat')
    }

    res.json({
      success: true,
      data: { analytics }
    })
  })

  // Buscar mensagens recentes do chat
  getRecentMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const { limit = 10 } = req.query

    // Reutilizar getChatHistory com limit pequeno
    const historyResponse = await ChatService.getChatHistory(
      chatId,
      userId,
      1,
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: {
        messages: historyResponse.messages,
        stats: historyResponse.stats
      }
    })
  })

  // Marcar chat como ativo/inativo
  toggleChatStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    // Buscar chat atual para inverter status
    const currentChat = await ChatService.getChatById(id, userId)
    const newStatus = !currentChat.chat.isActive

    const chat = await ChatService.updateChat(id, userId, { 
      isActive: newStatus 
    })

    res.json({
      success: true,
      message: `Chat ${newStatus ? 'ativado' : 'desativado'} com sucesso!`,
      data: { chat }
    })
  })

  // Buscar estatísticas gerais de chat do usuário
  getUserChatStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    // Buscar todos os chats do usuário para calcular estatísticas
    const filters: ChatFilters = {
      userId,
      pagination: { page: 1, limit: 1000 }, // Limite alto para pegar todos
      sort: { field: 'createdAt', order: 'desc' }
    }

    const chats = await ChatService.getUserChats(userId, filters)

    // Calcular estatísticas
    const stats = {
      totalChats: chats.length,
      activeChats: chats.filter(chat => chat.isActive).length,
      totalMessages: chats.reduce((sum, chat) => sum + chat.metadata.totalMessages, 0),
      totalEmailUpdates: chats.reduce((sum, chat) => sum + chat.metadata.emailUpdates, 0),
      averageMessagesPerChat: chats.length > 0 
        ? Math.round(chats.reduce((sum, chat) => sum + chat.metadata.totalMessages, 0) / chats.length)
        : 0,
      recentActivity: chats.filter(chat => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return chat.metadata.lastActivity > dayAgo
      }).length
    }

    res.json({
      success: true,
      data: { stats }
    })
  })

  // Health check
  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'chat',
      version: process.env.npm_package_version || '1.0.0'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new ChatController()