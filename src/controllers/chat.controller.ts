import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import ChatService from '../services/chat.service'
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

/**
 * ✅ CHAT CONTROLLER ATUALIZADO - USA PYTHON AI SERVICE
 * Gerencia chats com integração completa ao microserviço Python
 */
class ChatController {

  // ✅ ENVIAR MENSAGEM - ENDPOINT PRINCIPAL
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array()
        })
        return
      }

      const { chatId } = req.params
      const { content } = req.body
      const userId = (req as any).user?.userId

      if (!chatId || !content?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Chat ID e conteúdo são obrigatórios'
        })
        return
      }

      logger.info(`💬 [CHAT CONTROLLER] Enviando mensagem - Chat: ${chatId}, User: ${userId}`)

      const startTime = Date.now()
      const result = await ChatService.sendMessage(chatId, userId, { content: content.trim() })
      const processingTime = Date.now() - startTime

      logger.info(`✅ [CHAT CONTROLLER] Mensagem processada com sucesso - ${processingTime}ms`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Mensagem enviada e processada com sucesso',
        data: {
          userMessage: result.userMessage,
          aiMessage: result.aiMessage,
          projectUpdated: result.projectUpdated
        },
        metadata: {
          processingTime,
          chatId,
          userId,
          timestamp: new Date(),
          pythonAIUsed: true,
          contentLength: content.length
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao enviar mensagem:', error.message)
      
      // Verificar tipo de erro
      let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
      let errorCode = ERROR_CODES.INTERNAL_ERROR

      if (error.message.includes('inválido')) {
        statusCode = HTTP_STATUS.BAD_REQUEST
        errorCode = ERROR_CODES.INVALID_INPUT
      } else if (error.message.includes('não encontrado')) {
        statusCode = HTTP_STATUS.NOT_FOUND
        errorCode = ERROR_CODES.RESOURCE_NOT_FOUND
      }

      res.status(statusCode).json({
        success: false,
        message: 'Erro ao processar mensagem',
        error: error.message,
        errorCode,
        fallbackAvailable: true
      })
    }
  }

  // ✅ CRIAR CHAT
  async createChat(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: errors.array()
        })
        return
      }

      const { title, projectId } = req.body
      const userId = (req as any).user?.userId

      if (!title?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Título do chat é obrigatório'
        })
        return
      }

      logger.info(`📝 [CHAT CONTROLLER] Criando chat - User: ${userId}, Project: ${projectId}`)

      const result = await ChatService.createChat(userId, {
        title: title.trim(),
        projectId
      })

      logger.info(`✅ [CHAT CONTROLLER] Chat criado com sucesso - ID: ${result.chat.id}`)

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Chat criado com sucesso',
        data: result,
        metadata: {
          userId,
          timestamp: new Date(),
          pythonAIEnabled: true
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao criar chat:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao criar chat',
        error: error.message
      })
    }
  }

  // ✅ OBTER CHAT POR PROJETO
  async getChatByProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params
      const userId = (req as any).user?.userId

      if (!projectId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID do projeto é obrigatório'
        })
        return
      }

      logger.info(`🔍 [CHAT CONTROLLER] Buscando chat por projeto - Project: ${projectId}, User: ${userId}`)

      const result = await ChatService.getChatByProject(projectId, userId)

      logger.info(`✅ [CHAT CONTROLLER] Chat encontrado - ID: ${result.chat.id}`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat encontrado',
        data: result,
        metadata: {
          projectId,
          userId,
          timestamp: new Date(),
          messageCount: result.stats?.totalMessages || 0
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao buscar chat por projeto:', error.message)
      
      let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
      if (error.message.includes('não encontrado')) {
        statusCode = HTTP_STATUS.NOT_FOUND
      }

      res.status(statusCode).json({
        success: false,
        message: 'Erro ao buscar chat',
        error: error.message
      })
    }
  }

  // ✅ OBTER CHAT POR ID
  async getChatById(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const userId = (req as any).user?.userId

      if (!chatId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'ID do chat é obrigatório'
        })
        return
      }

      logger.info(`🔍 [CHAT CONTROLLER] Buscando chat por ID - Chat: ${chatId}, User: ${userId}`)

      const result = await ChatService.getChatById(chatId, userId)

      logger.info(`✅ [CHAT CONTROLLER] Chat encontrado - ${result.stats?.totalMessages || 0} mensagens`)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat encontrado',
        data: result,
        metadata: {
          chatId,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao buscar chat por ID:', error.message)
      
      let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
      if (error.message.includes('não encontrado')) {
        statusCode = HTTP_STATUS.NOT_FOUND
      }

      res.status(statusCode).json({
        success: false,
        message: 'Erro ao buscar chat',
        error: error.message
      })
    }
  }

  // ✅ OBTER HISTÓRICO DO CHAT
  async getChatHistory(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const { page = 1, limit = 50 } = req.query
      const userId = (req as any).user?.userId

      logger.info(`📚 [CHAT CONTROLLER] Buscando histórico - Chat: ${chatId}, Page: ${page}`)

      const result = await ChatService.getChatHistory(
        chatId, 
        userId, 
        parseInt(page as string), 
        parseInt(limit as string)
      )

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Histórico obtido com sucesso',
        data: result,
        metadata: {
          chatId,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao buscar histórico:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar histórico',
        error: error.message
      })
    }
  }

  // ✅ OBTER CHATS DO USUÁRIO
  async getUserChats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId
      const { 
        projectId, 
        isActive, 
        search, 
        dateFrom, 
        dateTo,
        page = 1,
        limit = 20,
        sortField = 'updatedAt',
        sortOrder = 'desc'
      } = req.query

      logger.info(`📋 [CHAT CONTROLLER] Buscando chats do usuário - User: ${userId}`)

      const filters: any = {
        projectId: projectId as string,
        isActive: isActive ? isActive === 'true' : undefined,
        search: search as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        },
        sort: {
          field: sortField as string,
          order: sortOrder as 'asc' | 'desc'
        }
      }

      const chats = await ChatService.getUserChats(userId, filters)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chats obtidos com sucesso',
        data: chats,
        metadata: {
          userId,
          totalFound: chats.length,
          filters,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao buscar chats do usuário:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar chats',
        error: error.message
      })
    }
  }

  // ✅ OBTER CHATS ATIVOS
  async getActiveChats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId

      logger.info(`⚡ [CHAT CONTROLLER] Buscando chats ativos - User: ${userId}`)

      const chats = await ChatService.getActiveChats(userId)

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chats ativos obtidos com sucesso',
        data: chats,
        metadata: {
          userId,
          activeCount: chats.length,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao buscar chats ativos:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao buscar chats ativos',
        error: error.message
      })
    }
  }

  // ✅ ATUALIZAR CHAT
  async updateChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const updates = req.body
      const userId = (req as any).user?.userId

      logger.info(`📝 [CHAT CONTROLLER] Atualizando chat - Chat: ${chatId}`)

      const result = await ChatService.updateChat(chatId, userId, updates)

      if (!result) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Chat não encontrado'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat atualizado com sucesso',
        data: result,
        metadata: {
          chatId,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao atualizar chat:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao atualizar chat',
        error: error.message
      })
    }
  }

  // ✅ DELETAR CHAT
  async deleteChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const userId = (req as any).user?.userId

      logger.info(`🗑️ [CHAT CONTROLLER] Deletando chat - Chat: ${chatId}`)

      const success = await ChatService.deleteChat(chatId, userId)

      if (!success) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Chat não encontrado'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Chat deletado com sucesso',
        metadata: {
          chatId,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao deletar chat:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao deletar chat',
        error: error.message
      })
    }
  }

  // ✅ ANALYTICS DO CHAT
  async getChatAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { chatId } = req.params
      const userId = (req as any).user?.userId

      logger.info(`📊 [CHAT CONTROLLER] Obtendo analytics - Chat: ${chatId}`)

      const analytics = await ChatService.getChatAnalytics(chatId, userId)

      if (!analytics) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Chat não encontrado'
        })
        return
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Analytics obtidos com sucesso',
        data: analytics,
        metadata: {
          chatId,
          userId,
          timestamp: new Date()
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao obter analytics:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao obter analytics',
        error: error.message
      })
    }
  }

  // ✅ STATUS DO PYTHON AI SERVICE
  async getPythonAIStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🐍 [CHAT CONTROLLER] Verificando status do Python AI Service')

      const status = await ChatService.getPythonAIStatus()

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Status do Python AI Service',
        data: status,
        metadata: {
          timestamp: new Date(),
          requestedBy: (req as any).user?.userId
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro ao verificar status Python AI:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro ao verificar status do Python AI Service',
        error: error.message
      })
    }
  }

  // ✅ TESTE DE MENSAGEM (DESENVOLVIMENTO)
  async testMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message = 'Teste de conectividade' } = req.body
      const userId = (req as any).user?.userId || 'test-user'

      logger.info('🧪 [CHAT CONTROLLER] Teste de mensagem Python AI')

      // Simular contexto de teste
      const testContext = {
        userId,
        projectName: 'Teste',
        type: 'newsletter',
        industry: 'tecnologia',
        hasProjectContent: false,
        currentEmailContent: null
      }

      const startTime = Date.now()
      const response = await ChatService.sendMessage('test-chat', userId, {
        content: message
      })
      const processingTime = Date.now() - startTime

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Teste concluído com sucesso',
        data: {
          testMessage: message,
          aiResponse: response.aiMessage?.content,
          processingTime,
          pythonAIWorking: true
        },
        metadata: {
          timestamp: new Date(),
          testMode: true
        }
      })

    } catch (error: any) {
      logger.error('❌ [CHAT CONTROLLER] Erro no teste:', error.message)
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Teste falhou',
        error: error.message,
        pythonAIWorking: false
      })
    }
  }
}

export default new ChatController()
