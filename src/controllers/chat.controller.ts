import { Response } from 'express'
import { AuthRequest } from '../types/auth.types'
import { CreateChatDto, SendMessageDto, UpdateChatDto, ChatFilters } from '../types/chat.types'
import ChatService from '../services/chat.service'
import { HTTP_STATUS, PAGINATION } from '../utils/constants'
import { logger } from '../utils/logger'
import { asyncHandler, createNotFoundError } from '../middleware/error.middleware'

class ChatController {
  createChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const createChatDto: CreateChatDto = req.body

    try {
      const chatResponse = await ChatService.createChat(userId, createChatDto)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Chat criado com sucesso!',
        data: chatResponse
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao criar chat:', error.message)
      throw error
    }
  })

  getChatByProject = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { projectId } = req.params
    const userId = req.user!.id

    try {
      if (!projectId?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'ID do projeto é obrigatório',
          error: 'INVALID_PROJECT_ID'
        })
      }

      const chatResponse = await ChatService.getChatByProject(projectId.trim(), userId.trim())

      if (!chatResponse?.chat) {
        return res.status(500).json({
          success: false,
          message: 'Chat não encontrado na resposta do serviço',
          error: 'MISSING_CHAT_IN_RESPONSE'
        })
      }

      const response = {
        success: true,
        data: {
          chat: {
            ...chatResponse.chat,
            id: chatResponse.chat.id || chatResponse.chat._id?.toString() || '',
            title: chatResponse.chat.title || 'Chat sem título',
            isActive: chatResponse.chat.isActive !== undefined ? chatResponse.chat.isActive : true,
            userId: chatResponse.chat.userId || userId,
            projectId: chatResponse.chat.projectId || projectId
          },
          messages: Array.isArray(chatResponse.messages) ? chatResponse.messages : [],
          project: chatResponse.project || {
            id: projectId,
            name: 'Projeto',
            type: 'email'
          },
          stats: chatResponse.stats || {
            totalMessages: 0,
            userMessages: 0,
            aiMessages: 0,
            emailUpdates: 0,
            lastActivity: new Date()
          }
        }
      }

      res.json(response)

    } catch (error: any) {
      let statusCode = 500
      let errorCode = 'INTERNAL_ERROR'
      let userMessage = 'Erro interno do servidor'

      if (error.message?.includes('Projeto não encontrado')) {
        statusCode = 404
        errorCode = 'PROJECT_NOT_FOUND'
        userMessage = 'Projeto não encontrado'
      } else if (error.message?.includes('não é um ObjectId válido')) {
        statusCode = 400
        errorCode = 'INVALID_ID_FORMAT'
        userMessage = 'Formato de ID inválido'
      }

      res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: errorCode
      })
    }
  })

  getChatById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    try {
      const chatResponse = await ChatService.getChatById(id, userId)

      res.json({
        success: true,
        data: chatResponse
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao buscar chat:', error.message)
      throw error
    }
  })

  sendMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const messageDto: SendMessageDto = req.body

    try {
      if (!chatId?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'ID do chat é obrigatório',
          error: 'MISSING_CHAT_ID'
        })
      }

      if (!messageDto?.content?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Conteúdo da mensagem é obrigatório',
          error: 'MISSING_MESSAGE_CONTENT'
        })
      }

      if (messageDto.content.length > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Mensagem muito longa (máximo 5000 caracteres)',
          error: 'MESSAGE_TOO_LONG'
        })
      }

      const messageResponse = await ChatService.sendMessage(chatId, userId, messageDto)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Mensagem enviada com sucesso!',
        data: messageResponse
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao enviar mensagem:', error.message)
      throw error
    }
  })

  getChatHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const { page = 1, limit = 50 } = req.query

    try {
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
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao carregar histórico:', error.message)
      throw error
    }
  })

  updateChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    const updates: UpdateChatDto = req.body

    try {
      const chat = await ChatService.updateChat(id, userId, updates)

      if (!chat) {
        throw createNotFoundError('Chat')
      }

      res.json({
        success: true,
        message: 'Chat atualizado com sucesso!',
        data: { chat }
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao atualizar chat:', error.message)
      throw error
    }
  })

  deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    try {
      const deleted = await ChatService.deleteChat(id, userId)

      if (!deleted) {
        throw createNotFoundError('Chat')
      }

      res.json({
        success: true,
        message: 'Chat deletado com sucesso!'
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao deletar chat:', error.message)
      throw error
    }
  })

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

    try {
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
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao carregar chats:', error.message)
      throw error
    }
  })

  getActiveChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const chats = await ChatService.getActiveChats(userId)

      res.json({
        success: true,
        data: { chats }
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao carregar chats ativos:', error.message)
      throw error
    }
  })

  getChatAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    try {
      const analytics = await ChatService.getChatAnalytics(id, userId)

      if (!analytics) {
        throw createNotFoundError('Chat')
      }

      res.json({
        success: true,
        data: { analytics }
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao carregar analytics:', error.message)
      throw error
    }
  })

  getRecentMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { chatId } = req.params
    const userId = req.user!.id
    const { limit = 10 } = req.query

    try {
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
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao carregar mensagens recentes:', error.message)
      throw error
    }
  })

  toggleChatStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    try {
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
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao alterar status:', error.message)
      throw error
    }
  })

  getUserChatStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id

    try {
      const filters: ChatFilters = {
        userId,
        pagination: { page: 1, limit: 1000 },
        sort: { field: 'createdAt', order: 'desc' }
      }

      const chats = await ChatService.getUserChats(userId, filters)

      const stats = {
        totalChats: chats.length,
        activeChats: chats.filter(chat => chat.isActive).length,
        totalMessages: chats.reduce((sum, chat) => sum + (chat.metadata?.totalMessages || 0), 0),
        totalEmailUpdates: chats.reduce((sum, chat) => sum + (chat.metadata?.emailUpdates || 0), 0),
        averageMessagesPerChat: chats.length > 0 
          ? Math.round(chats.reduce((sum, chat) => sum + (chat.metadata?.totalMessages || 0), 0) / chats.length)
          : 0,
        recentActivity: chats.filter(chat => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const lastActivity = new Date(chat.metadata?.lastActivity || 0)
          return lastActivity > dayAgo
        }).length
      }

      res.json({
        success: true,
        data: { stats }
      })
    } catch (error: any) {
      console.error('❌ [CHAT CONTROLLER] Erro ao calcular estatísticas:', error.message)
      throw error
    }
  })

  healthCheck = asyncHandler(async (req: AuthRequest, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      service: 'chat',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    res.json({
      success: true,
      data: health
    })
  })
}

export default new ChatController()
